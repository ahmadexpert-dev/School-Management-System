const prisma = require('../utils/prisma');

// Every todo is scoped to both schoolId (tenant isolation) and the
// requesting user's own userId — todos are never shared between users.
async function listTodos(req, res) {
  const todos = await prisma.todo.findMany({
    where: { schoolId: req.schoolId, userId: req.auth.userId },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ todos });
}

async function createTodo(req, res) {
  const { text } = req.body;

  const todo = await prisma.todo.create({
    data: { schoolId: req.schoolId, userId: req.auth.userId, text },
  });
  return res.status(201).json({ todo });
}

async function updateTodo(req, res) {
  const existing = await prisma.todo.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId, userId: req.auth.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Todo not found' });

  const { text, done } = req.body;
  const todo = await prisma.todo.update({
    where: { id: existing.id },
    data: {
      ...(text !== undefined && { text }),
      ...(done !== undefined && { done }),
    },
  });
  return res.json({ todo });
}

async function deleteTodo(req, res) {
  const existing = await prisma.todo.findFirst({
    where: { id: req.params.id, schoolId: req.schoolId, userId: req.auth.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Todo not found' });

  await prisma.todo.delete({ where: { id: existing.id } });
  return res.status(204).send();
}

module.exports = { listTodos, createTodo, updateTodo, deleteTodo };
