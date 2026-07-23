const { z } = require('zod');

const req = () => z.string().trim().min(1);
const dateString = () =>
  z.string().refine((v) => !isNaN(Date.parse(v)), { message: 'must be a valid date' });

const ROLES = ['owner', 'admin', 'teacher', 'staff', 'parent'];
const DISCOUNT_TYPES = ['sibling', 'staff', 'scholarship', 'hardship', 'none'];
const ATTENDANCE_STATUSES = ['present', 'absent', 'leave'];
const FEE_STATUSES = ['paid', 'partial', 'unpaid'];

// ---- auth ----
const registerSchoolSchema = z.object({
  schoolName: req(),
  address: z.string().optional(),
  contactPhone: z.string().optional(),
  ownerName: req(),
  email: z.string().trim().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z.object({
  token: req(),
  password: z.string().min(8),
});

// ---- users ----
const createUserSchema = z.object({
  name: req(),
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(ROLES),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  name: req().optional(),
  phone: z.string().optional(),
  role: z.enum(ROLES).optional(),
  password: z.string().min(8).optional(),
});

// ---- students ----
const STUDENT_STATUSES = ['active', 'inactive'];

const admissionDetailFields = {
  gender: z.string().optional(),
  dateOfBirth: dateString().optional(),
  placeOfBirth: z.string().optional(),
  bFormNumber: z.string().optional(),
  religion: z.string().optional(),
  surname: z.string().optional(),
  fatherIdCard: z.string().optional(),
  fatherEmail: z.string().email().optional().or(z.literal('')),
  motherPhone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  homeAddress: z.string().optional(),
  previousSchool: z.string().optional(),
  remarks: z.string().optional(),
};

const createStudentSchema = z.object({
  classId: req(),
  name: req(),
  section: z.string().optional(),
  admissionDate: dateString(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  customFeeOverride: z.number().nonnegative().nullable().optional(),
  discountType: z.enum(DISCOUNT_TYPES).optional(),
  discountNotes: z.string().optional(),
  status: z.enum(STUDENT_STATUSES).optional(),
  createParentAccount: z.boolean().optional(),
  ...admissionDetailFields,
});

const updateStudentSchema = createStudentSchema.partial();

const bulkAdmitStudentsSchema = z.object({
  classId: req(),
  section: z.string().optional(),
  createParentAccounts: z.boolean().optional(),
  students: z
    .array(
      z.object({
        name: req(),
        gender: z.string().optional(),
        guardianName: z.string().optional(),
        fatherIdCard: z.string().optional(),
        guardianPhone: z.string().optional(),
        motherPhone: z.string().optional(),
        dateOfBirth: dateString().optional(),
        homeAddress: z.string().optional(),
        customFeeOverride: z.number().nonnegative().nullable().optional(),
        discountNotes: z.string().optional(),
        admissionDate: dateString().optional(),
      })
    )
    .min(1),
});

// ---- classes ----
const createClassSchema = z.object({
  className: req(),
  standardFee: z.number().nonnegative(),
});

const updateClassSchema = createClassSchema.partial();

const assignTeacherSchema = z.object({
  teacherId: req(),
});

// ---- fees ----
// The old /^\d{4}-\d{2}$/ regex only checked digit shape, so "2026-13" (not
// a real month) passed validation — this checks the month part is 01-12.
const monthString = () =>
  z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be in YYYY-MM format with a valid month (01-12)');

const generateMonthlyFeesSchema = z.object({
  month: monthString(),
  dueDate: dateString(),
  classId: z.string().optional(),
});

const updateFeeRecordSchema = z.object({
  amountPaid: z.number().nonnegative().optional(),
  status: z.enum(FEE_STATUSES).optional(),
  paidDate: dateString().nullable().optional(),
});

// ---- attendance ----
const markAttendanceSchema = z.object({
  classId: req(),
  date: dateString(),
  records: z
    .array(
      z.object({
        studentId: req(),
        status: z.enum(ATTENDANCE_STATUSES),
      })
    )
    .min(1),
});

// ---- exams / grades ----
const createExamSchema = z.object({
  classId: req(),
  examName: req(),
  term: req(),
  date: dateString(),
});

const updateExamSchema = z.object({
  examName: req().optional(),
  term: req().optional(),
  date: dateString().optional(),
});

const addExamSubjectsSchema = z.object({
  subjects: z
    .array(
      z.object({
        subject: req(),
        totalMarks: z.number().positive(),
      })
    )
    .min(1),
});

const updateExamSubjectSchema = z.object({
  subject: req().optional(),
  totalMarks: z.number().positive().optional(),
});

const enterGradesSchema = z.object({
  examId: req(),
  subject: req(),
  marks: z
    .array(
      z.object({
        studentId: req(),
        marksObtained: z.number().nonnegative(),
      })
    )
    .min(1),
});

// ---- staff ----
const STAFF_STATUSES = ['active', 'inactive'];

const createStaffSchema = z.object({
  name: req(),
  role: req(),
  subject: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  salary: z.number().nonnegative(),
  joiningDate: dateString(),
  departmentId: z.string().optional(),
  status: z.enum(STAFF_STATUSES).optional(),
});

const updateStaffSchema = createStaffSchema.partial();

// ---- departments ----
const createDepartmentSchema = z.object({
  name: req(),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

// ---- todos ----
const createTodoSchema = z.object({
  text: req(),
});

const updateTodoSchema = z.object({
  text: req().optional(),
  done: z.boolean().optional(),
});

// ---- timetable ----
// The old /^\d{2}:\d{2}$/ regex only checked digit shape, so "25:99" (not a
// real time) passed validation — this checks the hour is 00-23 and minute is 00-59.
const timeString = () =>
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'must be in HH:MM format (00:00-23:59)');

const createTimetableEntrySchema = z.object({
  classId: req(),
  section: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeString(),
  endTime: timeString(),
  subject: req(),
  teacherId: z.string().optional(),
});

const updateTimetableEntrySchema = z.object({
  section: z.string().nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: timeString().optional(),
  endTime: timeString().optional(),
  subject: req().optional(),
  teacherId: z.string().nullable().optional(),
});

// ---- calendar events ----
const EVENT_TYPES = ['holiday', 'event'];

const createEventSchema = z.object({
  title: req(),
  description: z.string().optional(),
  date: dateString(),
  endDate: dateString().optional(),
  type: z.enum(EVENT_TYPES),
});

const updateEventSchema = createEventSchema.partial();

// ---- leave requests ----
const createLeaveRequestSchema = z.object({
  fromDate: dateString(),
  toDate: dateString(),
  reason: req(),
});

const reviewLeaveRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().optional(),
});

// ---- notices ----
const createNoticeSchema = z.object({
  title: req(),
  content: req(),
  audienceRoles: z.array(z.enum(ROLES)).optional(),
});

// ---- student promotion ----
const promoteStudentsSchema = z.object({
  fromClassId: req(),
  toClassId: req(),
  studentIds: z.array(req()).min(1),
});

// ---- permissions ----
const setUserPermissionsSchema = z.object({
  keys: z.array(z.string()),
});

module.exports = {
  registerSchoolSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createUserSchema,
  updateUserSchema,
  createStudentSchema,
  updateStudentSchema,
  bulkAdmitStudentsSchema,
  createClassSchema,
  updateClassSchema,
  assignTeacherSchema,
  generateMonthlyFeesSchema,
  updateFeeRecordSchema,
  markAttendanceSchema,
  createExamSchema,
  updateExamSchema,
  addExamSubjectsSchema,
  updateExamSubjectSchema,
  enterGradesSchema,
  createStaffSchema,
  updateStaffSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createTodoSchema,
  updateTodoSchema,
  createTimetableEntrySchema,
  updateTimetableEntrySchema,
  createEventSchema,
  updateEventSchema,
  createLeaveRequestSchema,
  reviewLeaveRequestSchema,
  createNoticeSchema,
  promoteStudentsSchema,
  setUserPermissionsSchema,
};
