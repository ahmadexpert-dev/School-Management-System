import { useEffect, useState } from 'react';
import { getFeeReport, getAttendanceReport, getGradeReport } from '../../services/reports';
import { listExams } from '../../services/exams';

export default function ReportsPage() {
  const [feeMonth, setFeeMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [feeData, setFeeData] = useState(null);

  const [attendanceData, setAttendanceData] = useState([]);

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [gradeData, setGradeData] = useState(null);

  const [error, setError] = useState('');

  useEffect(() => {
    listExams().then(setExams).catch(() => {});
    getAttendanceReport().then(setAttendanceData).catch(() => {});
  }, []);

  useEffect(() => {
    if (!feeMonth) return;
    getFeeReport(feeMonth)
      .then(setFeeData)
      .catch((err) => setError(err.response?.data?.error || 'Failed to load fee report'));
  }, [feeMonth]);

  useEffect(() => {
    if (!selectedExamId) {
      setGradeData(null);
      return;
    }
    getGradeReport(selectedExamId)
      .then(setGradeData)
      .catch((err) => setError(err.response?.data?.error || 'Failed to load grade report'));
  }, [selectedExamId]);

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold text-slate-800">Reports</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}

      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Fee collection</h2>
          <input
            type="month"
            value={feeMonth}
            onChange={(e) => setFeeMonth(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1 text-sm"
          />
        </div>
        {feeData && (
          <div className="grid grid-cols-5 gap-3">
            <StatCard label="Records" value={feeData.recordCount} />
            <StatCard label="Paid" value={feeData.summary.paid} />
            <StatCard label="Partial" value={feeData.summary.partial} />
            <StatCard label="Unpaid" value={feeData.summary.unpaid} />
            <StatCard label="Collected / Due" value={`Rs. ${feeData.summary.totalPaid} / ${feeData.summary.totalDue}`} />
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Attendance by class</h2>
        <table className="w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Records</th>
              <th className="px-4 py-2">Present</th>
              <th className="px-4 py-2">Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.map((row) => (
              <tr key={row.classId} className="border-t border-slate-100">
                <td className="px-4 py-2">{row.className}</td>
                <td className="px-4 py-2">{row.totalRecords}</td>
                <td className="px-4 py-2">{row.presentCount}</td>
                <td className="px-4 py-2">{row.attendancePercent ?? '-'}</td>
              </tr>
            ))}
            {attendanceData.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No attendance data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Grade summary</h2>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1 text-sm"
          >
            <option value="">Select exam</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.examName} — {ex.class?.className} ({ex.term})
              </option>
            ))}
          </select>
        </div>
        {gradeData && (
          <table className="w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Student</th>
                <th className="px-4 py-2">Obtained</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">%</th>
              </tr>
            </thead>
            <tbody>
              {gradeData.report.map((row) => (
                <tr key={row.studentId} className="border-t border-slate-100">
                  <td className="px-4 py-2">{row.studentName}</td>
                  <td className="px-4 py-2">{row.obtained}</td>
                  <td className="px-4 py-2">{row.total}</td>
                  <td className="px-4 py-2">{row.percentage ?? '-'}</td>
                </tr>
              ))}
              {gradeData.report.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No grades recorded for this exam.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}
