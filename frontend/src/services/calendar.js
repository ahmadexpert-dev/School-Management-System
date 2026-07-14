import api from './api';

export const listEvents = (params) => api.get('/calendar', { params }).then((r) => r.data.events);
export const createEvent = (data) => api.post('/calendar', data).then((r) => r.data.event);
export const updateEvent = (id, data) => api.put(`/calendar/${id}`, data).then((r) => r.data.event);
export const deleteEvent = (id) => api.delete(`/calendar/${id}`);
