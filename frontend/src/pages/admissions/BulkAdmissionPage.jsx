import { useEffect, useState } from 'react';
import { bulkAdmitStudents } from '../../services/students';
import { listClasses } from '../../services/classes';

const emptyRow = () => ({
  name: '',
  gender: '',
  guardianName: '',
  fatherIdCard: '',
  guardianPhone: '',
  motherPhone: '',
  dateOfBirth: '',
  homeAddress: '',
  customFeeOverride: '',
  discountNotes: '',
});

const inputClass = 'border border-slate-300 rounded px-2 py-1 text-sm w-full';

export default function BulkAdmissionPage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [section, setSection] = useState('');
  const [rowCount, setRowCount] = useState(1);
  const [rows, setRows] = useState([emptyRow()]);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    listClasses().then(setClasses).catch(() => {});
  }, []);

  function setRowCountClamped(n) {
    const count = Math.max(1, Math.min(50, Number(n) || 1));
    setRowCount(count);
    setRows((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push(emptyRow());
      return next;
    });
  }

  function updateRow(i, field, value) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    const nonEmptyRows = rows.filter((r) => r.name.trim());
    if (!classId) {
      setError('Select a class');
      return;
    }
    if (nonEmptyRows.length === 0) {
      setError('Enter at least one student name');
      return;
    }
    try {
      const payload = {
        classId,
        section: section || undefined,
        students: nonEmptyRows.map((r) => ({
          ...r,
          customFeeOverride: r.customFeeOverride === '' ? null : Number(r.customFeeOverride),
          dateOfBirth: r.dateOfBirth || undefined,
        })),
      };
      const created = await bulkAdmitStudents(payload);
      setResult(created.length);
      setRows([emptyRow()]);
      setRowCount(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Bulk admission failed');
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-800 mb-4">Bulk Admission</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div
            className="px-4 py-2 text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
          >
            Class and Section Selection
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Class</label>
              <select
                required
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className={inputClass}
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Section</label>
              <input value={section} onChange={(e) => setSection(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Number of students</label>
              <input
                type="number"
                min="1"
                max="50"
                value={rowCount}
                onChange={(e) => setRowCountClamped(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <div
            className="px-4 py-2 text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
          >
            Student Details
          </div>
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Gender</th>
                <th className="px-2 py-2">Father name</th>
                <th className="px-2 py-2">Father CNIC</th>
                <th className="px-2 py-2">Father phone</th>
                <th className="px-2 py-2">Mother phone</th>
                <th className="px-2 py-2">Birthday</th>
                <th className="px-2 py-2">Home address</th>
                <th className="px-2 py-2">Monthly fee</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-2 py-2">
                    <input value={row.name} onChange={(e) => updateRow(i, 'name', e.target.value)} className={inputClass} />
                  </td>
                  <td className="px-2 py-2">
                    <select value={row.gender} onChange={(e) => updateRow(i, 'gender', e.target.value)} className={inputClass}>
                      <option value="">-</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.guardianName}
                      onChange={(e) => updateRow(i, 'guardianName', e.target.value)}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.fatherIdCard}
                      onChange={(e) => updateRow(i, 'fatherIdCard', e.target.value)}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.guardianPhone}
                      onChange={(e) => updateRow(i, 'guardianPhone', e.target.value)}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.motherPhone}
                      onChange={(e) => updateRow(i, 'motherPhone', e.target.value)}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={row.dateOfBirth}
                      onChange={(e) => updateRow(i, 'dateOfBirth', e.target.value)}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.homeAddress}
                      onChange={(e) => updateRow(i, 'homeAddress', e.target.value)}
                      className={inputClass}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      value={row.customFeeOverride}
                      onChange={(e) => updateRow(i, 'customFeeOverride', e.target.value)}
                      className={inputClass}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {result !== null && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
            Admitted {result} student{result === 1 ? '' : 's'} successfully.
          </div>
        )}

        <button
          type="submit"
          className="text-white rounded px-4 py-2 text-sm font-medium"
          style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
        >
          Import all student data
        </button>
      </form>
    </div>
  );
}
