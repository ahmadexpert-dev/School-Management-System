import { useEffect, useState } from 'react';
import { listClasses } from '../../services/classes';
import { listStudents } from '../../services/students';
import { markAttendance, listAttendance } from '../../services/attendance';
import { listStaffAttendance, checkInStaffAttendance } from '../../services/staffAttendance';
import { useAuth } from '../../hooks/useAuth';

const STATUS_OPTIONS = ['present', 'absent', 'leave'];
const today = () => new Date().toISOString().slice(0, 10);

export default function AttendancePage() {
  const { user } = useAuth();
  const canMark = ['owner', 'admin', 'teacher', 'staff'].includes(user?.role);
  const isManager = ['owner', 'admin'].includes(user?.role);
  // Owner is exempt from self check-in — everyone else (admin/teacher/staff)
  // marks their own attendance when they come to school.
  const mustCheckIn = ['admin', 'teacher', 'staff'].includes(user?.role);

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(() => today());
  const [students, setStudents] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [myCheckIns, setMyCheckIns] = useState([]);
  const [staffToday, setStaffToday] = useState([]);
  const [checkInError, setCheckInError] = useState('');

  useEffect(() => {
    if (canMark) {
      listClasses().then(setClasses).catch(() => {});
      if (mustCheckIn) refreshMyCheckIns();
      if (isManager) refreshStaffToday();
    } else {
      listStudents().then(setStudents).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshMyCheckIns() {
    try {
      setMyCheckIns(await listStaffAttendance({ userId: user.id }));
    } catch (err) {
      setCheckInError(err.response?.data?.error || 'Failed to load your attendance');
    }
  }

  async function refreshStaffToday() {
    try {
      setStaffToday(await listStaffAttendance({ from: today(), to: today() }));
    } catch (err) {
      setCheckInError(err.response?.data?.error || 'Failed to load staff attendance');
    }
  }

  async function handleCheckIn() {
    setCheckInError('');
    try {
      await checkInStaffAttendance();
      await refreshMyCheckIns();
      if (isManager) await refreshStaffToday();
    } catch (err) {
      setCheckInError(err.response?.data?.error || 'Failed to mark attendance');
    }
  }

  const alreadyCheckedInToday = myCheckIns.some((a) => a.date?.slice(0, 10) === today());

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    listStudents({ classId }).then((list) => {
      setStudents(list);
      setStatuses(Object.fromEntries(list.map((s) => [s.id, 'present'])));
    });
  }, [classId]);

  async function handleViewStudent(student) {
    setSelectedStudent(student);
    setError('');
    try {
      setHistory(await listAttendance({ studentId: student.id }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load attendance history');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      const records = students.map((s) => ({ studentId: s.id, status: statuses[s.id] }));
      await markAttendance({ classId, date, records });
      setInfo(`Attendance saved for ${records.length} student(s).`);
      setHistory(await listAttendance());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save attendance');
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-800 mb-4">Attendance</h1>

      {mustCheckIn && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">My attendance</h2>
          {checkInError && <div className="text-sm text-red-600 mb-3">{checkInError}</div>}
          {alreadyCheckedInToday ? (
            <p className="text-sm text-green-700">
              Checked in today at{' '}
              {new Date(myCheckIns.find((a) => a.date?.slice(0, 10) === today())?.checkInTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              .
            </p>
          ) : (
            <button
              onClick={handleCheckIn}
              className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
            >
              Mark today's attendance
            </button>
          )}

          {myCheckIns.length > 0 && (
            <table className="w-full text-sm mt-4">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="py-1">Date</th>
                  <th className="py-1">Check-in time</th>
                </tr>
              </thead>
              <tbody>
                {myCheckIns.slice(0, 10).map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="py-1">{a.date?.slice(0, 10)}</td>
                    <td className="py-1">
                      {new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {isManager && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Staff attendance today</h2>
          {staffToday.length === 0 ? (
            <p className="text-sm text-slate-400">No one has checked in yet today.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="py-1">Name</th>
                  <th className="py-1">Role</th>
                  <th className="py-1">Check-in time</th>
                </tr>
              </thead>
              <tbody>
                {staffToday.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="py-1">{a.user?.name}</td>
                    <td className="py-1 capitalize">{a.user?.role}</td>
                    <td className="py-1">
                      {new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {canMark && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex gap-3 items-end mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Class</label>
              <select
                required
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="border border-slate-300 rounded px-3 py-1.5 text-sm"
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border border-slate-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {students.length > 0 && (
            <div className="space-y-2 mb-4">
              {students.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={() => handleViewStudent(s)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {s.name}
                  </button>
                  <select
                    value={statuses[s.id] || 'present'}
                    onChange={(e) => setStatuses({ ...statuses, [s.id]: e.target.value })}
                    className="border border-slate-300 rounded px-2 py-1 text-sm capitalize"
                  >
                    {STATUS_OPTIONS.map((s2) => (
                      <option key={s2} value={s2}>
                        {s2}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {students.length > 0 && (
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
              Save attendance
            </button>
          )}
        </form>
      )}

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
      {info && <div className="text-sm text-green-600 mb-4">{info}</div>}

      {!canMark && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Students</h2>
          {students.length === 0 ? (
            <p className="text-sm text-slate-400">No students found.</p>
          ) : (
            <ul className="space-y-2">
              {students.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handleViewStudent(s)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selectedStudent && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Attendance records — {selectedStudent.name}</h2>
          <table className="w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 50).map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{a.date?.slice(0, 10)}</td>
                  <td className="px-4 py-2 capitalize">{a.status}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                    No attendance records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
