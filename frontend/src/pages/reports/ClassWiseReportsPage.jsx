import { useEffect, useState } from 'react';
import { getClassWiseReport } from '../../services/reports';

const GRADIENTS = {
  students: ['#4338ca', '#6366f1'],
  staff: ['#5b21b6', '#8b5cf6'],
  generated: ['#7c3aed', '#a78bfa'],
  due: ['#86198f', '#e879f9'],
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

function monthLabel(month) {
  if (!month) return '';
  const [y, m] = month.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

const REPORTS = [
  { key: 'fee', label: 'Class Wise Fee Report', description: 'Print complete fee report with generated, paid & due amounts.' },
  { key: 'monthlyFee', label: 'Monthly Fee Report', description: 'Print current month fee generated, paid & remaining.' },
  { key: 'strength', label: 'Class Wise Strength Report', description: 'Print active & deactivated students for each class.' },
  { key: 'attendance', label: 'Class Wise Attendance Report', description: 'Print monthly attendance summary for each class.' },
  { key: 'summary', label: 'Complete Summary Report', description: 'Print all-in-one report with strength, attendance & fee summary.' },
  { key: 'defaulters', label: 'Fee Defaulters Report', description: 'Print month-wise unpaid fee for all students.' },
];

export default function ClassWiseReportsPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(null);

  useEffect(() => {
    getClassWiseReport(month)
      .then(setData)
      .catch((err) => setError(err.response?.data?.error || 'Failed to load class wise reports'));
  }, [month]);

  function handlePrint(key) {
    setPrinting(key);
    setTimeout(() => window.print(), 50);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-slate-800">Class Wise Reports</h1>
        <div className="no-print">
          <label className="text-xs font-medium text-slate-600 mr-2">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 no-print">
          <StatTile label="Total Active Students" value={data.stats.totalActiveStudents} gradient={GRADIENTS.students} />
          <StatTile label="Total Active Staff" value={data.stats.totalActiveStaff} gradient={GRADIENTS.staff} />
          <StatTile label="Total Fee Generated" value={`Rs. ${data.stats.totalFeeGenerated.toLocaleString()}`} gradient={GRADIENTS.generated} />
          <StatTile label="Total Fee Due" value={`Rs. ${data.stats.totalFeeDue.toLocaleString()}`} gradient={GRADIENTS.due} />
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden no-print">
        <div
          className="px-4 py-2 text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
        >
          Printable Class Wise Reports
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORTS.map((r) => (
            <div key={r.key} className="flex items-start justify-between border-b border-slate-100 pb-3 last:border-0">
              <div>
                <div className="font-medium text-slate-800">
                  {r.key === 'monthlyFee' ? `Monthly Fee Report - ${monthLabel(month)}` : r.label}
                </div>
                <div className="text-xs text-slate-500">{r.description}</div>
              </div>
              <button
                onClick={() => handlePrint(r.key)}
                disabled={!data}
                className="text-white rounded px-3 py-1.5 text-xs font-medium shrink-0 disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
              >
                Print
              </button>
            </div>
          ))}
        </div>
        <p className="px-4 pb-4 text-xs text-slate-400">
          Note: please ensure all reports are printed in A4 size for optimal viewing.
        </p>
      </div>

      {printing && data && (
        <div id="result-card-print" className="p-8">
          <PrintedReport reportKey={printing} data={data} month={month} />
          <button onClick={() => setPrinting(null)} className="no-print mt-6 text-sm text-violet-600 hover:underline">
            Close preview
          </button>
        </div>
      )}
    </div>
  );
}

function PrintedReport({ reportKey, data, month }) {
  const title = REPORTS.find((r) => r.key === reportKey)?.label;

  if (reportKey === 'fee' || reportKey === 'monthlyFee') {
    return (
      <ReportTable
        title={reportKey === 'monthlyFee' ? `Monthly Fee Report - ${monthLabel(month)}` : title}
        columns={['Class', 'Fee Generated', 'Fee Paid', 'Fee Due']}
        rows={data.classWise.map((c) => [
          c.className,
          `Rs. ${c.feeGenerated.toLocaleString()}`,
          `Rs. ${c.feePaid.toLocaleString()}`,
          `Rs. ${c.feeDue.toLocaleString()}`,
        ])}
      />
    );
  }

  if (reportKey === 'strength') {
    return (
      <ReportTable
        title={title}
        columns={['Class', 'Active Students', 'Deactivated Students']}
        rows={data.classWise.map((c) => [c.className, c.activeStudents, c.deactivatedStudents])}
      />
    );
  }

  if (reportKey === 'attendance') {
    return (
      <ReportTable
        title={`${title} - ${monthLabel(month)}`}
        columns={['Class', 'Attendance %']}
        rows={data.classWise.map((c) => [c.className, c.attendancePercent === null ? '-' : `${c.attendancePercent}%`])}
      />
    );
  }

  if (reportKey === 'summary') {
    return (
      <ReportTable
        title={title}
        columns={['Class', 'Active', 'Deactivated', 'Attendance %', 'Fee Generated', 'Fee Paid', 'Fee Due']}
        rows={data.classWise.map((c) => [
          c.className,
          c.activeStudents,
          c.deactivatedStudents,
          c.attendancePercent === null ? '-' : `${c.attendancePercent}%`,
          `Rs. ${c.feeGenerated.toLocaleString()}`,
          `Rs. ${c.feePaid.toLocaleString()}`,
          `Rs. ${c.feeDue.toLocaleString()}`,
        ])}
      />
    );
  }

  if (reportKey === 'defaulters') {
    return (
      <ReportTable
        title={`${title} - ${monthLabel(month)}`}
        columns={['Student', 'Class', 'Amount Due', 'Amount Paid', 'Balance', 'Status']}
        rows={data.defaulters.map((d) => [
          d.studentName,
          d.className,
          `Rs. ${d.amountDue.toLocaleString()}`,
          `Rs. ${d.amountPaid.toLocaleString()}`,
          `Rs. ${d.balance.toLocaleString()}`,
          d.status,
        ])}
        emptyMessage="No fee defaulters this month."
      />
    );
  }

  return null;
}

function ReportTable({ title, columns, rows, emptyMessage = 'No data available.' }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-1">{title}</h2>
      <p className="text-xs text-slate-500 mb-4">Printed {new Date().toLocaleString()}</p>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-800 text-left">
            {columns.map((c) => (
              <th key={c} className="py-1 pr-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-200">
              {row.map((cell, j) => (
                <td key={j} className="py-1 pr-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-slate-400 text-sm mt-3">{emptyMessage}</p>}
    </div>
  );
}
