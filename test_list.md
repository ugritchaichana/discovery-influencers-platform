# Test List and Strategy

This document enumerates the test scope for the Discovery Influencers Platform. It groups tests by layer (utilities, API routes, auth/services, UI components, dashboard UX) and defines the scenarios, inputs, and expected outcomes. Existing tests are marked as Implemented. Items labeled Candidate indicate places where extracting helper functions would simplify testing.

## Conventions
- Test runner: Jest with jsdom, React Testing Library
- Locations: `__tests__/**` for unit/integration, colocated by domain
- Naming: `*.test.ts(x)` or `*.spec.ts(x)`
- Mocks: `jest.mock` for auth/db/services; avoid real network/DB
- Commands:
	- `pnpm test` — run all
	- `pnpm test:watch` — watch mode
	- `pnpm test:coverage` — coverage report

## Coverage Targets
- Overall lines: 80%
- Branches: 70%
- Critical modules (auth permissions, account-service, API utils): 90% lines

## สรุปสถานะการทดสอบ Jest (อัปเดต 17 พ.ย. 2025)
สรุปนี้ครอบคลุมไฟล์ภายใต้ `__tests__/` ทั้งหมดที่รันผ่านคำสั่ง `pnpm test` แล้ว (16 test suites / 94 tests ผ่านทั้งหมด)

