import { Fragment, useEffect, useState } from 'react';
import { listClasses, createClass, updateClass, deleteClass, getClass, assignTeacher, unassignTeacher } from '../../services/classes';
import { listUsers } from '../../services/users';
import { listStudents, promoteStudents } from '../../services/students';

const emptyForm = { className: '', standardFee: '' };

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [teacherStaffUsers, setTeacherStaffUsers] = useState([]);
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [expandedClassDetail, setExpandedClassDetail] = useState(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [teacherError, setTeacherError] = useState('');

  const [showPromote, setShowPromote] = useState(false);
  const [fromClassId, setFromClassId] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [promoteStudentsList, setPromoteStudentsList] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [promoteInfo, setPromoteInfo] = useState('');
  const [promoteError, setPromoteError] = useState('');

  async function load() {
    setIsLoading(true);
    try {
      setClasses(await listClasses());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    listUsers()
      .then((users) => setTeacherStaffUsers(users.filter((u) => u.role === 'teacher' || u.role === 'staff')))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { className: form.className, standardFee: Number(form.standardFee) };
      if (editingId) {
        await updateClass(editingId, payload);
      } else {
        await createClass(payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  }

  function startEdit(cls) {
    setEditingId(cls.id);
    setForm({ className: cls.className, standardFee: String(cls.standardFee) });
  }

  async function handleDelete(id) {
    if (!confirm('Delete this class?')) return;
    try {
      await deleteClass(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  }

  async function toggleTeachers(classId) {
    if (expandedClassId === classId) {
      setExpandedClassId(null);
      setExpandedClassDetail(null);
      return;
    }
    setExpandedClassId(classId);
    setTeacherError('');
    setAssignUserId('');
    try {
      setExpandedClassDetail(await getClass(classId));
    } catch (err) {
      setTeacherError(err.response?.data?.error || 'Failed to load teachers');
    }
  }

  async function handleAssign(classId) {
    if (!assignUserId) return;
    setTeacherError('');
    try {
      await assignTeacher(classId, assignUserId);
      setExpandedClassDetail(await getClass(classId));
      setAssignUserId('');
    } catch (err) {
      setTeacherError(err.response?.data?.error || 'Failed to assign');
    }
  }

  async function handleUnassign(classId, teacherId) {
    setTeacherError('');
    try {
      await unassignTeacher(classId, teacherId);
      setExpandedClassDetail(await getClass(classId));
    } catch (err) {
      setTeacherError(err.response?.data?.error || 'Failed to unassign');
    }
  }

  async function handleFromClassChange(classId) {
    setFromClassId(classId);
    setPromoteInfo('');
    setPromoteError('');
    if (!classId) {
      setPromoteStudentsList([]);
      setSelectedStudentIds([]);
      return;
    }
    try {
      const list = await listStudents({ classId });
      setPromoteStudentsList(list);
      setSelectedStudentIds(list.map((s) => s.id));
    } catch (err) {
      setPromoteError(err.response?.data?.error || 'Failed to load students');
    }
  }

  function toggleStudentSelected(id) {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function handlePromote(e) {
    e.preventDefault();
    setPromoteError('');
    setPromoteInfo('');
    try {
      const result = await promoteStudents({ fromClassId, toClassId, studentIds: selectedStudentIds });
      setPromoteInfo(`Promoted ${result.promotedCount} student(s).`);
      await handleFromClassChange(fromClassId);
      await load();
    } catch (err) {
      setPromoteError(err.response?.data?.error || 'Promotion failed');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-800">Classes</h1>
        <button
          onClick={() => setShowPromote((v) => !v)}
          className="bg-slate-800 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-slate-900"
        >
          {showPromote ? 'Close promotion' : 'Promote students'}
        </button>
      </div>

      {showPromote && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Promote students to next class</h2>
          {promoteError && <div className="text-sm text-red-600 mb-3">{promoteError}</div>}
          {promoteInfo && <div className="text-sm text-green-600 mb-3">{promoteInfo}</div>}
          <form onSubmit={handlePromote}>
            <div className="flex gap-3 items-end mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">From class</label>
                <select
                  required
                  value={fromClassId}
                  onChange={(e) => handleFromClassChange(e.target.value)}
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
                <label className="block text-xs font-medium text-slate-600 mb-1">To class</label>
                <select
                  required
                  value={toClassId}
                  onChange={(e) => setToClassId(e.target.value)}
                  className="border border-slate-300 rounded px-3 py-1.5 text-sm"
                >
                  <option value="">Select class</option>
                  {classes
                    .filter((c) => c.id !== fromClassId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.className}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {promoteStudentsList.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2">
                  Uncheck any student who should repeat this class instead of being promoted.
                </p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {promoteStudentsList.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm border-t border-slate-100 pt-1.5 first:border-0">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => toggleStudentSelected(s.id)}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {promoteStudentsList.length > 0 && (
              <button
                type="submit"
                disabled={!toClassId || selectedStudentIds.length === 0}
                className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Promote {selectedStudentIds.length} student(s)
              </button>
            )}
          </form>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-4 mb-6 flex gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Class name</label>
          <input
            required
            value={form.className}
            onChange={(e) => setForm({ ...form, className: e.target.value })}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Standard fee (Rs.)</label>
          <input
            required
            type="number"
            min="0"
            value={form.standardFee}
            onChange={(e) => setForm({ ...form, standardFee: e.target.value })}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm w-32"
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
          {editingId ? 'Update' : 'Add class'}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
            }}
            className="text-sm text-slate-500"
          >
            Cancel
          </button>
        )}
      </form>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : (
        <table className="w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Standard fee</th>
              <th className="px-4 py-2"># Students</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => (
              <Fragment key={cls.id}>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-2">{cls.className}</td>
                  <td className="px-4 py-2">Rs. {cls.standardFee}</td>
                  <td className="px-4 py-2">{cls._count?.students ?? 0}</td>
                  <td className="px-4 py-2 text-right space-x-3">
                    <button onClick={() => toggleTeachers(cls.id)} className="text-slate-600 hover:underline">
                      {expandedClassId === cls.id ? 'Hide teachers' : 'Manage teachers'}
                    </button>
                    <button onClick={() => startEdit(cls)} className="text-blue-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(cls.id)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
                {expandedClassId === cls.id && (
                  <tr className="border-t border-slate-100 bg-slate-50">
                    <td colSpan={4} className="px-4 py-4">
                      {teacherError && <div className="text-sm text-red-600 mb-2">{teacherError}</div>}

                      {!expandedClassDetail ? (
                        <p className="text-slate-400 text-sm">Loading...</p>
                      ) : (
                        <>
                          <div className="mb-3">
                            <div className="text-xs font-medium text-slate-600 mb-1">Assigned teachers / staff</div>
                            {expandedClassDetail.teachers.length === 0 ? (
                              <p className="text-sm text-slate-400">None assigned yet.</p>
                            ) : (
                              <ul className="space-y-1">
                                {expandedClassDetail.teachers.map((t) => (
                                  <li key={t.id} className="flex items-center justify-between text-sm bg-white border border-slate-200 rounded px-3 py-1.5">
                                    <span>
                                      {t.teacher.name} <span className="text-slate-400 capitalize">({t.teacher.role})</span>
                                    </span>
                                    <button
                                      onClick={() => handleUnassign(cls.id, t.teacher.id)}
                                      className="text-red-600 hover:underline text-xs"
                                    >
                                      Unassign
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="flex items-end gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Assign teacher/staff</label>
                              <select
                                value={assignUserId}
                                onChange={(e) => setAssignUserId(e.target.value)}
                                className="border border-slate-300 rounded px-3 py-1.5 text-sm"
                              >
                                <option value="">Select user</option>
                                {teacherStaffUsers
                                  .filter((u) => !expandedClassDetail.teachers.some((t) => t.teacher.id === u.id))
                                  .map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.name} ({u.role})
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <button
                              onClick={() => handleAssign(cls.id)}
                              className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
                            >
                              Assign
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {classes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No classes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
