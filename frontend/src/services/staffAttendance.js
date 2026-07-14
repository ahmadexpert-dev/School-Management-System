import api from './api';

export const listStaffAttendance = (params) =>
  api.get('/staff-attendance', { params }).then((r) => r.data.attendance);
export const checkInStaffAttendance = () =>
  api.post('/staff-attendance/check-in').then((r) => r.data.attendance);
