import { useEffect, useState } from 'react';
import { listLeaveRequests, createLeaveRequest, reviewLeaveRequest, deleteLeaveRequest } from '../../services/leave';
import { useAuth } from '../../hooks/useAuth';

const emptyForm = { fromDate: '', toDate: '', reason: '' };

const STATUS_STYLES = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

export default function LeavePage() {
  const { user } = useAuth();
  const isManager = ['owner', 'admin'].includes(user?.role);

  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      setRequests(await listLeaveRequests());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load leave requests');
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
      await createLeaveRequest(form);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request');
    }
  }

  async function handleReview(id, status) {
    setError('');
    try {
      await reviewLeaveRequest(id, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update request');
    }
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await deleteLeaveRequest(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel request');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-800">Leave Management</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? 'Close' : 'Request leave'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-4 mb-6 flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input
              required
              type="date"
              value={form.fromDate}
              onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input
              required
              type="date"
              value={form.toDate}
              onChange={(e) => setForm({ ...form, toDate: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
            <input
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-full"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
            Submit
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : (
        <table className="w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              {isManager && <th className="px-4 py-2">Staff</th>}
              <th className="px-4 py-2">From</th>
              <th className="px-4 py-2">To</th>
              <th className="px-4 py-2">Reason</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                {isManager && <td className="px-4 py-2">{r.user?.name}</td>}
                <td className="px-4 py-2">{r.fromDate?.slice(0, 10)}</td>
                <td className="px-4 py-2">{r.toDate?.slice(0, 10)}</td>
                <td className="px-4 py-2">{r.reason}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs capitalize ${STATUS_STYLES[r.status]}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-3">
                  {isManager && r.status === 'pending' && (
                    <>
                      <button onClick={() => handleReview(r.id, 'approved')} className="text-green-600 hover:underline">
                        Approve
                      </button>
                      <button onClick={() => handleReview(r.id, 'rejected')} className="text-red-600 hover:underline">
                        Reject
                      </button>
                    </>
                  )}
                  {!isManager && r.status === 'pending' && (
                    <button onClick={() => handleCancel(r.id)} className="text-red-600 hover:underline">
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={isManager ? 6 : 5} className="px-4 py-6 text-center text-slate-400">
                  No leave requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
