import { useEffect, useState } from 'react';
import { listEvents, createEvent, updateEvent, deleteEvent } from '../../services/calendar';
import { useAuth } from '../../hooks/useAuth';

const emptyForm = { title: '', description: '', date: '', endDate: '', type: 'event' };

export default function CalendarPage() {
  const { user } = useAuth();
  const canManage = ['owner', 'admin'].includes(user?.role);

  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      setEvents(await listEvents());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load calendar');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, endDate: form.endDate || undefined };
      if (editingId) {
        await updateEvent(editingId, payload);
      } else {
        await createEvent(payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  }

  function startEdit(ev) {
    setEditingId(ev.id);
    setShowForm(true);
    setForm({
      title: ev.title,
      description: ev.description || '',
      date: ev.date?.slice(0, 10),
      endDate: ev.endDate?.slice(0, 10) || '',
      type: ev.type,
    });
  }

  async function handleDelete(id) {
    if (!confirm('Delete this calendar entry?')) return;
    try {
      await deleteEvent(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-800">Academic Calendar</h1>
        {canManage && (
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setEditingId(null);
              setForm(emptyForm);
            }}
            className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
          >
            {showForm ? 'Close' : 'Add entry'}
          </button>
        )}
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-4 mb-6 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-full"
            >
              <option value="event">Event</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">End date (optional, for multi-day)</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-full"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-full"
              rows={2}
            />
          </div>
          <div className="col-span-2">
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
              {editingId ? 'Update entry' : 'Add entry'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : (
        <table className="w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Description</th>
              {canManage && <th className="px-4 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  {ev.date?.slice(0, 10)}
                  {ev.endDate && ` – ${ev.endDate.slice(0, 10)}`}
                </td>
                <td className="px-4 py-2">{ev.title}</td>
                <td className="px-4 py-2 capitalize">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      ev.type === 'holiday' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {ev.type}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500">{ev.description || '-'}</td>
                {canManage && (
                  <td className="px-4 py-2 text-right space-x-3">
                    <button onClick={() => startEdit(ev)} className="text-blue-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(ev.id)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-6 text-center text-slate-400">
                  No calendar entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
