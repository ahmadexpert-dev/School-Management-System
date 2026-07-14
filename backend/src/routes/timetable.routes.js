const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { createTimetableEntrySchema, updateTimetableEntrySchema } = require('../validation/schemas');
const {
  listTimetable,
  listClassSections,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
} = require('../controllers/timetable.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/', authorizeRole(['owner', 'admin', 'teacher', 'staff', 'parent']), asyncHandler(listTimetable));
router.get(
  '/classes/:classId/sections',
  authorizeRole(['owner', 'admin', 'teacher', 'staff', 'parent']),
  asyncHandler(listClassSections)
);
router.post(
  '/',
  authorizeRole(['owner', 'admin']),
  validateBody(createTimetableEntrySchema),
  asyncHandler(createTimetableEntry)
);
router.put(
  '/:id',
  authorizeRole(['owner', 'admin']),
  validateBody(updateTimetableEntrySchema),
  asyncHandler(updateTimetableEntry)
);
router.delete('/:id', authorizeRole(['owner', 'admin']), asyncHandler(deleteTimetableEntry));

module.exports = router;
