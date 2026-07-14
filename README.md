# School Management System (SMS)

Multi-tenant school management system for medium-tier private schools in Pakistan. Multiple schools share one PostgreSQL database, isolated by a `schoolId` column on every tenant-scoped table.

## Tech Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- ORM: Prisma
- Database: PostgreSQL
- Auth: JWT + bcrypt (self-built)

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a connection string to a hosted instance)

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env: set DATABASE_URL to your local Postgres connection string, and JWT_SECRET to a random string
npx prisma migrate dev --name init
npm run dev
```

Backend runs at `http://localhost:5000`. Health check: `GET /api/health`.

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at `http://localhost:5173`.

## 3. Try it out

1. Register a school + owner account:
   ```bash
   curl -X POST http://localhost:5000/api/auth/register-school \
     -H "Content-Type: application/json" \
     -d '{
       "schoolName": "Greenwood High",
       "ownerName": "Your Name",
       "email": "owner@greenwood.pk",
       "password": "password123"
     }'
   ```
2. Log in at `http://localhost:5173/login` with the same email/password.
3. Use the sidebar to manage Classes, Students, Fees, Attendance, Grades, Staff, and Reports.

## Multi-tenancy rule (critical)

Every protected route must apply, in order:

1. `authenticateUser` — verifies the JWT, attaches `req.auth = { userId, schoolId, role }`
2. `authorizeRole([...])` — optional, restricts by role
3. `scopeToSchool` — sets `req.schoolId` from `req.auth.schoolId`

Controllers must use `req.schoolId` in every Prisma `where` clause. **Never** trust a `schoolId` passed in the request body, query string, or params.

Teachers are further scoped to their assigned classes via the `ClassTeacher` join table (`src/middleware/classAccess.middleware.js` — `requireClassAccess`, `getAssignedClassIds`). Parents are scoped to their own children via `Student.parentUserId`.

## Security

- **Rate limiting** (`src/middleware/rateLimit.middleware.js`): every `/api/*` route gets a generous limit (300 req/15min); `/api/auth/*` (login, register, forgot/reset password) gets a stricter one (20 req/15min) to slow down credential stuffing and email-enumeration attempts.
- **`helmet`** is applied globally in `server.js` for standard security headers.
- **Request validation** (`src/validation/schemas.js` + `src/middleware/validate.middleware.js`): every mutating route (`POST`/`PUT`) validates `req.body` against a Zod schema before it reaches the controller — required fields, types, string formats (email, date, `YYYY-MM`), and enums (role, status, discount type) are all checked centrally instead of ad hoc in each controller.
- **Password reset**: `POST /api/auth/forgot-password` (body `{ email }`) always returns a generic success message regardless of whether the email exists, to avoid leaking registered emails. It creates a `PasswordResetToken` (only the SHA-256 hash is stored; the raw token is never persisted) valid for 1 hour, and delivery is **stubbed** — it logs `[password-reset-stub] Email to ...: <link>` to the console exactly like `notification.service.js`'s SMS/WhatsApp stub. `POST /api/auth/reset-password` (body `{ token, password }`) consumes the token and invalidates all of that user's other outstanding tokens. Wiring a real email provider later only means replacing the `console.log` in `forgotPassword`.
- Tenant isolation has been audited: every route file applies `authenticateUser` + `scopeToSchool`, every `update`/`delete` by `id` first does a `findFirst({ id, schoolId })` existence check, and no controller ever reads `schoolId` from client input.

## Backups

`src/jobs/backup.job.js` runs a `pg_dump` (custom format, `-F c`, already compressed) of the whole database daily at 2am, writing to `backend/backups/` (gitignored) and keeping the last 7 days — older backups are pruned automatically. To restore: `pg_restore --clean --if-exists -d <DATABASE_URL> <dump file>`. This is a local-disk backup; for production, point `BACKUP_DIR` at a mounted volume or add an upload-to-S3 step after `runBackup()` returns the file path.

## Fee logic

`calculateStudentFee(studentId, schoolId)` in [backend/src/services/fee.service.js](backend/src/services/fee.service.js) returns a student's `customFeeOverride` if set, otherwise their class's `standardFee`. `POST /api/fees/generate` uses this to bulk-create a `FeeRecord` per student for a given month. `PUT /api/fees/:id` lets an admin manually set `status`/`amountPaid` regardless of the calculation — no automation blocks manual overrides.

