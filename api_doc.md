# Discovery Influencers Platform – API Documentation

เอกสารนี้ครอบคลุม REST API บน Next.js (App Router) สำหรับระบบ Discovery Influencers Platform อ้างอิงโค้ดบนสาขา `feature/myprofile` ณ วันที่ 17 พ.ย. 2025

## พื้นฐาน
- Base Path (Dev): `http://localhost:3000/api`
- รูปแบบวันที่: `YYYY-MM-DD`
- การตอบกลับมาตรฐาน: `{ "data": ..., "message"?: string }`
- ข้อผิดพลาด: ใช้ HTTP status + `message` ที่สื่อความหมาย (เช่น `400 {"message": "slug is required"}`)

## การพิสูจน์ตัวตน
- ใช้ cookie `auth_token` (HTTP-only, SameSite=lax) ที่สร้างจาก `lib/auth/session`
- Endpoint ส่วนใหญ่ที่แก้ไขข้อมูลต้องแนบ cookie นี้ในคำขอ
- สำหรับการทดสอบในเครื่องสามารถเลียนแบบโดยเรียก `POST /api/auth/login` ก่อน จากนั้นเบราว์เซอร์จะเก็บ cookie ให้เอง

## โครงสร้าง PersonResponse (ตอบกลับหลักของข้อมูลบุคคล)
ทุก endpoint ใต้ `/api/users` จะคืนข้อมูลตามฟิลด์นี้

| ฟิลด์ | ชนิด | คำอธิบาย |
| --- | --- | --- |
| `record_id` | string | รหัส `INF-###` หรือ `IND-###` |
| `record_type` | string (`"influencer"` หรือ `"individual"`) | ประเภทข้อมูล |
| `full_name`, `preferred_name` | string | ชื่อเต็ม / ชื่อเล่น |
| `gender`, `birth_date`, `email`, `phone` | string \| null | ข้อมูลประจำตัว |
| `city`, `country`, `occupation` | string \| null | ที่อยู่/อาชีพ |
| `influencer_category`, `primary_platform`, `secondary_platform` | string \| null | หมวดหมู่ / แพลตฟอร์ม |
| `followers_count`, `secondary_followers_count`, `total_followers_count` | number \| null | ยอดผู้ติดตาม |
| `engagement_rate`, `engagement_rate_tier` | number \| string \| null | อัตรา engagement และระดับ (low/medium/high) |
| `average_monthly_reach`, `interests`, `notes`, `portfolio_url` | ต่าง ๆ | เมตะเพิ่มเติม |
| `collaboration_status`, `languages`, `last_contact_date`, `role` | string \| null | สถานะร่วมงาน, ภาษา, วันที่ติดต่อครั้งล่าสุด, บทบาทที่ระบบกำหนด |

## กลุ่ม Authentication

### POST `/api/auth/login`
- Body: `{ "email": string, "password": string }`
- Flow: ตรวจสอบว่ามี super admin หรือไม่, ค้นหา account, ตรวจรหัสผ่าน, สร้าง JWT + cookie
- Response: `200` + `{ data: { id, email, role, person_record_id } }`
- Errors: `400` (ขาด email/password), `401` (Invalid credentials), `500` (Unhandled)

### POST `/api/auth/logout`
- ไม่ต้องมี Body
- ล้าง cookie `auth_token`
- Response: `200 { message: "Logged out" }`

### POST `/api/auth/register`
- ใช้สำหรับ self-signup พร้อมสร้าง profile record
- Body: ต้องกรอกฟิลด์ตามรายการ REQUIRED (`full_name`, `email`, `password`, `record_type`, ฯลฯ) และต้องผ่าน validation (ความยาวรหัสผ่าน ≥ 8, country/gender อยู่ใน whitelist, languages อยู่ใน `TH/EN/CN`)
- Biz logic: คำนวณ followers + engagement rate/tier อัตโนมัติถ้ามีข้อมูล
- Response: `201 { data: { account, profile } }` พร้อมตั้ง cookie
- Errors: `400` (validation), `500` (สร้างไม่สำเร็จ)

## กลุ่ม Account Admin (`/api/auth/users`)
ต้องเป็น `admin` หรือ `superadmin` (หรือ role ที่ผ่าน permission matrix) และ cookie ถูกต้อง

### GET `/api/auth/users`
- ดึงรายชื่อบัญชีที่มี password + email
- Response: `200 { data: [{ id, email, role, personRecordId }] }`
- Errors: `401` (ไม่ล็อกอิน), `403` (role = user)

### POST `/api/auth/users`
- Body: `{ email, password, role?, person_record_id? }`
- Validation: email/password ต้องมี, ตรวจ role ด้วย `canCreateRole`
- Response: `201 { data: account }`
- Errors: `400`, `401`, `403`, `500`

