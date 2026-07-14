const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateUser, scopeToSchool } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { createTodoSchema, updateTodoSchema } = require('../validation/schemas');
const { listTodos, createTodo, updateTodo, deleteTodo } = require('../controllers/todo.controller');

const router = express.Router();

router.use(authenticateUser, scopeToSchool);

router.get('/', asyncHandler(listTodos));
router.post('/', validateBody(createTodoSchema), asyncHandler(createTodo));
router.put('/:id', validateBody(updateTodoSchema), asyncHandler(updateTodo));
router.delete('/:id', asyncHandler(deleteTodo));

module.exports = router;
