const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { getSummary } = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/summary', authorizeRole(['owner', 'admin']), asyncHandler(getSummary));

module.exports = router;
