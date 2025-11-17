import { PATCH, DELETE } from "@/app/api/auth/users/[id]/route";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getAccountById,
  findAccountByEmail,
  updateAccount,
  deleteAccount,
} from "@/lib/auth/account-service";
import { canCreateRole, canDeleteRole, canUpdateRole } from "@/lib/auth/permissions";

type MockJsonResponse = {
  status: number;
  body: unknown;
  json: () => Promise<unknown>;
};

jest.mock("next/server", () => {
  class MockNextResponse {
    status: number;
    body: unknown;

    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }

    static json(body: unknown, init?: { status?: number }): MockJsonResponse {
      return {
        status: init?.status ?? 200,
        body,
        async json() {
          return body;
        },
      };
    }
  }

  return {
    NextResponse: MockNextResponse,
  };
});

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
  getAccountById: jest.fn(),
  findAccountByEmail: jest.fn(),
  updateAccount: jest.fn(),
  deleteAccount: jest.fn(),
}));

jest.mock("@/lib/auth/permissions", () => ({
  canCreateRole: jest.fn(),
  canDeleteRole: jest.fn(),
  canUpdateRole: jest.fn(),
}));

const context = (id: string) => ({ params: Promise.resolve({ id }) });

const patchRequest = (body: Record<string, unknown>) =>
  ({
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
  }) as unknown as Parameters<typeof PATCH>[0];

const deleteRequest = () => ({ headers: new Headers() }) as unknown as Parameters<typeof DELETE>[0];

const currentAdmin = { id: "admin-1", role: "admin", email: "admin@example.com", personRecordId: null };
const targetAccount = { id: "user-1", email: "user@example.com", role: "user", personRecordId: null };

describe("PATCH /api/auth/users/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue(currentAdmin);
    (getAccountById as jest.Mock).mockResolvedValue(targetAccount);
    (findAccountByEmail as jest.Mock).mockResolvedValue(null);
    (updateAccount as jest.Mock).mockResolvedValue({ ...targetAccount, email: "updated@example.com" });
    (canUpdateRole as jest.Mock).mockReturnValue(true);
    (canCreateRole as jest.Mock).mockReturnValue(true);
  });

  it("requires authentication", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);
    const response = await PATCH(patchRequest({}), context("user-1"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Unauthorized" });
  });

  it("returns 404 when account missing", async () => {
    (getAccountById as jest.Mock).mockResolvedValueOnce(null);
    const response = await PATCH(patchRequest({}), context("missing"));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Account not found" });
  });

  it("updates account when validation passes", async () => {
    const response = await PATCH(
      patchRequest({ email: "updated@example.com", password: "pw123456" }),
      context("user-1")
    );
    expect(updateAccount).toHaveBeenCalledWith({
      id: "user-1",
      email: "updated@example.com",
      password: "pw123456",
      role: undefined,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { ...targetAccount, email: "updated@example.com" } });
  });

  it("returns 500 when update fails", async () => {
    (updateAccount as jest.Mock).mockRejectedValueOnce(new Error("db down"));
    const response = await PATCH(patchRequest({ email: "updated@example.com" }), context("user-1"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Unable to update account" });
  });
});

describe("DELETE /api/auth/users/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue(currentAdmin);
    (getAccountById as jest.Mock).mockResolvedValue(targetAccount);
    (canDeleteRole as jest.Mock).mockReturnValue(true);
  });

  it("blocks deleting yourself", async () => {
    (getAccountById as jest.Mock).mockResolvedValueOnce(currentAdmin);
    const response = await DELETE(deleteRequest(), context("admin-1"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "You cannot delete your own account" });
  });

  it("requires permission", async () => {
    (canDeleteRole as jest.Mock).mockReturnValueOnce(false);
    const response = await DELETE(deleteRequest(), context("user-1"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Forbidden" });
  });

  it("deletes account when authorized", async () => {
    const response = await DELETE(deleteRequest(), context("user-1"));
    expect(deleteAccount).toHaveBeenCalledWith("user-1");
    expect(response.status).toBe(204);
  });

  it("handles delete errors", async () => {
    (deleteAccount as jest.Mock).mockRejectedValueOnce(new Error("db down"));
    const response = await DELETE(deleteRequest(), context("user-1"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Unable to delete account" });
  });
});
