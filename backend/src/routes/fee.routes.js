const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { authorizeRoleOrPermission } = require('../middleware/permission.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { generateMonthlyFeesSchema, updateFeeRecordSchema } = require('../validation/schemas');
const { listFeeRecords, generateMonthlyFees, updateFeeRecord } = require('../controllers/fee.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/', authorizeRoleOrPermission(['owner', 'admin', 'parent'], 'fees:view'), asyncHandler(listFeeRecords));
router.post(
  '/generate',
  authorizeRoleOrPermission(['owner', 'admin'], 'fees:manage'),
  validateBody(generateMonthlyFeesSchema),
  asyncHandler(generateMonthlyFees)
);
router.put(
  '/:id',
  authorizeRoleOrPermission(['owner', 'admin'], 'fees:manage'),
  validateBody(updateFeeRecordSchema),
  asyncHandler(updateFeeRecord)
);

module.exports = router;