| หมวด | ไฟล์หลัก | รายละเอียดสถานการณ์ที่ครอบคลุม | สถานะ |
| --- | --- | --- | --- |
| Utilities & Helpers | `__tests__/utils.test.ts`, `__tests__/lib/utils.test.ts`, `__tests__/lib/toast-feedback.test.ts` | formatter ที่ใช้ใน dashboard, helper `cn`, ฟังก์ชัน toast loading/success/error | ✅ ดำเนินการแล้ว |
| Data Store | `__tests__/lib/data-store.test.ts` | CRUD ของ `lib/data-store`, ตัวกรอง followers, distinct field lookup | ✅ |
| Auth Core | `__tests__/lib/auth/permissions.test.ts`, `session.test.ts`, `current-user.test.ts` | matrix การมอบสิทธิ์, JWT/token cookie, การดึงผู้ใช้ปัจจุบันจาก request/cookie | ✅ |
| Auth Account Service | `__tests__/lib/auth/account-service.test.ts` | การสร้าง super admin อัตโนมัติ, hash/verify, create/update/delete account, validation อีเมลซ้ำ | ✅ |
| People API Utilities | `__tests__/api/normalize-id.test.ts`, `app/api/serialize-person-record.test.ts`, `app/api/users-handlers-utils.test.ts` | การ normalize ID, serialization สู่ snake_case, parser ตัวกรอง/record type | ✅ |
| People API Handlers | `app/api/get-user-by-slug.test.ts`, `patch-user-by-slug.test.ts`, `delete-user-by-slug.test.ts` | เส้นทาง GET/PATCH/DELETE `/api/users/[slug]` รวม validation, permission, คำนวณ engagement | ✅ |
| UI | `__tests__/components/button.test.tsx`, `app/dashboard/user-controls.test.tsx` | ปุ่ม UI variants/onClick/disabled + UX ใน dashboard (popover, logout, event dispatch) | ✅ |
| Auth Route Endpoints | _ยังไม่มีไฟล์ทดสอบ_ | POST `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, กลุ่ม `/api/auth/users` | ⚠️ ควรกำหนด test plan |

> หมายเหตุ: สามารถรัน `pnpm test:coverage` เพื่อดูเปอร์เซ็นต์ล่าสุด ก่อน merge ควรตรวจว่ากลุ่ม "Auth Route Endpoints" ถูกเพิ่มเพื่อให้ตามเป้าหมาย Coverage Targets

---

## 1) Utilities (API Helpers)

### 1.1 `app/api/utils/normalize-id.ts`
- normalizeID(rawId, fallbackType)
	- Uses explicit prefix if present: `INF-123` -> `INF-123`
	- Uses fallback prefix: `123` + influencer -> `INF-123`
	- Pads to min 3 digits: `5` -> `INF-005`
	- Keeps large values intact: `123456` -> `IND-123456`
	- Ignores non-digit leading chars after prefix
	- Implemented: `__tests__/api/normalize-id.test.ts`

### 1.2 `app/api/utils/resolve-record-type.ts`
- resolveRecordType(input)
	- Accepts case-insensitive values ("Influencer"|"individual")
	- Validates and throws/returns error on invalid
	- Maps aliases (e.g., `influencer`/`influencers`) if supported

### 1.3 `app/api/utils/serialize-person-record.ts`
- serializePersonRecord(raw)
	- Coerces numeric types (followers to numbers/bigints when applicable)
	- Normalizes null/undefined to consistent output
	- Ensures stable shape for API responses

### 1.4 `lib/utils.ts`
- cn(...classValues)
	- Merges classes and handles falsy inputs
	- No duplicate classes in result

---

## 2) Auth & Services

### 2.1 `lib/auth/permissions.ts`
- canCreateRole(currentRole, targetRole)
	- Matrix-based: superadmin can create all; admin limited; user cannot elevate
	- Edge cases: creating same role; invalid role
- Additional permission helpers (if present) following role matrix

### 2.2 `lib/auth/current-user.ts`
- getCurrentUser(request)
	- Returns user from session/cookie
	- Returns null if no session/invalid token
	- Candidate: inject tokenizer/decoder to isolate from Next API objects

### 2.3 `lib/auth/session.ts`
- Session parse/serialize
	- Parses cookie -> user claims (id, role)
	- Serializes claims -> httpOnly cookie
	- Validates expiry and signature (mocked)

### 2.4 `lib/auth/account-service.ts`
- createAccount({ email, password, role, personRecordId })
	- Validates email/password non-empty
	- Rejects duplicate email (mock Prisma)
	- Hashes password (mock bcrypt)
	- Persists and returns created account
- listAccounts()
	- Returns basic fields only (no password hash)

Notes: Use Jest mocks for Prisma Client and bcrypt; test both happy and error paths.

---

## 3) API Routes (App Router)
Unit-test handlers by calling exported `GET/POST/PATCH/DELETE` and mocking dependencies. For integration-style, consider `next-test-api-route-handler` or `node-mocks-http`.

### 3.1 `app/api/auth/login/route.ts`
- POST
	- 400 when email/password missing
	- 401 for invalid credentials
	- 200 sets session cookie and returns user info for valid credentials

### 3.2 `app/api/auth/logout/route.ts`
- POST
	- Clears session cookie; idempotent (200 even if no session)

### 3.3 `app/api/auth/register/route.ts`
- POST
	- 400 on invalid payload
	- 201 on success with sanitized user data
	- 409 on duplicate email

### 3.4 `app/api/auth/users/route.ts`
- GET
	- 401 if unauthenticated
	- 403 if role is `user`
	- 200 returns list for admin/superadmin
	- Implemented example: see `__tests__/api/auth-users-route.test.ts` (to add)
- POST
	- 401 if unauthenticated
	- 403 if current user cannot create target role
	- 400 if email/password missing
	- 201 returns created account
	- 500 on internal error (service throws)

### 3.5 `app/api/auth/users/[id]/route.ts`
- GET
	- 401 if unauthenticated
	- 404 if not found
	- 200 with user data (no password hash)

### 3.6 `app/api/users/route.ts`
- GET
	- Filters, pagination (if supported by handler)
	- 200 with array
- POST
	- Validates required fields
	- 201 or appropriate error

### 3.7 `app/api/users/[slug]/route.ts`
- GET
	- 200 returns specific user
	- 404 not found
- PATCH
	- Validates fields; 200 updates or 400 invalid
	- 403 when forbidden by role
- DELETE
	- 204 on success; 404 if not found; 403 when forbidden

### 3.8 `app/api/user/[param]/route.ts`
- GET
	- Delegates to `handlers/get.ts`
	- 200 valid param -> mapped data; 400 invalid param

---

## 4) UI Components

### 4.1 `components/ui/button.tsx`
- Renders text and role="button"
- Fires onClick
- Disabled state
- Variant props apply expected classes
- Implemented: `__tests__/components/button.test.tsx`

### 4.2 Toasts (`components/ui/toaster.tsx`, `components/ui/use-toast.ts`)
- Shows toast on trigger
- Auto-dismiss after 5s (use fake timers)
- Manual close and swipe-to-dismiss call the same dismiss code path

### 4.3 Input components (input, label, popover, alert-dialog, etc.)
- Render snapshot-light checks (minimal DOM assertions)
- Prop passthrough (disabled, placeholder, aria-* as applicable)

---

## 5) Dashboard UX (`app/dashboard/dashboard-client.tsx`)

Note: Some helpers are inline; consider extracting pure functions for easier unit testing.

### 5.1 Filter Controls
- Mobile (stacked mode): one control per row
- Tablet/Desktop: compact centered layout, 2–3 columns, no horizontal gaps
- Reset button clears all filters
- Active count reflects selections
- Category, Country -> City dependency (city options narrow when country selected)

Tests:
- RTL render: verify number of filter buttons per breakpoint (use container width simulation and CSS class checks)
- Toggle interactions: open popover, select checkbox, counter increments
- Reset: selections cleared, counter resets to 0

### 5.2 Permissions & Actions
- "+ New person" visible only when `permissions.canCreate`
- View/Edit buttons per record respect `permissions.canEdit` or ownership

### 5.3 Records List
- Pagination math (PAGE_SIZE slice)
- Empty state message when filters exclude all
- Card view (mobile) shows key fields with formatting

### 5.4 Formatters (Candidate for extraction)
- formatTextValue: null/undefined/empty -> "—"; trims
- formatUpperValue: uses formatTextValue then uppercases
- Implemented indirectly: `__tests__/utils.test.ts` (local helpers)

---

## 6) Data Store and Prisma (Mocked)

### 6.1 `lib/data-store.ts` (if used by routes)
- Mock read/write paths
- Error path handling

### 6.2 Prisma integration (indirect)
- In service-layer tests, mock Prisma Client methods (findUnique, create, update, delete)
- Ensure sensitive fields (passwordHash) never leak to API responses

---

## 7) Fixtures and Test Utilities
- Create `__tests__/fixtures/` with:
	- `accounts.ts` sample accounts for each role
	- `people.ts` sample person records with mixed fields
- Create `__tests__/utils/test-helpers.ts`:
	- Mocked `getCurrentUser` factory by role
	- Mocked request object with `.json()` for route calls
	- Fake timers setup for toast tests

---

## 8) Roadmap (Priorities)
- P0
	- Permissions matrix tests (`lib/auth/permissions.ts`)
	- Auth route handlers: `auth/users` GET/POST happy + error paths
	- Toast auto-dismiss + manual dismiss
- P1
	- Dashboard filter interactions + Reset behavior
	- API utils: `resolve-record-type`, `serialize-person-record`
	- Users `GET/POST` and `[slug]` `GET/PATCH/DELETE`
- P2
	- Session parse/serialize
	- Broader component props coverage

---

## 9) How to Run
```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

---

## Implemented Tests Index
- `__tests__/api/normalize-id.test.ts` — API helper: normalizeID
- `__tests__/components/button.test.tsx` — UI button component
- `__tests__/utils.test.ts` — Formatter helpers (co-located in test)

