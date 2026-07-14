const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { createLeaveRequestSchema, reviewLeaveRequestSchema } = require('../validation/schemas');
const {
  listLeaveRequests,
  createLeaveRequest,
  reviewLeaveRequest,
  deleteLeaveRequest,
} = require('../controllers/leave.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool, authorizeRole(['owner', 'admin', 'teacher', 'staff']));

router.get('/', asyncHandler(listLeaveRequests));
router.post('/', validateBody(createLeaveRequestSchema), asyncHandler(createLeaveRequest));
router.put(
  '/:id/review',
  authorizeRole(['owner', 'admin']),
  validateBody(reviewLeaveRequestSchema),
  asyncHandler(reviewLeaveRequest)
);
router.delete('/:id', asyncHandler(deleteLeaveRequest));

module.exports = router;