## Notifications

`src/services/notification.service.js` is a **stub sender** — no real SMS/WhatsApp provider is wired up. It logs to `NotificationLog` and immediately marks the entry `sent`. A daily cron job (`src/jobs/feeReminder.job.js`, registered in `server.js`, runs at 8am) finds overdue `FeeRecord`s and sends a reminder through this stub. To go live, replace the body of `sendNotification` with a real Twilio/WhatsApp Business API call — nothing else needs to change.

## Class ordering

Class names aren't sorted alphabetically anywhere in the UI (that would put "10" before "2"). [frontend/src/utils/classOrder.js](frontend/src/utils/classOrder.js) orders them: Kindergarten, Nursery, Prep, then numerically by any digit in the name (covers "1".."10", "Grade 1", "Class 5", etc). Anything unrecognized sorts alphabetically at the end. This is applied once in `services/classes.js`'s `listClasses()`, so every dropdown and grouped view (Students, Fees, Attendance, Grades, User accounts) gets it automatically — name your classes "Kindergarten", "Nursery", "Prep", "1", "2", ... "10" (or with a "Grade "/"Class " prefix) for correct ordering.

## Grades / exams workflow

The exam → subjects → marks → result card flow is designed so a teacher never re-types a subject's total marks per student:

1. `POST /api/exams` — create an exam (classId, examName, term, date). Owner/admin, or teacher/staff for their own assigned class.
2. `POST /api/exams/:id/subjects` — define the exam's subjects once, each with a `totalMarks` (body: `{ subjects: [{ subject, totalMarks }] }`). Upserts, so correcting a total later doesn't duplicate.
3. `POST /api/exams/grades` — body `{ examId, subject, marks: [{ studentId, marksObtained }] }`. Enters one subject's marks for as many students as you like in one call; `totalMarks` is always looked up from the `ExamSubject` row, never trusted from the client. Rejects a subject that wasn't defined in step 2.
4. `GET /api/reports/result-card?examId=` — one click, whole class: every student in the exam's class (not just those with grades so far), every subject as a column, total/percentage, and a rank (standard competition ranking — ties share a rank). Owner/admin/teacher/staff can generate it (teacher/staff only for their own assigned class).

The `Grade.totalMarks` column still exists for historical/query convenience but is always set server-side from `ExamSubject`, never from request input.

## Reports

`GET /api/reports/fees?month=YYYY-MM` — paid/partial/unpaid counts and totals for a month. Owner/admin only.
`GET /api/reports/attendance?from=&to=` — attendance % per class. Owner/admin only.
`GET /api/reports/grades?examId=` — per-student marks and percentage for an exam (summary version). Owner/admin only.
`GET /api/reports/result-card?examId=` — the full class result card described above. Owner/admin/teacher/staff.

## Timetable, calendar, leave, notices, promotion, ID cards, permissions

A batch of features added after reviewing a mature commercial school-ERP product, scoped down to what a medium-tier school actually needs day-to-day (not the enterprise-scale stuff like biometric hardware, POS/inventory, or a website builder):

