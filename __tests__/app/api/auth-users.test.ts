import { GET, POST } from "@/app/api/auth/users/route";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createAccount, listAccounts } from "@/lib/auth/account-service";
import { canCreateRole } from "@/lib/auth/permissions";

type MockResponse = {
  status: number;
  body: unknown;
  json: () => Promise<unknown>;
};

function jsonResponse(body: unknown, init?: { status?: number }): MockResponse {
  return {
    status: init?.status ?? 200,
    body,
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

jest.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/auth/account-service", () => ({
  listAccounts: jest.fn(),
  createAccount: jest.fn(),
}));

jest.mock("@/lib/auth/permissions", () => ({
  canCreateRole: jest.fn(),
}));

const getRequest = () => ({ headers: new Headers() }) as unknown as Parameters<typeof GET>[0];
const postRequest = (body: Record<string, unknown>) =>
  ({
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
  }) as unknown as Parameters<typeof POST>[0];

describe("GET /api/auth/users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires authentication", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Unauthorized" });
  });

  it("prevents basic users", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: "user", role: "user" });
    const response = await GET(getRequest());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Forbidden" });
  });

  it("returns accounts and logs count", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: "admin", role: "admin" });
    (listAccounts as jest.Mock).mockResolvedValue([{ id: "a-1" }]);
    const response = await GET(getRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ id: "a-1" }] });
  });

  it("handles list errors", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: "admin", role: "admin" });
    (listAccounts as jest.Mock).mockRejectedValueOnce(new Error("db down"));
    const response = await GET(getRequest());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Unable to list accounts" });
  });
});

describe("POST /api/auth/users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: "admin", role: "admin" });
    (canCreateRole as jest.Mock).mockReturnValue(true);
    (createAccount as jest.Mock).mockResolvedValue({ id: "acct-1", email: "user@example.com", role: "user" });
  });

  it("requires authentication", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);
    const response = await POST(postRequest({ email: "test@example.com", password: "pw" }));
    expect(response.status).toBe(401);
  });

  it("validates input", async () => {
    const response = await POST(postRequest({ email: "", password: "" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "email and password are required" });
  });

  it("checks role permissions", async () => {
    (canCreateRole as jest.Mock).mockReturnValueOnce(false);
    const response = await POST(postRequest({ email: "user@example.com", password: "pw", role: "admin" }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Forbidden" });
  });

  it("creates accounts when authorized", async () => {
    const response = await POST(postRequest({ email: "user@example.com", password: "pw" }));
    expect(createAccount).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "pw",
      role: "user",
      personRecordId: null,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { id: "acct-1", email: "user@example.com", role: "user" } });
  });

  it("handles account creation errors", async () => {
    (createAccount as jest.Mock).mockRejectedValueOnce(new Error("db down"));
    const response = await POST(postRequest({ email: "user@example.com", password: "pw" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Unable to create account" });
  });
});
