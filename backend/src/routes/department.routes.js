const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, scopeToSchool } = require('../middleware/auth.middleware');
const { authorizeRoleOrPermission } = require('../middleware/permission.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { createDepartmentSchema, updateDepartmentSchema } = require('../validation/schemas');
const {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/department.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/', authorizeRoleOrPermission(['owner', 'admin'], 'staff:manage'), asyncHandler(listDepartments));
router.post(
  '/',
  authorizeRoleOrPermission(['owner', 'admin'], 'staff:manage'),
  validateBody(createDepartmentSchema),
  asyncHandler(createDepartment)
);
router.put(
  '/:id',
  authorizeRoleOrPermission(['owner', 'admin'], 'staff:manage'),
  validateBody(updateDepartmentSchema),
  asyncHandler(updateDepartment)
);
router.delete(
  '/:id',
  authorizeRoleOrPermission(['owner', 'admin'], 'staff:manage'),
  asyncHandler(deleteDepartment)
);

module.exports = router;