- **Timetable** (`/api/timetable`) — weekly-recurring class periods (`TimetableEntry`: day of week, start/end time, subject, optional teacher). Split into two pages: **View Timetable** (`/dashboard/timetable`, all roles — read-only grid, scoped automatically for teacher/staff/parent) and **Manage Timetable** (`/dashboard/timetable/manage`, owner/admin only — same grid plus add/edit/delete). Owner/admin see both under a collapsible "Timetable" sidebar group; other roles see a single flat "Timetable" link to the view page. Both pages render a real timetable grid (`TimetableGrid` component — time-of-day rows × day-of-week columns, built from the entries actually present rather than a fixed period count) instead of a per-day list, and both can export the visible timetable to CSV/PDF or print it (same `exportTable.js` utilities and print-only CSS pattern used by Students/Staff).
- **Academic/Holiday calendar** (`/api/calendar`) — `CalendarEvent` entries (holiday or general event), optionally spanning a date range. Owner/admin manage; everyone can view.
- **Student promotion** (`POST /api/students/promote`) — bulk year-end move of selected students from one class to another in one call (`{ fromClassId, toClassId, studentIds }`). A student left off `studentIds` (e.g. a repeater) simply isn't touched — no separate "repeat" flag needed.
- **Staff leave management** (`/api/leave`) — a `LeaveRequest` per teacher/staff/admin, self-submitted, approved/rejected by owner/admin. A user may cancel their own still-pending request.
- **School noticeboard** (`/api/notices`) — posts with an optional `audienceRoles` array; empty means visible to everyone, otherwise only the listed roles see it.
- **ID card printing** — a frontend-only page (`/dashboard/id-cards`) generating a printable student or staff card from existing data (no photo upload capability yet). Reuses the same print-only CSS pattern as the grades result-card.
- **Custom permissions** (`/api/permissions`) — additive grants layered on top of the fixed `Role` enum via a `UserPermission` model, rather than a full custom-role rebuild (which would have meant rewriting every route's authorization). An owner/admin can grant a specific teacher/staff user one of a fixed catalog of extra abilities (`fees:view`, `fees:manage`, `reports:view`, `classes:manage`, `staff:manage`) from the "Permissions" button on the User accounts page. Checked via `authorizeRoleOrPermission(roles, key)` — allows if the role matches OR the specific grant exists; never replaces the base role check.

## Admission management

A richer admission workflow, again modeled after the reference product's Admission Management module:

- **Admit student** (`/dashboard/students`, "Admit student") — the student form is now sectioned like a real admission form: Student Information (name, gender, DOB, place of birth, B-Form number, religion, surname/caste, previous school, remarks, **photo upload**), Parent Information (father CNIC, name, email, phone, mother phone, WhatsApp number, home address), and Academic Information (class, section, admission date, monthly fee override, discount). Every student gets an auto-generated sequential `studentCode` (`ST0001`, `ST0002`, ...), unique per school.
- **Photo upload** (`POST /api/students/:id/photo`) — real file upload via `multer`, stored on the server's local disk under `backend/uploads/students/` and served at `/uploads/students/<file>` (cross-origin resource policy relaxed for that path only, so the Vite dev server or any separately-hosted frontend can render the `<img>` directly). Limited to JPEG/PNG/WEBP, 3MB. Since it's local-disk storage, a future move to a multi-instance/serverless host would need swapping this for object storage (S3-compatible) — noted as a gap below.
- **Capture live photo** — a "Capture live" button next to the file input opens the browser camera (`getUserMedia`) and grabs a frame to a canvas, producing the same kind of `File` the upload input would — no separate backend path needed.
- **Auto-create parent account on admission** — a "Create parent account?" toggle on the Admit Student form (create-only, not shown when editing). When on and a father email is filled in, `createStudent` either links to an existing parent account with that email (same school) or creates a new one with a random temporary password, links it via `Student.parentUserId`, and emails the credentials via the existing Resend integration. The temporary password is also shown once in a dismissable banner on the admit form, since email delivery can be delayed or filtered.
- **Bulk admission** (`/dashboard/admissions/bulk`, `POST /api/students/bulk`) — admits several students into the same class/section in one request via a manual multi-row grid (choose "Number of students", fill each row). No CSV import (scoped out — manual multi-row entry covers the same use case without file-parsing/validation complexity); each row becomes its own `Student` row with a sequential `studentCode` continuing from the school's existing count.
- **Admission reports** (`/dashboard/admissions/reports`, `GET /api/students/admission-stats`) — stat tiles for admissions today/this month/this year and active vs. deactivated student counts (all computed with `Promise.all` + Prisma `count`, not by fetching every row), plus printable lists (Admissions Today/This Year, a blank admission form) reusing the same print-only CSS pattern (`#result-card-print` + `.no-print`) as the grades result-card and ID cards.
- **Deactivate/reactivate student** — a `Student.status` (`active`/`inactive`) toggle on the Students list, so a withdrawn student can be marked inactive without deleting their historical fee/attendance/grade records.

## Staff management

A parallel upgrade to the `Staff` model (employee records — distinct from `User` teacher/staff logins, see Roles and access below), modeled after the same reference product's Staff Management module:

- **Departments** (`/dashboard/staff/departments`, `/api/departments`) — a simple `Department` model (name, unique per school) that `Staff.departmentId` optionally points to. Deleting a department unassigns its staff rather than blocking the delete or cascading.
- **Employee code, photo, email** — every staff member gets an auto-generated sequential `employeeCode` (`EMP0001`, ...), the same photo-upload pattern as students (`POST /api/staff/:id/photo`, stored under `backend/uploads/staff/`), and an email field.
- **Stat tiles** (`GET /api/staff/stats`) — Total Staff / Active / Deactivated / Departments, computed with `Promise.all` + `count`.
- **Deactivate/reactivate staff** — a `Staff.status` (`active`/`inactive`) toggle, same pattern as student status.
- Deliberately **not** merged with the login/attendance system: `Staff` records here don't require a `User` login, and Staff Attendance (check-in tracking) stays exactly where it was, scoped to `User` accounts with role teacher/staff. The stat tiles here are staff-record counts, not attendance.
- Not built (scoped out for now): Staff Birthdays view (needs a date-of-birth field staff records don't have) and Job Inquiries/CV Bank (a whole separate public job-application subsystem).

## Table toolbar (search, filter, export, print)

A shared `TableToolbar` component (`frontend/src/components/TableToolbar.jsx`) adds a management-bar to the Students and Staff list pages, matching the reference product's layout:

- **Search** — client-side substring match (name/code/role or guardian, depending on the page) over whatever's currently loaded. No new endpoint — both pages already fetch their full school-scoped list, so filtering is instant and avoids adding pagination/search-endpoint complexity that isn't needed at this data scale yet.
- **Filter dropdown** — class (Students) or department (Staff).
- **Load Deactivated / Show Active toggle** — swaps the visible set between active and inactive records rather than mixing both in one list, matching the reference product's behavior.
- **Export** (`frontend/src/utils/exportTable.js`) — Excel (via `xlsx`/SheetJS), CSV (hand-rolled, no library needed), and PDF (via `jspdf` + `jspdf-autotable`), all generated client-side from the currently visible (filtered/searched) rows — nothing round-trips to the server for export.
- **Print** — reuses the existing print-only CSS pattern (`#result-card-print` + `.no-print`) to print a clean flat table of the visible rows.
- **Note on the `xlsx` package**: npm's published `xlsx@0.18.5` has known high-severity advisories (prototype pollution, ReDoS) with no fix on npm — but those affect *parsing* untrusted files, and this app only ever *writes* Excel files it generates itself from its own data, never parses user-uploaded `.xlsx`. Worth revisiting (e.g. SheetJS's newer CDN-distributed builds) before this app ever adds Excel *import*.
- Not built (scoped out for now): bulk row selection with "Edit All"/"Delete All", and a page-size/pagination control (not needed yet at this data scale).

## Class Wise Reports

A dedicated report screen (`/dashboard/reports/class-wise`, `GET /api/reports/class-wise`) modeled after the reference product's page of the same name, added under a new collapsible "Reporting Area" sidebar group (alongside the existing general Reports page).

- **Stat tiles** — Total Active Students, Total Active Staff, Total Fee Generated (all-time), Total Fee Due (all-time) — computed with `Promise.all` + `groupBy`/`count`/`aggregate`, not by fetching every row.
- **Per-class breakdown** (month-scoped, defaults to the current month, changeable via a month picker) — active/deactivated student counts, attendance %, and fee generated/paid/due, all computed in a fixed number of queries (one `findMany` per data source, aggregated in JS by `classId`) rather than one query per class.
- **Six printable reports** — Class Wise Fee Report, Monthly Fee Report (titled with the selected month), Class Wise Strength Report, Class Wise Attendance Report, Complete Summary Report (all of the above combined), and Fee Defaulters Report (every unpaid/partial fee record for the selected month, per student) — all derived from the single `class-wise` response and rendered through the same print-only CSS pattern used elsewhere (`#result-card-print` + `.no-print`).
- Deliberately **not** built: the rest of the reference product's "Reporting Area" sidebar list (Income & Expense Report, Debit & Credit Statement, Balance Sheet, Staff Salary Report, etc.) — those depend on an accounting/expense/payroll module this system doesn't have. Only Class Wise Reports was requested and built.

## Project structure

```
backend/
  src/
    routes/        auth, users, students, classes, fees, attendance, exams (+ grades), staff, notifications, reports, dashboard, todos, staffAttendance, timetable, calendar, leave, notices, permissions
    controllers/    Request handlers (always scope queries by req.schoolId)
    middleware/     authenticateUser, authorizeRole, scopeToSchool, classAccess (teacher/staff scoping), validate (Zod), rateLimit, permission (authorizeRoleOrPermission), upload (multer student-photo storage)
    validation/     schemas.js — Zod schemas for every mutating route
    services/       fee.service (calculateStudentFee), notification.service (stub sender)
    jobs/           feeReminder.job (daily cron for overdue fee reminders), backup.job (daily pg_dump + retention)
    utils/          jwt, password hashing, prisma client, asyncHandler
  prisma/
    schema.prisma
  server.js
frontend/
  src/
    pages/          auth (login, forgot/reset password), dashboard, students, admissions (bulk, reports), classes, fees, attendance, grades, staff, reports, users, timetable, calendar, leave, notices, idcards
    components/     DashboardLayout (role-aware sidebar nav), ProtectedRoute
    context/        AuthContext
    services/       axios api client + one wrapper module per entity
    hooks/          useAuth
```

## Roles and access

- **owner** — full access to every module, including creating other owner/admin accounts.
- **admin** — full access to every module except creating/editing/deleting owner or admin accounts.
- **teacher** and **staff** — functionally identical: both can view students and mark attendance / enter grades only for classes they're assigned to via `ClassTeacher` (assign with `POST /api/classes/:id/teachers`, which accepts either role). Neither can create/edit/delete classes or students. `staff` additionally has **zero access to fees**: `/api/fees/*` returns 403 for staff, and `customFeeOverride`/`discountType`/`discountNotes` are stripped from every student response for staff (teacher still sees them). This is the only difference between the two roles today — `staff` exists as a separate login label for non-teaching class-assigned staff who shouldn't see fee data.
- **parent** — read-only access to their own child's students/fees/attendance/grades records, via `Student.parentUserId`.

Owner/admin create logins for the other roles via `POST /api/users` (or the "User accounts" page in the sidebar) — only an owner can create/edit/delete `owner`/`admin` accounts; an admin can create `teacher`/`staff`/`parent` accounts.

## What's built

- Full auth system: register school + owner, login, forgot/reset password (stubbed delivery), JWT middleware
- User account management (owner/admin create logins for teacher/staff/parent/admin roles)
- Multi-tenant middleware + teacher/staff class-scoping + parent child-scoping (audited — see Security above)
- Classes, Students, Fees (generate + manual override), Attendance, Exams/Grades, Staff (employee records) — full CRUD where applicable
- Notification stub pipeline + daily fee reminder cron job
- Reports: fee collection, attendance %, grade summary
- Admin dashboard: student/teacher/staff/class counts, today's attendance, fees collection chart, top exam performers, quick links, personal to-do list
- Centralized request validation (Zod) on every mutating route, rate limiting, and `helmet` security headers
- Daily automated database backups with retention
- Timetable, academic/holiday calendar, staff leave management, school noticeboard, student promotion, ID card printing, and additive custom permissions (see section above)
- Sectioned admission form with real photo upload, auto-generated student codes, bulk (multi-row) admission, admission stat reports, and active/deactivated student status (see Admission management above)
- React UI for every module above, with a role-aware sidebar

## Known gaps / next steps

- Real SMS/WhatsApp provider integration (currently stubbed)
- Billing/subscriptions (`School.subscriptionTier` exists in the schema but nothing enforces plan limits or charges yet)
- Pagination on list endpoints (fine for a single school's data volume today, will matter at scale)
- No test suite yet
- Off-site backup storage (current backups are local-disk only — see Backups above)
- Student photos are stored on local disk (`backend/uploads/students/`) — fine for a single-server deployment, but would need swapping for object storage (S3-compatible) before running multiple backend instances or a serverless host.
- Bulk admission is manual multi-row entry only — no CSV upload/download (scoped out; see Admission management above)
- Deferred from the reference-product feature audit (see project notes): deeper fee/accounting tooling (installments, discounts, vouchers, defaulter SMS), staff payroll/expense management, richer financial reports, a Test/Exam split with tabulation sheets and quiz/certification/homework-diary/LMS modules — none built yet, only the "day-to-day admin" tier was prioritized so far
