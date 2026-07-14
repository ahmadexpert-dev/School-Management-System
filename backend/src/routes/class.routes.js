const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { authorizeRoleOrPermission } = require('../middleware/permission.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { createClassSchema, updateClassSchema, assignTeacherSchema } = require('../validation/schemas');
const {
  listClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  assignTeacher,
  unassignTeacher,
} = require('../controllers/class.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/', asyncHandler(listClasses));
router.get('/:id', asyncHandler(getClass));
router.post(
  '/',
  authorizeRoleOrPermission(['owner', 'admin'], 'classes:manage'),
  validateBody(createClassSchema),
  asyncHandler(createClass)
);
router.put(
  '/:id',
  authorizeRoleOrPermission(['owner', 'admin'], 'classes:manage'),
  validateBody(updateClassSchema),
  asyncHandler(updateClass)
);
router.delete('/:id', authorizeRoleOrPermission(['owner', 'admin'], 'classes:manage'), asyncHandler(deleteClass));
router.post(
  '/:id/teachers',
  authorizeRoleOrPermission(['owner', 'admin'], 'classes:manage'),
  validateBody(assignTeacherSchema),
  asyncHandler(assignTeacher)
);
router.delete(
  '/:id/teachers/:teacherId',
  authorizeRoleOrPermission(['owner', 'admin'], 'classes:manage'),
  asyncHandler(unassignTeacher)
);

module.exports = router;
