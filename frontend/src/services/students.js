import api, { API_ORIGIN } from './api';

export const listStudents = (params) => api.get('/students', { params }).then((r) => r.data.students);
export const getStudent = (id) => api.get(`/students/${id}`).then((r) => r.data.student);
export const createStudent = (data) => api.post('/students', data).then((r) => r.data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data).then((r) => r.data.student);
export const deleteStudent = (id) => api.delete(`/students/${id}`);
export const promoteStudents = (data) => api.post('/students/promote', data).then((r) => r.data);
export const bulkAdmitStudents = (data) => api.post('/students/bulk', data).then((r) => r.data.students);
export const getAdmissionStats = () => api.get('/students/admission-stats').then((r) => r.data);

export const uploadStudentPhoto = (id, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return api
    .post(`/students/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data.student);
};

export const studentPhotoUrl = (photoUrl) => (photoUrl ? `${API_ORIGIN}${photoUrl}` : null);
