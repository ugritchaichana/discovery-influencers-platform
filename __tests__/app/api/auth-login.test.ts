import { POST } from "@/app/api/auth/login/route";
import {
  ensureSuperAdminAccount,
  findAccountWithSecretByEmail,
  verifyPassword,
} from "@/lib/auth/account-service";
import { createAuthToken, setAuthCookie } from "@/lib/auth/session";

type RequestBody = Record<string, unknown>;

function jsonResponse(body: unknown, init?: { status?: number }) {
  return {
    status: init?.status ?? 200,
    body,
    cookies: { set: jest.fn() },
    async json() {
      return body;
    },
  };
}

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn(jsonResponse),
  },
}));

jest.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock("@/lib/auth/account-service", () => ({
  ensureSuperAdminAccount: jest.fn(),
  findAccountWithSecretByEmail: jest.fn(),
  verifyPassword: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  createAuthToken: jest.fn(),
  setAuthCookie: jest.fn(),
}));

const makeRequest = (body: RequestBody) =>
  ({
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
  }) as unknown as Parameters<typeof POST>[0];

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureSuperAdminAccount as jest.Mock).mockResolvedValue(undefined);
    (createAuthToken as jest.Mock).mockReturnValue("token");
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    (findAccountWithSecretByEmail as jest.Mock).mockResolvedValue({
      recordId: "IND-001",
      email: "demo@example.com",
      passwordHash: "hashed",
      role: "admin",
    });
  });

  it("validates presence of credentials", async () => {
    const response = await POST(makeRequest({ email: "", password: "" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "email and password are required" });
  });

  it("rejects invalid credentials", async () => {
    (findAccountWithSecretByEmail as jest.Mock).mockResolvedValueOnce(null);
    const response = await POST(makeRequest({ email: "user@example.com", password: "pw" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Invalid credentials" });
  });

  it("returns account data on success", async () => {
    const response = await POST(makeRequest({ email: "user@example.com", password: "pw" }));
    expect(verifyPassword).toHaveBeenCalledWith("pw", "hashed");
    expect(createAuthToken).toHaveBeenCalledWith({
      sub: "IND-001",
      email: "demo@example.com",
      role: "admin",
    });
    expect(setAuthCookie).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        id: "IND-001",
        email: "demo@example.com",
        role: "admin",
        person_record_id: "IND-001",
      },
    });
  });

  it("handles unexpected errors", async () => {
    (findAccountWithSecretByEmail as jest.Mock).mockRejectedValueOnce(new Error("boom"));
    const response = await POST(makeRequest({ email: "user@example.com", password: "pw" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Unable to login" });
  });
});
