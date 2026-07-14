const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { listNotifications } = require('../controllers/notification.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/', authorizeRole(['owner', 'admin', 'parent']), asyncHandler(listNotifications));

module.exports = router;
