import api from './api';

export const listFeeRecords = (params) => api.get('/fees', { params }).then((r) => r.data.feeRecords);
export const generateMonthlyFees = (data) => api.post('/fees/generate', data).then((r) => r.data);
export const updateFeeRecord = (id, data) => api.put(`/fees/${id}`, data).then((r) => r.data.feeRecord);
