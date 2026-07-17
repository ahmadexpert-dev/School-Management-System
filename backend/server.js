require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter } = require('./src/middleware/rateLimit.middleware');

const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const studentRoutes = require('./src/routes/student.routes');
const classRoutes = require('./src/routes/class.routes');
const feeRoutes = require('./src/routes/fee.routes');
const attendanceRoutes = require('./src/routes/attendance.routes');
const examRoutes = require('./src/routes/exam.routes');
const staffRoutes = require('./src/routes/staff.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const reportRoutes = require('./src/routes/report.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const todoRoutes = require('./src/routes/todo.routes');
const staffAttendanceRoutes = require('./src/routes/staffAttendance.routes');
const timetableRoutes = require('./src/routes/timetable.routes');
const calendarRoutes = require('./src/routes/calendar.routes');
const leaveRoutes = require('./src/routes/leave.routes');
const noticeRoutes = require('./src/routes/notice.routes');
const permissionRoutes = require('./src/routes/permission.routes');
const departmentRoutes = require('./src/routes/department.routes');
const { scheduleFeeReminderJob } = require('./src/jobs/feeReminder.job');
const { scheduleBackupJob } = require('./src/jobs/backup.job');
const { scheduleKeepAliveJob } = require('./src/jobs/keepAlive.job');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Uploaded student photos — served cross-origin so the Vite dev server (and
// any separately-hosted frontend) can render them directly in <img> tags.
app.use(
  '/uploads',
  (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, 'uploads'))
);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/staff-attendance', staffAttendanceRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/departments', departmentRoutes);

// Serves the built frontend (backend/public/, produced by `npm run
// build:frontend`) as one deployable Node app — no separate static host
// needed. Absent in local dev (Vite's own dev server handles the frontend
// instead), so this only activates once the folder actually exists.
const frontendDist = path.join(__dirname, 'public');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api|uploads).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Centralized error handler — keeps controllers free of try/catch boilerplate.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SMS backend running on http://localhost:${PORT}`);
  scheduleFeeReminderJob();
  scheduleBackupJob();
  scheduleKeepAliveJob();
});
