import api from './api';

export const getFeeReport = (month) => api.get('/reports/fees', { params: { month } }).then((r) => r.data);
export const getAttendanceReport = (params) => api.get('/reports/attendance', { params }).then((r) => r.data.report);
export const getGradeReport = (examId) => api.get('/reports/grades', { params: { examId } }).then((r) => r.data);
export const getResultCard = (examId) => api.get('/reports/result-card', { params: { examId } }).then((r) => r.data);
export const getClassWiseReport = (month) => api.get('/reports/class-wise', { params: { month } }).then((r) => r.data);
