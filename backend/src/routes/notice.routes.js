const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { createNoticeSchema } = require('../validation/schemas');
const { listNotices, createNotice, deleteNotice } = require('../controllers/notice.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/', asyncHandler(listNotices));
router.post('/', authorizeRole(['owner', 'admin']), validateBody(createNoticeSchema), asyncHandler(createNotice));
router.delete('/:id', authorizeRole(['owner', 'admin']), asyncHandler(deleteNotice));

module.exports = router;
