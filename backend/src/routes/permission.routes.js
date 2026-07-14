const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { setUserPermissionsSchema } = require('../validation/schemas');
const {
  listAvailablePermissions,
  listUserPermissions,
  setUserPermissions,
} = require('../controllers/permission.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool, authorizeRole(['owner', 'admin']));

router.get('/', asyncHandler(listAvailablePermissions));
router.get('/users/:userId', asyncHandler(listUserPermissions));
router.put('/users/:userId', validateBody(setUserPermissionsSchema), asyncHandler(setUserPermissions));

module.exports = router;
