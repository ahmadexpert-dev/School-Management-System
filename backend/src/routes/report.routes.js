const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { authorizeRoleOrPermission } = require('../middleware/permission.middleware');
const {
  feeCollectionReport,
  attendanceReport,
  gradeReport,
  resultCardReport,
  classWiseReport,
} = require('../controllers/report.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/fees', authorizeRoleOrPermission(['owner', 'admin'], 'reports:view'), asyncHandler(feeCollectionReport));
router.get('/attendance', authorizeRoleOrPermission(['owner', 'admin'], 'reports:view'), asyncHandler(attendanceReport));
router.get('/grades', authorizeRoleOrPermission(['owner', 'admin'], 'reports:view'), asyncHandler(gradeReport));
router.get('/result-card', authorizeRole(['owner', 'admin', 'teacher', 'staff']), asyncHandler(resultCardReport));
router.get('/class-wise', authorizeRoleOrPermission(['owner', 'admin'], 'reports:view'), asyncHandler(classWiseReport));

module.exports = router;
