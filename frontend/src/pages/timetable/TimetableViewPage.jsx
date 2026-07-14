import { useEffect, useState } from 'react';
import { listClasses } from '../../services/classes';
import { listTimetable, listClassSections } from '../../services/timetable';
import { useAuth } from '../../hooks/useAuth';
import TimetableGrid, { DAYS } from '../../components/TimetableGrid';
import { downloadCSV, downloadPDF } from '../../utils/exportTable';

const EXPORT_COLUMNS = [
  { key: 'day', label: 'Day' },
  { key: 'startTime', label: 'Start' },
  { key: 'endTime', label: 'End' },
  { key: 'subject', label: 'Subject' },
  { key: 'teacher', label: 'Teacher' },
];

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-24 h-24 mb-4 text-slate-300">
        <rect x="2.5" y="4" width="15" height="11" rx="1" />
        <path d="M6 15v3M14 15v3M4 18h12" />
        <circle cx="18" cy="16" r="4.5" />
        <path d="m21 19 2 2" />
      </svg>
      <p className="text-sm font-medium">No Data Filtered...!</p>
    </div>
  );
}

export default function TimetableViewPage() {
  const { user } = useAuth();
  const canPickClass = ['owner', 'admin'].includes(user?.role);

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [sections, setSections] = useState([]);
  const [section, setSection] = useState('');
  const [entries, setEntries] = useState([]);
  const [hasFiltered, setHasFiltered] = useState(false);
  const [error, setError] = useState('');
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    if (canPickClass) {
      listClasses().then(setClasses).catch(() => {});
    } else {
      refresh();
      setHasFiltered(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (classId) {
      listClassSections(classId).then(setSections).catch(() => setSections([]));
    } else {
      setSections([]);
    }
    setSection('');
  }, [classId]);

  async function refresh() {
    setError('');
    try {
      setEntries(await listTimetable(classId ? { classId, section: section || undefined } : undefined));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load timetable');
    }
  }

  async function handleFilter() {
    await refresh();
    setHasFiltered(true);
  }

  const exportRows = entries.map((e) => ({
    day: DAYS[e.dayOfWeek],
    startTime: e.startTime,
    endTime: e.endTime,
    subject: e.subject,
    teacher: e.teacher?.name || '',
  }));

  function handlePrint() {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 50);
  }

  const fieldClass = 'border border-slate-300 rounded px-3 py-1.5 text-sm w-full';

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-slate-800">Timetable</h1>
        {hasFiltered && entries.length > 0 && (
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={() => downloadCSV('timetable.csv', EXPORT_COLUMNS, exportRows)}
              className="text-xs font-medium rounded px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600"
            >
              CSV
            </button>
            <button
              onClick={() => downloadPDF('timetable.pdf', 'Timetable', EXPORT_COLUMNS, exportRows)}
              className="text-xs font-medium rounded px-3 py-1.5 bg-rose-500 text-white hover:bg-rose-600"
            >
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="text-xs font-medium rounded px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700"
            >
              Print
            </button>
          </div>
        )}
      </div>

      {canPickClass && (
        <div className="rounded-lg overflow-hidden border border-slate-200 mb-6 no-print">
          <div
            className="px-4 py-2.5 text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
          >
            Timetable Management
          </div>
          <div className="bg-slate-50 p-4 flex items-end gap-3 flex-wrap">
            <div className="w-48">
              <label className="block text-xs font-medium text-slate-600 mb-1">Campus</label>
              <select value="main" disabled className={fieldClass}>
                <option value="main">Main Campus</option>
              </select>
            </div>
            <div className="w-48">
              <label className="block text-xs font-medium text-slate-600 mb-1">Class</label>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className={fieldClass}>
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-48">
              <label className="block text-xs font-medium text-slate-600 mb-1">Section</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                disabled={!classId}
                className={fieldClass}
              >
                <option value="">{classId ? 'All sections' : 'Select Class First'}</option>
                {sections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleFilter}
              disabled={!classId}
              className="text-white rounded px-4 py-1.5 text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, #ea580c, #f97316)' }}
            >
              Filter Data
            </button>
          </div>
        </div>
      )}

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {!hasFiltered ? (
        <EmptyState />
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : (
        <TimetableGrid entries={entries} editable={false} />
      )}

      {printMode && (
        <div id="result-card-print" className="p-8">
          <h2 className="text-lg font-bold mb-4">Timetable</h2>
          <TimetableGrid entries={entries} editable={false} />
        </div>
      )}
    </div>
  );
}