### PATCH `/api/auth/users/:id`
- Body (optional): `{ email?, password?, role? }`
- กติกา: ห้ามลด/เพิ่ม role ของตัวเอง, ตรวจสอบซ้ำกับ `canUpdateRole`/`canCreateRole`, ป้องกัน duplicated email
- Response: `200 { data: account }`
- Errors: `401`, `403`, `404`, `409`, `500`

### DELETE `/api/auth/users/:id`
- ลบ account อื่น (ห้ามลบตัวเอง)
- Response: `204`
- Errors: `401`, `403`, `404`, `400` (พยายามลบตัวเอง), `500`

## กลุ่ม People Records (`/api/users`)

### GET `/api/users`
- Query:
	- `record_type` (`individual|influencer`) – optional
	- `city`
	- สำหรับ influencer: `influencer_category`, `engagement_rate_tier`, `collaboration_status`
	- สำหรับ individual: `status`, `followers_min`, `followers_max`
- Handler จะเรียก `listRecords` ตามแต่ละประเภทแล้วรวมเรียงตาม `recordId`
- Response: `200 { data: PersonResponse[] }`
- Errors: `400` (record_type ไม่ถูกต้อง)

### POST `/api/users`
- ต้องล็อกอิน (ใช้ `getCurrentUser`)
- Body: ฟิลด์บังคับตาม `REQUIRED_FIELDS` (ชื่อ, ที่อยู่, ภาษา ฯลฯ) + optional fields (platforms, engagement, role ที่ต้องผ่าน `canCreateRole`)
- Biz logic: สร้าง PersonRecord, คำนวณ total followers/engagement rate & tier, เซต `last_contact_date`
- Response: `201 { data: PersonResponse }`
- Errors: `400` (invalid JSON หรือขาดฟิลด์), `401` (ไม่ล็อกอิน), `403` (ไม่ได้สิทธิ์ตั้ง role), `500`

### GET `/api/users/:slug`
- `slug` case-insensitive
- กรณีพิเศษ: `IND` หรือ `INF` (ไม่มีเลข) = คืนลิสต์ของประเภทนั้นพร้อมตัวกรอง query เช่นเดียวกับ `/api/users`
- ปกติ: ตรวจ prefix เพื่อเดา type, `getRecord` คืนข้อมูลเดียว
- Response: `200 { data: PersonResponse }` หรือ `{ data: PersonResponse[] }` กรณีลิสต์
- Errors: `400` (slug ว่างหรือ prefix ผิด), `404` (ไม่พบ)

### PATCH `/api/users/:slug`
- ต้องล็อกอิน
- Body: รองรับ snake_case และ camelCase; มี logic แปลง followers -> total/engagement automatically, ตรวจ role ใหม่ด้วย `canCreateRole`
- Response: `200 { data: PersonResponse }`
- Errors: `400` (json ไม่ถูกต้อง / role null / record_type ผิด), `401`, `403`, `404`

### DELETE `/api/users/:slug`
- ตรวจ prefix เช่นเดียวกับ PATCH
- Response: `204`
- Errors: `400`, `404`

## กลุ่ม Metadata (`/api/user/:param`)
- รองรับ `param` = `influencer_category`, `engagement_rate_tier`, `city`, `collaboration_status`
- Query optional: `record_type`
- Response: `200 { data: string[] }` (ค่า distinct จากฐานข้อมูล)
- Errors: `400` (param/record_type ไม่ถูกต้อง), `404` (param ไม่อยู่ใน whitelist)

## ตัวอย่างการเรียกใช้งาน
```bash
# Login (จะได้รับ cookie auth_token)
curl -X POST http://localhost:3000/api/auth/login \
	-H "Content-Type: application/json" \
	-d '{"email":"admin@example.com","password":"secret"}' -i

# ดึง influencers เฉพาะหมวด Beauty ในกรุงเทพ
curl "http://localhost:3000/api/users?record_type=influencer&influencer_category=Beauty&city=Bangkok" \
	-H "Cookie: auth_token=..."

# อัปเดตผู้ใช้
curl -X PATCH http://localhost:3000/api/users/INF-001 \
	-H "Content-Type: application/json" \
	-H "Cookie: auth_token=..." \
	-d '{"followers_count":12000,"secondary_followers_count":8000,"role":"editor"}'
```

## บันทึกเพิ่มเติม
- ทุก endpoint ใช้ `NextResponse.json` ดังนั้น Header `Content-Type: application/json` จะถูกเซตอัตโนมัติ
- ถ้าต้องทดสอบจาก Postman/Thunder Client ให้คัดลอก cookie จากคำตอบ login แล้วแนบในคำขอถัดไป
- ระบบ log ข้อผิดพลาด (console.error) เฉพาะฝั่งเซิร์ฟเวอร์ จึงควรดู output ของ `pnpm dev` เมื่อดีบัก
