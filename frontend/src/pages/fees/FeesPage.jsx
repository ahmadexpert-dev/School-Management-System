import { useEffect, useState } from 'react';
import { listFeeRecords, generateMonthlyFees, updateFeeRecord } from '../../services/fees';
import { listClasses } from '../../services/classes';
import { useAuth } from '../../hooks/useAuth';
import { compareClassNames } from '../../utils/classOrder';

const STATUS_OPTIONS = ['unpaid', 'partial', 'paid'];

export default function FeesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'owner' || user?.role === 'admin';

  const [feeRecords, setFeeRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genMonth, setGenMonth] = useState('');
  const [genDueDate, setGenDueDate] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const params = {};
      if (monthFilter) params.month = monthFilter;
      if (classFilter) params.classId = classFilter;
      if (statusFilter) params.status = statusFilter;
      setFeeRecords(await listFeeRecords(Object.keys(params).length ? params : undefined));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load fee records');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (canEdit) listClasses().then(setClasses).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter, classFilter, statusFilter]);

  async function handleGenerate(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      const result = await generateMonthlyFees({ month: genMonth, dueDate: genDueDate });
      setInfo(`Generated ${result.createdCount} fee record(s) for ${genMonth}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed');
    }
  }

  async function handleStatusChange(record, status) {
    try {
      await updateFeeRecord(record.id, {
        status,
        amountPaid: status === 'paid' ? record.amountDue : record.amountPaid,
        paidDate: status === 'paid' ? new Date().toISOString() : record.paidDate,
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    }
  }

  async function handleAmountPaidChange(record, amountPaid) {
    try {
      await updateFeeRecord(record.id, { amountPaid: Number(amountPaid) });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    }
  }

  // Group fee records by class for a class-wise view, with a subtotal per class.
  const groups = [];
  const groupsByClassId = new Map();
  for (const r of feeRecords) {
    const key = r.student?.classId || 'unknown';
    if (!groupsByClassId.has(key)) {
      const group = { classId: key, className: r.student?.class?.className || 'Unassigned', records: [] };
      groupsByClassId.set(key, group);
      groups.push(group);
    }
    groupsByClassId.get(key).records.push(r);
  }
  groups.sort((a, b) => compareClassNames(a.className, b.className));

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-800 mb-4">Fees</h1>

      {canEdit && (
        <form onSubmit={handleGenerate} className="bg-white rounded-lg border border-slate-200 p-4 mb-4 flex gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Generate for month</label>
            <input
              required
              type="month"
              value={genMonth}
              onChange={(e) => setGenMonth(e.target.value)}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Due date</label>
            <input
              required
              type="date"
              value={genDueDate}
              onChange={(e) => setGenDueDate(e.target.value)}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
            Generate fee records
          </button>
        </form>
      )}

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Filter by month</label>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Filter by class</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Filter by status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm capitalize"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
      {info && <div className="text-sm text-green-600 mb-4">{info}</div>}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-6 text-center text-slate-400 text-sm">
          No fee records found.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const totalDue = group.records.reduce((sum, r) => sum + Number(r.amountDue), 0);
            const totalPaid = group.records.reduce((sum, r) => sum + Number(r.amountPaid), 0);
            return (
              <div key={group.classId}>
                <h2 className="text-sm font-semibold text-slate-700 mb-2">
                  {group.className}{' '}
                  <span className="text-slate-400 font-normal">
                    ({group.records.length} record{group.records.length !== 1 ? 's' : ''} — Rs. {totalPaid} / {totalDue} collected)
                  </span>
                </h2>
                <table className="w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <thead className="bg-slate-100 text-slate-600 text-left">
                    <tr>
                      <th className="px-4 py-2">Student</th>
                      <th className="px-4 py-2">Month</th>
                      <th className="px-4 py-2">Amount due</th>
                      <th className="px-4 py-2">Amount paid</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Due date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.records.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="px-4 py-2">{r.student?.name}</td>
                        <td className="px-4 py-2">{r.month}</td>
                        <td className="px-4 py-2">Rs. {r.amountDue}</td>
                        <td className="px-4 py-2">
                          {canEdit ? (
                            <input
                              type="number"
                              min="0"
                              defaultValue={r.amountPaid}
                              onBlur={(e) => handleAmountPaidChange(r, e.target.value)}
                              className="border border-slate-300 rounded px-2 py-1 text-sm w-24"
                            />
                          ) : (
                            `Rs. ${r.amountPaid}`
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {canEdit ? (
                            <select
                              value={r.status}
                              onChange={(e) => handleStatusChange(r, e.target.value)}
                              className="border border-slate-300 rounded px-2 py-1 text-sm capitalize"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="capitalize">{r.status}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">{r.dueDate?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
