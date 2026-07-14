import api, { API_ORIGIN } from './api';

export const listStaff = () => api.get('/staff').then((r) => r.data.staff);
export const createStaff = (data) => api.post('/staff', data).then((r) => r.data.staff);
export const updateStaff = (id, data) => api.put(`/staff/${id}`, data).then((r) => r.data.staff);
export const deleteStaff = (id) => api.delete(`/staff/${id}`);
export const getStaffStats = () => api.get('/staff/stats').then((r) => r.data);

export const uploadStaffPhoto = (id, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return api
    .post(`/staff/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data.staff);
};

export const staffPhotoUrl = (photoUrl) => (photoUrl ? `${API_ORIGIN}${photoUrl}` : null);
