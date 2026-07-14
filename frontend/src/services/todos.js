import api from './api';

export const listTodos = () => api.get('/todos').then((r) => r.data.todos);
export const createTodo = (text) => api.post('/todos', { text }).then((r) => r.data.todo);
export const updateTodo = (id, data) => api.put(`/todos/${id}`, data).then((r) => r.data.todo);
export const deleteTodo = (id) => api.delete(`/todos/${id}`);
