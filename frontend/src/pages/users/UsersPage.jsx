import { useEffect, useState } from 'react';
import { listUsers, createUser, updateUser, deleteUser } from '../../services/users';
import PasswordInput from '../../components/PasswordInput';
import { listClasses, assignTeacher } from '../../services/classes';
import { listAvailablePermissions, listUserPermissions, setUserPermissions } from '../../services/permissions';
import { useAuth } from '../../hooks/useAuth';

const ALL_ROLES = ['owner', 'admin', 'teacher', 'staff', 'parent'];
const ELEVATED_ROLES = ['owner', 'admin'];
const CLASS_ASSIGNABLE_ROLES = ['teacher', 'staff'];

const emptyForm = { name: '', email: '', password: '', role: 'staff', phone: '', classId: '' };

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.role === 'owner';
  const assignableRoles = isOwner ? ALL_ROLES : ALL_ROLES.filter((r) => !ELEVATED_ROLES.includes(r));

  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [permissionsUserId, setPermissionsUserId] = useState('');
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState([]);

  async function load() {
    setIsLoading(true);
    try {
      setUsers(await listUsers());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    listClasses().then(setClasses).catch(() => {});
    listAvailablePermissions().then(setAvailablePermissions).catch(() => {});
  }, []);

  async function openPermissions(userId) {
    setError('');
    setPermissionsUserId(userId);
    try {
      setSelectedPermissionKeys(await listUserPermissions(userId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load permissions');
    }
  }

  function togglePermissionKey(key) {
    setSelectedPermissionKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleSavePermissions() {
    setError('');
    try {
      await setUserPermissions(permissionsUserId, selectedPermissionKeys);
      setInfo('Permissions updated.');
      setPermissionsUserId('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save permissions');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      let userId = editingId;
      if (editingId) {
        const payload = { name: form.name, phone: form.phone, role: form.role };
        if (form.password) payload.password = form.password;
        await updateUser(editingId, payload);
      } else {
        const created = await createUser(form);
        userId = created.id;
      }

      if (CLASS_ASSIGNABLE_ROLES.includes(form.role) && form.classId) {
        await assignTeacher(form.classId, userId);
        const className = classes.find((c) => c.id === form.classId)?.className;
        setInfo(`Assigned to ${className}.`);
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  }

  function startEdit(u) {
    setEditingId(u.id);
    setShowForm(true);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', classId: '' });
  }

  async function handleDelete(id) {
    if (!confirm('Delete this login? This cannot be undone.')) return;
    try {
      await deleteUser(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-800">User accounts / logins</h1>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setEditingId(null);
            setForm(emptyForm);
          }}
          className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? 'Close' : 'Add login'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
      {info && <div className="text-sm text-green-600 mb-4">{info}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-4 mb-6 grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input
              required
              type="email"
              disabled={!!editingId}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-full disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {editingId ? 'New password (leave blank to keep)' : 'Password'}
            </label>
            <PasswordInput
              required={!editingId}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value, classId: '' })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-full capitalize"
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-full"
            />
          </div>
          {CLASS_ASSIGNABLE_ROLES.includes(form.role) && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Assign to class {editingId && '(optional, adds a class)'}
              </label>
              <select
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
                className="border border-slate-300 rounded px-3 py-1.5 text-sm w-full"
              >
                <option value="">
                  {editingId ? 'No change' : 'No class (assign later)'}
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="col-span-3">
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
              {editingId ? 'Update login' : 'Create login'}
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
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const canManage = isOwner || !ELEVATED_ROLES.includes(u.role);
              return (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2 capitalize">{u.role}</td>
                  <td className="px-4 py-2">{u.phone || '-'}</td>
                  <td className="px-4 py-2 text-right space-x-3">
                    {canManage && u.id !== currentUser?.id && (
                      <>
                        {['teacher', 'staff'].includes(u.role) && (
                          <button onClick={() => openPermissions(u.id)} className="text-purple-600 hover:underline">
                            Permissions
                          </button>
                        )}
                        <button onClick={() => startEdit(u)} className="text-blue-600 hover:underline">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:underline">
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {permissionsUserId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Extra permissions</h2>
            <p className="text-xs text-slate-500 mb-3">
              Grants access beyond this user's role — e.g. letting a trusted teacher view fees.
            </p>
            <div className="space-y-2 mb-4">
              {availablePermissions.map((p) => (
                <label key={p.key} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedPermissionKeys.includes(p.key)}
                    onChange={() => togglePermissionKey(p.key)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSavePermissions}
                className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
              >
                Save
              </button>
              <button onClick={() => setPermissionsUserId('')} className="text-sm text-slate-500 hover:underline">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
