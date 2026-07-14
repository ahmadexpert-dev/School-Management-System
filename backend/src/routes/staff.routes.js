const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, scopeToSchool } = require('../middleware/auth.middleware');
const { authorizeRoleOrPermission } = require('../middleware/permission.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { uploadStaffPhoto } = require('../middleware/upload.middleware');
const { createStaffSchema, updateStaffSchema } = require('../validation/schemas');
const {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  uploadStaffPhoto: uploadStaffPhotoHandler,
  getStaffStats,
} = require('../controllers/staff.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/', authorizeRoleOrPermission(['owner', 'admin'], 'staff:manage'), asyncHandler(listStaff));
router.get('/stats', authorizeRoleOrPermission(['owner', 'admin'], 'staff:manage'), asyncHandler(getStaffStats));
router.post(
  '/',
  authorizeRoleOrPermission(['owner', 'admin'], 'staff:manage'),
  validateBody(createStaffSchema),
  asyncHandler(createStaff)
);
router.post(
  '/:id/photo',
  authorizeRoleOrPermission(['owner', 'admin'], 'staff:manage'),
  uploadStaffPhoto.single('photo'),
  asyncHandler(uploadStaffPhotoHandler)
);
router.put(
  '/:id',
  authorizeRoleOrPermission(['owner', 'admin'], 'staff:manage'),
  validateBody(updateStaffSchema),
  asyncHandler(updateStaff)
);
router.delete('/:id', authorizeRoleOrPermission(['owner', 'admin'], 'staff:manage'), asyncHandler(deleteStaff));

module.exports = router;
