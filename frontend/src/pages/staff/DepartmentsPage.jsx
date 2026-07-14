import { useEffect, useState } from 'react';
import { listDepartments, createDepartment, updateDepartment, deleteDepartment } from '../../services/departments';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      setDepartments(await listDepartments());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load departments');
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
      if (editingId) {
        await updateDepartment(editingId, { name });
      } else {
        await createDepartment({ name });
      }
      setName('');
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  }

  function startEdit(d) {
    setEditingId(d.id);
    setName(d.name);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this department? Staff in it will become unassigned.')) return;
    try {
      await deleteDepartment(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-800 mb-4">Departments</h1>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="flex items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Department name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm w-64"
          />
        </div>
        <button
          type="submit"
          className="text-white rounded px-4 py-1.5 text-sm font-medium"
          style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
        >
          {editingId ? 'Update' : 'Add department'}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setName('');
            }}
            className="text-sm text-slate-500 hover:underline"
          >
            Cancel
          </button>
        )}
      </form>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : (
        <table className="w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Staff count</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{d.name}</td>
                <td className="px-4 py-2">{d._count?.staff ?? 0}</td>
                <td className="px-4 py-2 text-right space-x-3">
                  <button onClick={() => startEdit(d)} className="text-violet-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  No departments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
