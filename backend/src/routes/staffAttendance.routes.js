const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { markMyAttendance, listStaffAttendance } = require('../controllers/staffAttendance.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool, authorizeRole(['owner', 'admin', 'teacher', 'staff']));

router.get('/', asyncHandler(listStaffAttendance));
router.post('/check-in', asyncHandler(markMyAttendance));

module.exports = router;
