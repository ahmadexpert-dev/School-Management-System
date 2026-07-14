import api from './api';

export const listLeaveRequests = (params) => api.get('/leave', { params }).then((r) => r.data.requests);
export const createLeaveRequest = (data) => api.post('/leave', data).then((r) => r.data.request);
export const reviewLeaveRequest = (id, data) => api.put(`/leave/${id}/review`, data).then((r) => r.data.request);
export const deleteLeaveRequest = (id) => api.delete(`/leave/${id}`);
