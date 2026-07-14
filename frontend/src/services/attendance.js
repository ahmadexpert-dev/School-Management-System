import api from './api';

export const listAttendance = (params) => api.get('/attendance', { params }).then((r) => r.data.attendance);
export const markAttendance = (data) => api.post('/attendance', data).then((r) => r.data.attendance);
