import { POST } from "@/app/api/auth/register/route";
import { createRecord } from "@/lib/data-store";
import { createAccount } from "@/lib/auth/account-service";
import { createAuthToken, setAuthCookie } from "@/lib/auth/session";
import { toPersonResponse } from "@/app/api/utils/serialize-person-record";

type RequestBody = Record<string, unknown>;

type MockResponse = {
  status: number;
  body: unknown;
  cookies: { set: jest.Mock };
  json: () => Promise<unknown>;
};

function jsonResponse(body: unknown, init?: { status?: number }): MockResponse {
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

jest.mock("@/lib/data-store", () => ({
  createRecord: jest.fn(),
}));

jest.mock("@/lib/auth/account-service", () => ({
  createAccount: jest.fn(),
}));

jest.mock("@/lib/auth/session", () => ({
  createAuthToken: jest.fn(),
  setAuthCookie: jest.fn(),
}));

jest.mock("@/app/api/utils/serialize-person-record", () => ({
  toPersonResponse: jest.fn(),
}));

const basePayload: RequestBody = {
  record_type: "individual",
  full_name: "John Doe",
  preferred_name: "John",
  gender: "Male",
  birth_date: "1990-01-01",
  email: "john@example.com",
  phone: "0999999999",
  country: "Thailand",
  city: "Bangkok",
  occupation: "Creator",
  languages: ["TH"],
  password: "password123",
  confirm_password: "password123",
};

const makeRequest = (overrides: RequestBody = {}) =>
  ({
    json: jest.fn().mockResolvedValue({ ...basePayload, ...overrides }),
    headers: new Headers(),
  }) as unknown as Parameters<typeof POST>[0];

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createRecord as jest.Mock).mockResolvedValue({ recordId: "IND-100", recordType: "individual", fullName: "John Doe", role: "user" });
    (createAccount as jest.Mock).mockResolvedValue({ id: "acct-1", email: "john@example.com", role: "user" });
    (createAuthToken as jest.Mock).mockReturnValue("token");
    (toPersonResponse as jest.Mock).mockReturnValue({ record_id: "IND-100" });
  });

  it("enforces required fields", async () => {
    const response = await POST(makeRequest({ city: "" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "city is required" });
  });

  it("creates profile and account", async () => {
    const response = await POST(makeRequest());
    expect(createRecord).toHaveBeenCalledWith("individual", expect.objectContaining({ fullName: "John Doe" }));
    expect(createAccount).toHaveBeenCalledWith({
      email: "john@example.com",
      password: "password123",
      role: "user",
      personRecordId: "IND-100",
    });
    expect(setAuthCookie).toHaveBeenCalled();
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      data: {
        account: {
          id: "acct-1",
          email: "john@example.com",
          role: "user",
        },
        profile: { record_id: "IND-100" },
      },
    });
  });

  it("returns 500 when creation fails", async () => {
    (createRecord as jest.Mock).mockRejectedValueOnce(new Error("db down"));
    const response = await POST(makeRequest());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Unable to register" });
  });
});
