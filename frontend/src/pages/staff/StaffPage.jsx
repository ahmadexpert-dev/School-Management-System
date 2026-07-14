import { useEffect, useRef, useState } from 'react';
import {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  uploadStaffPhoto,
  staffPhotoUrl,
  getStaffStats,
} from '../../services/staff';
import { listDepartments } from '../../services/departments';
import TableToolbar from '../../components/TableToolbar';
import { downloadCSV, downloadExcel, downloadPDF } from '../../utils/exportTable';

const emptyForm = {
  name: '',
  role: '',
  subject: '',
  phone: '',
  email: '',
  salary: '',
  joiningDate: '',
  departmentId: '',
};

const GRADIENTS = {
  total: ['#4338ca', '#6366f1'],
  active: ['#5b21b6', '#8b5cf6'],
  deactivated: ['#86198f', '#e879f9'],
  departments: ['#7c3aed', '#a78bfa'],
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

const inputClass = 'border border-slate-300 rounded px-3 py-1.5 text-sm w-full';

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingPhotoUrl, setEditingPhotoUrl] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const formRef = useRef(null);

  async function loadAll() {
    setIsLoading(true);
    try {
      const [staffList, deptList, statsData] = await Promise.all([listStaff(), listDepartments(), getStaffStats()]);
      setStaff(staffList);
      setDepartments(deptList);
      setStats(statsData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load staff');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (showForm) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showForm, editingId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, salary: Number(form.salary) };
      if (!payload.email) delete payload.email;
      if (!payload.departmentId) delete payload.departmentId;

      let record;
      if (editingId) {
        record = await updateStaff(editingId, payload);
      } else {
        record = await createStaff(payload);
      }
      if (photoFile && record?.id) {
        await uploadStaffPhoto(record.id, photoFile);
      }
      setForm(emptyForm);
      setPhotoFile(null);
      setEditingId(null);
      setEditingPhotoUrl(null);
      setShowForm(false);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  }

  function startEdit(s) {
    setEditingId(s.id);
    setEditingPhotoUrl(s.photoUrl || null);
    setPhotoFile(null);
    setShowForm(true);
    setForm({
      name: s.name,
      role: s.role,
      subject: s.subject || '',
      phone: s.phone || '',
      email: s.email || '',
      salary: String(s.salary),
      joiningDate: s.joiningDate?.slice(0, 10) || '',
      departmentId: s.departmentId || '',
    });
  }

  async function handleDelete(id) {
    if (!confirm('Delete this staff member?')) return;
    try {
      await deleteStaff(id);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  }

  async function handleToggleStatus(s) {
    try {
      await updateStaff(s.id, { status: s.status === 'inactive' ? 'active' : 'inactive' });
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    }
  }

  const visibleStaff = staff.filter((s) => {
    const isInactive = s.status === 'inactive';
    if (showDeactivated ? !isInactive : isInactive) return false;
    if (departmentFilter && s.departmentId !== departmentFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.employeeCode?.toLowerCase().includes(q) ||
      s.role?.toLowerCase().includes(q)
    );
  });

  const EXPORT_COLUMNS = [
    { key: 'employeeCode', label: 'Emp Code' },
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Designation' },
    { key: 'departmentName', label: 'Department' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'salary', label: 'Salary' },
    { key: 'status', label: 'Status' },
  ];
  const exportRows = visibleStaff.map((s) => ({
    employeeCode: s.employeeCode || '',
    name: s.name,
    role: s.role,
    departmentName: s.department?.name || '',
    email: s.email || '',
    phone: s.phone || '',
    salary: String(s.salary),
    status: s.status || 'active',
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-800">Staff</h1>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setEditingId(null);
            setEditingPhotoUrl(null);
            setPhotoFile(null);
            setForm(emptyForm);
          }}
          className="text-white rounded px-4 py-1.5 text-sm font-medium"
          style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
        >
          {showForm ? 'Close' : 'Add New Staff'}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatTile label="Total Staff" value={stats.totalStaff} gradient={GRADIENTS.total} />
          <StatTile label="Active" value={stats.activeStaff} gradient={GRADIENTS.active} />
          <StatTile label="Deactivated" value={stats.deactivatedStaff} gradient={GRADIENTS.deactivated} />
          <StatTile label="Departments" value={stats.totalDepartments} gradient={GRADIENTS.departments} />
        </div>
      )}

      <TableToolbar
        title="Manage Staff Accounts"
        showDeactivated={showDeactivated}
        onToggleDeactivated={() => setShowDeactivated((v) => !v)}
        filterValue={departmentFilter}
        onFilterChange={setDepartmentFilter}
        filterOptions={departments.map((d) => ({ value: d.id, label: d.name }))}
        filterAllLabel="All Departments"
        search={search}
        onSearchChange={setSearch}
        onExportCSV={() => downloadCSV('staff.csv', EXPORT_COLUMNS, exportRows)}
        onExportExcel={() => downloadExcel('staff.xlsx', EXPORT_COLUMNS, exportRows)}
        onExportPDF={() => downloadPDF('staff.pdf', 'Staff', EXPORT_COLUMNS, exportRows)}
        onPrint={handlePrint}
      />

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {showForm && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="bg-white rounded-lg border border-slate-200 p-4 mb-6 grid grid-cols-3 gap-3 scroll-mt-4"
        >
          <div className="col-span-3 flex items-center gap-4 mb-1">
            <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              {photoFile ? (
                <img src={URL.createObjectURL(photoFile)} alt="" className="w-full h-full object-cover" />
              ) : editingPhotoUrl ? (
                <img src={staffPhotoUrl(editingPhotoUrl)} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-slate-400">Photo</span>
              )}
            </div>
            <div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">JPEG/PNG/WEBP, up to 3MB</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Designation</label>
            <input
              required
              placeholder="e.g. teacher, accountant"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              className={inputClass}
            >
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Subject (if teacher)</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Salary (Rs.)</label>
            <input
              required
              type="number"
              min="0"
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Joining date</label>
            <input
              required
              type="date"
              value={form.joiningDate}
              onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="col-span-3">
            <button
              type="submit"
              className="text-white rounded px-4 py-1.5 text-sm font-medium"
              style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
            >
              {editingId ? 'Update staff' : 'Save staff'}
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
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2">Emp Code</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Designation</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Salary</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visibleStaff.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center">
                    {s.photoUrl ? (
                      <img src={staffPhotoUrl(s.photoUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-slate-400">{s.name?.[0]}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-500">{s.employeeCode || '-'}</td>
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2">{s.role}</td>
                <td className="px-4 py-2">{s.department?.name || '-'}</td>
                <td className="px-4 py-2">{s.email || '-'}</td>
                <td className="px-4 py-2">{s.phone || '-'}</td>
                <td className="px-4 py-2">Rs. {s.salary}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleToggleStatus(s)}
                    className={`text-xs font-medium rounded px-2 py-0.5 ${
                      s.status === 'inactive' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {s.status === 'inactive' ? 'Deactivated' : 'Active'}
                  </button>
                </td>
                <td className="px-4 py-2 text-right space-x-3">
                  <button onClick={() => startEdit(s)} className="text-violet-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {visibleStaff.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                  No staff members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {printMode && (
        <div id="result-card-print" className="p-8">
          <h2 className="text-lg font-bold mb-4">Staff {showDeactivated ? '(Deactivated)' : '(Active)'}</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 text-left">
                {EXPORT_COLUMNS.map((c) => (
                  <th key={c.key} className="py-1 pr-3">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exportRows.map((row, i) => (
                <tr key={i} className="border-b border-slate-200">
                  {EXPORT_COLUMNS.map((c) => (
                    <td key={c.key} className="py-1 pr-3">
                      {row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
