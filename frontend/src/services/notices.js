import api from './api';

export const listNotices = () => api.get('/notices').then((r) => r.data.notices);
export const createNotice = (data) => api.post('/notices', data).then((r) => r.data.notice);
export const deleteNotice = (id) => api.delete(`/notices/${id}`);
