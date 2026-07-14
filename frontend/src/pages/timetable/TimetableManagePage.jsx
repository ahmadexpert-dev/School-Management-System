import { useEffect, useState } from 'react';
import { listClasses } from '../../services/classes';
import { listUsers } from '../../services/users';
import {
  listTimetable,
  listClassSections,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
} from '../../services/timetable';
import TimetableGrid, { DAYS } from '../../components/TimetableGrid';
import TimeOfDaySelect from '../../components/TimeOfDaySelect';
import { downloadCSV, downloadPDF } from '../../utils/exportTable';

const emptyForm = { classId: '', section: '', subject: '', dayOfWeek: '0', startTime: '', endTime: '', teacherId: '' };

const EXPORT_COLUMNS = [
  { key: 'day', label: 'Day' },
  { key: 'startTime', label: 'Start' },
  { key: 'endTime', label: 'End' },
  { key: 'subject', label: 'Subject' },
  { key: 'teacher', label: 'Teacher' },
];

const fieldClass = 'border border-slate-300 rounded px-3 py-1.5 text-sm w-full';

export default function TimetableManagePage() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');

  const [viewClassId, setViewClassId] = useState('');
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    listClasses().then(setClasses).catch(() => {});
    listUsers()
      .then((users) => setTeachers(users.filter((u) => ['teacher', 'staff'].includes(u.role))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (form.classId) {
      listClassSections(form.classId).then(setSections).catch(() => setSections([]));
    } else {
      setSections([]);
    }
  }, [form.classId]);

  useEffect(() => {
    if (viewClassId) refresh(viewClassId);
    else setEntries([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewClassId]);

  async function refresh(classId) {
    setError('');
    try {
      setEntries(await listTimetable({ classId }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load timetable');
    }
  }

  // The subjects already used anywhere in this school's timetable, offered
  // as quick-pick suggestions — there's no separate Subject catalog model,
  // so this reuses real data instead of inventing one.
  const knownSubjects = [...new Set(entries.map((e) => e.subject))].sort();

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      const payload = {
        classId: form.classId,
        section: form.section || undefined,
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
        subject: form.subject,
        teacherId: form.teacherId || undefined,
      };
      if (editingId) {
        await updateTimetableEntry(editingId, payload);
      } else {
        await createTimetableEntry(payload);
      }
      const savedClassId = form.classId;
      setForm(emptyForm);
      setEditingId(null);
      if (savedClassId === viewClassId) await refresh(savedClassId);
      else setViewClassId(savedClassId);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Save failed');
    }
  }

  function startEdit(entry) {
    setEditingId(entry.id);
    setForm({
      classId: entry.classId,
      section: entry.section || '',
      subject: entry.subject,
      dayOfWeek: String(entry.dayOfWeek),
      startTime: entry.startTime,
      endTime: entry.endTime,
      teacherId: entry.teacherId || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id) {
    if (!confirm('Delete this timetable entry?')) return;
    try {
      await deleteTimetableEntry(id);
      await refresh(viewClassId);
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
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

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-800 mb-4">Manage Timetable</h1>

      <div className="rounded-lg overflow-hidden border border-slate-200 mb-8 no-print">
        <div
          className="px-4 py-2.5 text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
        >
          {editingId ? 'Edit Timetable Entry' : 'Add Timetable'}
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-6 space-y-5 max-w-xl">
          {formError && <div className="text-sm text-red-600">{formError}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            <select
              required
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value, section: '' })}
              className={fieldClass}
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
            <select
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              disabled={!form.classId}
              className={fieldClass}
            >
              <option value="">{form.classId ? 'All sections' : 'Select a class first'}</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <input
              required
              list="timetable-subjects"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="e.g. Mathematics"
              className={fieldClass}
            />
            <datalist id="timetable-subjects">
              {knownSubjects.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Day</label>
            <select
              value={form.dayOfWeek}
              onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
              className={fieldClass}
            >
              {DAYS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Starting Time</label>
            <TimeOfDaySelect required value={form.startTime} onChange={(v) => setForm({ ...form, startTime: v })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ending Time</label>
            <TimeOfDaySelect required value={form.endTime} onChange={(v) => setForm({ ...form, endTime: v })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teacher (optional)</label>
            <select
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              className={fieldClass}
            >
              <option value="">None</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="text-white rounded px-5 py-2 text-sm font-medium"
              style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
            >
              {editingId ? 'Update Timetable' : 'Add Timetable'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="text-sm text-slate-500 hover:underline"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h2 className="text-base font-semibold text-slate-800">View / edit existing periods</h2>
        <div className="flex items-center gap-2 no-print">
          {entries.length > 0 && (
            <>
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
            </>
          )}
        </div>
      </div>

      <div className="mb-4 no-print">
        <label className="block text-xs font-medium text-slate-600 mb-1">Class</label>
        <select
          value={viewClassId}
          onChange={(e) => setViewClassId(e.target.value)}
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

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {viewClassId ? (
        <TimetableGrid entries={entries} editable onEdit={startEdit} onDelete={handleDelete} />
      ) : (
        <p className="text-sm text-slate-400">Select a class to view its timetable.</p>
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
