const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, authorizeRole, scopeToSchool } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { createUserSchema, updateUserSchema } = require('../validation/schemas');
const { listUsers, createUser, updateUser, deleteUser } = require('../controllers/user.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool, authorizeRole(['owner', 'admin']));

router.get('/', asyncHandler(listUsers));
router.post('/', validateBody(createUserSchema), asyncHandler(createUser));
router.put('/:id', validateBody(updateUserSchema), asyncHandler(updateUser));
router.delete('/:id', asyncHandler(deleteUser));

module.exports = router;
