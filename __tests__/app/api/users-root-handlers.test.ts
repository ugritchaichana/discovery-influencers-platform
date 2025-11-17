import { getUsers } from "@/app/api/users/handlers/get";
import { createUser } from "@/app/api/users/handlers/post";
import { listRecords, createRecord } from "@/lib/data-store";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canCreateRole } from "@/lib/auth/permissions";

type MockJsonResponse = {
  status: number;
  body: unknown;
  json: () => Promise<unknown>;
};

function jsonResponse(body: unknown, init?: { status?: number }): MockJsonResponse {
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

jest.mock("@/lib/data-store", () => ({
  listRecords: jest.fn(),
  createRecord: jest.fn(),
}));

jest.mock("@/app/api/utils/serialize-person-record", () => ({
  toPersonResponseList: jest.fn((records: Array<{ recordId: string }>) =>
    records.map((record) => ({ record_id: record.recordId }))
  ),
  toPersonResponse: jest.fn((record: { recordId: string }) => ({ record_id: record.recordId })),
}));

jest.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/lib/auth/permissions", () => ({
  canCreateRole: jest.fn(),
}));

const makeGetRequest = (url = "http://localhost/api/users") =>
  ({
    nextUrl: new URL(url),
    headers: new Headers(),
  }) as unknown as Parameters<typeof getUsers>[0];

const makePostRequest = (body: Record<string, unknown>) =>
  ({
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
  }) as unknown as Parameters<typeof createUser>[0];

const baseBody = {
  record_type: "individual",
  full_name: "Jane Doe",
  preferred_name: "Jane",
  gender: "Female",
  birth_date: "1995-05-05",
  email: "jane@example.com",
  phone: "0123456789",
  country: "Thailand",
  city: "Bangkok",
  occupation: "Creator",
  languages: "TH",
};

describe("getUsers handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("validates record_type input", async () => {
    const response = await getUsers(makeGetRequest("http://localhost/api/users?record_type=unknown"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: 'record_type must be either "individual" or "influencer"' });
  });

  it("returns combined records", async () => {
    (listRecords as jest.Mock)
      .mockResolvedValueOnce([{ recordId: "IND-002" }])
      .mockResolvedValueOnce([{ recordId: "INF-001" }]);
    const response = await getUsers(makeGetRequest());
    expect(listRecords).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ record_id: "IND-002" }, { record_id: "INF-001" }] });
  });

  it("handles datastore errors", async () => {
    (listRecords as jest.Mock).mockRejectedValueOnce(new Error("db down"));
    const response = await getUsers(makeGetRequest());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Unable to fetch users" });
  });
});

describe("createUser handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: "admin", role: "admin" });
    (canCreateRole as jest.Mock).mockReturnValue(true);
    (createRecord as jest.Mock).mockResolvedValue({ recordId: "IND-200", recordType: "individual", fullName: "Jane Doe", role: "user" });
  });

  it("rejects invalid JSON payloads", async () => {
    const badRequest = {
      json: jest.fn().mockRejectedValue(new Error("bad json")),
      headers: new Headers(),
    } as unknown as Parameters<typeof createUser>[0];
    const response = await createUser(badRequest);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Invalid JSON body" });
  });

  it("requires authentication", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);
    const response = await createUser(makePostRequest(baseBody));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Unauthorized" });
  });

  it("validates required fields", async () => {
    const response = await createUser(makePostRequest({ ...baseBody, full_name: "" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "full_name is required" });
  });

  it("creates records when payload is valid", async () => {
    const response = await createUser(makePostRequest(baseBody));
    expect(createRecord).toHaveBeenCalledWith("individual", expect.objectContaining({ fullName: "Jane Doe" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { record_id: "IND-200" } });
  });

  it("handles datastore errors", async () => {
    (createRecord as jest.Mock).mockRejectedValueOnce(new Error("db down"));
    const response = await createUser(makePostRequest(baseBody));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Unable to save record" });
  });
});
