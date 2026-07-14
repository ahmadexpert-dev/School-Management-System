import api from './api';

export const listExams = (params) => api.get('/exams', { params }).then((r) => r.data.exams);
export const createExam = (data) => api.post('/exams', data).then((r) => r.data.exam);
export const updateExam = (examId, data) => api.put(`/exams/${examId}`, data).then((r) => r.data.exam);
export const deleteExam = (examId) => api.delete(`/exams/${examId}`);
export const listExamSubjects = (examId) => api.get(`/exams/${examId}/subjects`).then((r) => r.data.subjects);
export const addExamSubjects = (examId, subjects) =>
  api.post(`/exams/${examId}/subjects`, { subjects }).then((r) => r.data.subjects);
export const updateExamSubject = (examId, subjectId, data) =>
  api.put(`/exams/${examId}/subjects/${subjectId}`, data).then((r) => r.data.subject);
export const deleteExamSubject = (examId, subjectId) => api.delete(`/exams/${examId}/subjects/${subjectId}`);
export const listGrades = (params) => api.get('/exams/grades/all', { params }).then((r) => r.data.grades);
export const enterGrades = (data) => api.post('/exams/grades', data).then((r) => r.data.grades);
