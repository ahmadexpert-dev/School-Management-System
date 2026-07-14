import { useEffect, useState } from 'react';
import { getAdmissionStats, listStudents } from '../../services/students';

const GRADIENTS = {
  today: ['#4338ca', '#6366f1'],
  month: ['#7c3aed', '#a78bfa'],
  active: ['#5b21b6', '#8b5cf6'],
  deactivated: ['#86198f', '#e879f9'],
};

function StatTile({ label, value, gradient }) {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 bg-white">
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})` }} />
      <div className="p-4">
        <div className="text-2xl font-semibold text-slate-800">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function isWithin(dateStr, start) {
  return new Date(dateStr) >= start;
}

const REPORTS = [
  { key: 'today', label: 'Admissions Today', description: 'List of newly admitted students today so far.' },
  { key: 'month', label: 'Monthly Admissions', description: 'List of total admitted students this month so far.' },
  { key: 'year', label: 'Admissions This Year', description: 'List of admitted students this year so far.' },
  { key: 'blank', label: 'Blank Admission Form', description: 'Print a blank copy of the admission form.' },
];

export default function AdmissionReportsPage() {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(null);

  useEffect(() => {
    Promise.all([getAdmissionStats(), listStudents()])
      .then(([s, list]) => {
        setStats(s);
        setStudents(list);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load admission reports'));
  }, []);

  function studentsFor(key) {
    const now = new Date();
    if (key === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return students.filter((s) => isWithin(s.admissionDate, start));
    }
    if (key === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return students.filter((s) => isWithin(s.admissionDate, start));
    }
    if (key === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      return students.filter((s) => isWithin(s.admissionDate, start));
    }
    return [];
  }

  function handlePrint(key) {
    setPrinting(key);
    setTimeout(() => window.print(), 50);
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-800 mb-4">Admission Reports</h1>
      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 no-print">
          <StatTile label="Admissions Today" value={stats.admissionsToday} gradient={GRADIENTS.today} />
          <StatTile label="Admissions This Month" value={stats.admissionsThisMonth} gradient={GRADIENTS.month} />
          <StatTile label="Active Students" value={stats.activeStudents} gradient={GRADIENTS.active} />
          <StatTile label="Deactivated Students" value={stats.deactivatedStudents} gradient={GRADIENTS.deactivated} />
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden no-print">
        <div
          className="px-4 py-2 text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
        >
          Printable Admission Reports
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORTS.map((r) => (
            <div key={r.key} className="flex items-start justify-between border-b border-slate-100 pb-3 last:border-0">
              <div>
                <div className="font-medium text-slate-800">{r.label}</div>
                <div className="text-xs text-slate-500">{r.description}</div>
              </div>
              <button
                onClick={() => handlePrint(r.key)}
                className="text-white rounded px-3 py-1.5 text-xs font-medium shrink-0"
                style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
              >
                Print
              </button>
            </div>
          ))}
        </div>
        <p className="px-4 pb-4 text-xs text-slate-400">
          Note: reports print in list form; use your browser's "Save as PDF" destination if you need a PDF file.
        </p>
      </div>

      {printing && (
        <div id="result-card-print" className="p-8">
          {printing === 'blank' ? (
            <div>
              <h2 className="text-lg font-bold mb-4">Student Admission Form</h2>
              {[
                'Student name',
                'Gender',
                'Date of birth',
                'Class / Section',
                "Father's name",
                "Father's phone",
                'Home address',
                'Admission date',
              ].map((label) => (
                <div key={label} className="flex border-b border-slate-300 py-3">
                  <span className="w-48 font-medium">{label}</span>
                  <span className="flex-1">&nbsp;</span>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold mb-1">
                {REPORTS.find((r) => r.key === printing)?.label}
              </h2>
              <p className="text-xs text-slate-500 mb-4">Printed {new Date().toLocaleString()}</p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-left">
                    <th className="py-1 pr-3">Code</th>
                    <th className="py-1 pr-3">Name</th>
                    <th className="py-1 pr-3">Class</th>
                    <th className="py-1 pr-3">Guardian</th>
                    <th className="py-1 pr-3">Admission date</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsFor(printing).map((s) => (
                    <tr key={s.id} className="border-b border-slate-200">
                      <td className="py-1 pr-3">{s.studentCode || '-'}</td>
                      <td className="py-1 pr-3">{s.name}</td>
                      <td className="py-1 pr-3">{s.class?.className || '-'}</td>
                      <td className="py-1 pr-3">{s.guardianName || '-'}</td>
                      <td className="py-1 pr-3">{s.admissionDate?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {studentsFor(printing).length === 0 && (
                <p className="text-slate-400 text-sm mt-3">No admissions in this period.</p>
              )}
            </div>
          )}
          <button onClick={() => setPrinting(null)} className="no-print mt-6 text-sm text-violet-600 hover:underline">
            Close preview
          </button>
        </div>
      )}
    </div>
  );
}
