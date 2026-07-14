import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import StudentsPage from './pages/students/StudentsPage.jsx';
import ClassesPage from './pages/classes/ClassesPage.jsx';
import FeesPage from './pages/fees/FeesPage.jsx';
import AttendancePage from './pages/attendance/AttendancePage.jsx';
import GradesPage from './pages/grades/GradesPage.jsx';
import StaffPage from './pages/staff/StaffPage.jsx';
import ReportsPage from './pages/reports/ReportsPage.jsx';
import ClassWiseReportsPage from './pages/reports/ClassWiseReportsPage.jsx';
import UsersPage from './pages/users/UsersPage.jsx';
import TimetableViewPage from './pages/timetable/TimetableViewPage.jsx';
import TimetableManagePage from './pages/timetable/TimetableManagePage.jsx';
import CalendarPage from './pages/calendar/CalendarPage.jsx';
import LeavePage from './pages/leave/LeavePage.jsx';
import NoticesPage from './pages/notices/NoticesPage.jsx';
import IDCardsPage from './pages/idcards/IDCardsPage.jsx';
import BulkAdmissionPage from './pages/admissions/BulkAdmissionPage.jsx';
import AdmissionReportsPage from './pages/admissions/AdmissionReportsPage.jsx';
import DepartmentsPage from './pages/staff/DepartmentsPage.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="admissions/bulk" element={<BulkAdmissionPage />} />
        <Route path="admissions/reports" element={<AdmissionReportsPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="grades" element={<GradesPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="staff/departments" element={<DepartmentsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/class-wise" element={<ClassWiseReportsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="timetable" element={<TimetableViewPage />} />
        <Route path="timetable/manage" element={<TimetableManagePage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="leave" element={<LeavePage />} />
        <Route path="notices" element={<NoticesPage />} />
        <Route path="id-cards" element={<IDCardsPage />} />
      </Route>
    </Routes>
  );
}
