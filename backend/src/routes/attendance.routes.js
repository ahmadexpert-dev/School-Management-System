const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { requireClassAccess } = require('../middleware/classAccess.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { markAttendanceSchema } = require('../validation/schemas');
const { markAttendance, listAttendance } = require('../controllers/attendance.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/', authorizeRole(['owner', 'admin', 'teacher', 'staff', 'parent']), asyncHandler(listAttendance));
router.post(
  '/',
  authorizeRole(['owner', 'admin', 'teacher', 'staff']),
  validateBody(markAttendanceSchema),
  requireClassAccess((req) => req.body.classId),
  asyncHandler(markAttendance)
);

module.exports = router;
