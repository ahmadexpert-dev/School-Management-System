import { useEffect, useState } from 'react';
import { listNotices, createNotice, deleteNotice } from '../../services/notices';
import { useAuth } from '../../hooks/useAuth';

const AUDIENCE_ROLES = ['teacher', 'staff', 'parent'];
const emptyForm = { title: '', content: '', audienceRoles: [] };

export default function NoticesPage() {
  const { user } = useAuth();
  const canManage = ['owner', 'admin'].includes(user?.role);

  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      setNotices(await listNotices());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load notices');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleAudienceRole(role) {
    setForm((prev) => ({
      ...prev,
      audienceRoles: prev.audienceRoles.includes(role)
        ? prev.audienceRoles.filter((r) => r !== role)
        : [...prev.audienceRoles, role],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await createNotice(form);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post notice');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this notice?')) return;
    try {
      await deleteNotice(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-800">School Noticeboard</h1>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
          >
            {showForm ? 'Close' : 'Post notice'}
          </button>
        )}
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-4 mb-6 space-y-3">
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
            <label className="block text-xs font-medium text-slate-600 mb-1">Content</label>
            <textarea
              required
              rows={3}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Visible to (leave all unchecked for everyone)
            </label>
            <div className="flex gap-4">
              {AUDIENCE_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-1.5 text-sm text-slate-700 capitalize">
                  <input
                    type="checkbox"
                    checked={form.audienceRoles.includes(role)}
                    onChange={() => toggleAudienceRole(role)}
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
            Post
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-6 text-center text-slate-400 text-sm">
          No notices yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <div key={n.id} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <h2 className="text-sm font-semibold text-slate-800">{n.title}</h2>
                {canManage && (
                  <button onClick={() => handleDelete(n.id)} className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{n.content}</p>
              <p className="text-xs text-slate-400 mt-2">
                Posted by {n.postedBy?.name} · {new Date(n.createdAt).toLocaleDateString()}
                {n.audienceRoles?.length > 0 && ` · Visible to: ${n.audienceRoles.join(', ')}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
