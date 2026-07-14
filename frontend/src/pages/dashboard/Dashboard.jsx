import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardSummary } from '../../services/dashboard';
import { listTodos, createTodo, updateTodo, deleteTodo } from '../../services/todos';

const STATUS_COLORS = {
  present: '#0ca30c',
  leave: '#fab219',
  absent: '#d03b3b',
};

// Single premium hue family (indigo → violet → fuchsia), varied by shade/angle
// rather than by hue, so every module keeps a fixed, distinct gradient identity
// while the whole dashboard reads as one cohesive color theme.
const ICON_GRADIENTS = {
  blue: ['#4338ca', '#6366f1'],
  aqua: ['#4f46e5', '#818cf8'],
  yellow: ['#7c3aed', '#a78bfa'],
  green: ['#6d28d9', '#c084fc'],
  violet: ['#5b21b6', '#8b5cf6'],
  red: ['#9333ea', '#d8b4fe'],
  magenta: ['#86198f', '#e879f9'],
  orange: ['#3730a3', '#7c3aed'],
};

// Flat swatches (solid, non-gradient) reserved for legends/small dots where a
// gradient fill would be muddy at small sizes — same hue family, different shade.
const ICON_COLORS = {
  blue: '#4338ca',
  aqua: '#4f46e5',
  yellow: '#7c3aed',
  green: '#6d28d9',
  violet: '#5b21b6',
  red: '#9333ea',
  magenta: '#86198f',
  orange: '#3730a3',
};

const ICONS = {
  cap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4 2 9l10 5 10-5-10-5Z" />
      <path d="M6 11.5V16c0 1.3 2.7 3 6 3s6-1.7 6-3v-4.5" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5C4.7 20 4 19.3 4 18.5v-13Z" />
      <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5c.8 0 1.5-.7 1.5-1.5v-13Z" />
    </svg>
  ),
  badge: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="12" cy="10" r="2.2" />
      <path d="M8 16.5c0-1.9 1.8-3 4-3s4 1.1 4 3" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <line x1="8" y1="7.5" x2="8" y2="7.5" />
      <line x1="8" y1="7.5" x2="9" y2="7.5" />
      <line x1="12" y1="7.5" x2="13" y2="7.5" />
      <line x1="16" y1="7.5" x2="17" y2="7.5" />
      <line x1="8" y1="11.5" x2="9" y2="11.5" />
      <line x1="12" y1="11.5" x2="13" y2="11.5" />
      <line x1="16" y1="11.5" x2="17" y2="11.5" />
      <path d="M10 21v-4h4v4" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 9h18" />
      <circle cx="16.5" cy="14" r="1" />
    </svg>
  ),
  calendarCheck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M8 3v3M16 3v3" />
      <path d="M8.5 14l2 2 4.5-4.5" />
    </svg>
  ),
  award: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9" r="5" />
      <path d="M9 13.5 8 21l4-2 4 2-1-7.5" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M12 20V4M20 20v-7" />
      <path d="M2 20h20" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8.5" r="3" />
      <path d="M2.5 19c0-3 2.9-5 6.5-5s6.5 2 6.5 5" />
      <circle cx="17.5" cy="9.5" r="2.3" />
      <path d="M15.8 14c2.7.3 4.7 2 4.7 5" />
    </svg>
  ),
};

const QUICK_LINKS = [
  { to: '/dashboard/classes', label: 'Classes', icon: 'building', gradient: ICON_GRADIENTS.blue },
  { to: '/dashboard/students', label: 'Students', icon: 'cap', gradient: ICON_GRADIENTS.aqua },
  { to: '/dashboard/fees', label: 'Fees', icon: 'wallet', gradient: ICON_GRADIENTS.yellow },
  { to: '/dashboard/attendance', label: 'Attendance', icon: 'calendarCheck', gradient: ICON_GRADIENTS.green },
  { to: '/dashboard/grades', label: 'Grades', icon: 'award', gradient: ICON_GRADIENTS.violet },
  { to: '/dashboard/staff', label: 'Staff', icon: 'badge', gradient: ICON_GRADIENTS.red },
  { to: '/dashboard/reports', label: 'Reports', icon: 'chart', gradient: ICON_GRADIENTS.magenta },
  { to: '/dashboard/users', label: 'User accounts', icon: 'users', gradient: ICON_GRADIENTS.orange },
];

function IconChip({ icon, gradient }) {
  const [from, to] = gradient;
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})`, color: '#fff' }}
    >
      <div className="w-5 h-5">{ICONS[icon]}</div>
    </div>
  );
}

function StatCard({ label, value, to, icon, gradient }) {
  const [from] = gradient;
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})` }} />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <IconChip icon={icon} gradient={gradient} />
          <div>
            <div className="text-2xl font-semibold text-slate-800 leading-tight">{value}</div>
            <div className="text-sm text-slate-500">{label}</div>
          </div>
        </div>
        <Link to={to} className="text-xs font-medium hover:underline" style={{ color: from }}>
          View all
        </Link>
      </div>
    </div>
  );
}

function AttendanceDonut({ attendance }) {
  const total = attendance.present + attendance.absent + attendance.leave;
  const segments = ['present', 'leave', 'absent'];
  let cumulative = 0;
  const stops = segments.map((key) => {
    const value = attendance[key];
    const pct = total ? (value / total) * 100 : 0;
    const start = cumulative;
    cumulative += pct;
    return { key, value, start, end: cumulative };
  });

  const gradient = total
    ? `conic-gradient(${stops.map((s) => `${STATUS_COLORS[s.key]} ${s.start}% ${s.end}%`).join(', ')})`
    : `conic-gradient(#e1e0d9 0% 100%)`;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-700 mb-1">Attendance today</h2>
      <p className="text-xs text-slate-400 mb-4">{attendance.date}</p>
      <div className="flex items-center gap-6">
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center shrink-0"
          style={{ background: gradient }}
        >
          <div className="w-20 h-20 rounded-full bg-white flex flex-col items-center justify-center">
            <span className="text-lg font-semibold text-slate-800">{total}</span>
            <span className="text-[10px] text-slate-400">Marked</span>
          </div>
        </div>
        <ul className="space-y-2 text-sm">
          {segments.map((key) => (
            <li key={key} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[key] }} />
              <span className="capitalize text-slate-600">{key}</span>
              <span className="font-medium text-slate-800">{attendance[key]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FeesChart({ fees }) {
  const maxDue = Math.max(1, ...fees.monthly.map((m) => m.totalDue));

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-700">Fees collection (last 6 months)</h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-200" /> Total due
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#6d28d9' }} /> Collected
          </span>
        </div>
      </div>
      <div className="flex items-end gap-3 h-40 mt-4">
        {fees.monthly.map((m) => (
          <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full">
            <div className="relative w-full bg-slate-100 rounded-t" style={{ height: `${(m.totalDue / maxDue) * 100}%` }}>
              <div
                className="absolute bottom-0 left-0 w-full rounded-t"
                style={{
                  height: m.totalDue ? `${Math.min(100, (m.totalPaid / m.totalDue) * 100)}%` : '0%',
                  backgroundColor: '#6d28d9',
                }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1">{m.month.slice(5)}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 text-sm">
        <div>
          <div className="text-slate-800 font-semibold">Rs. {fees.totalCollected.toLocaleString()}</div>
          <div className="text-xs text-slate-500">Total collected</div>
        </div>
        <div>
          <div className="text-slate-800 font-semibold">Rs. {fees.totalOutstanding.toLocaleString()}</div>
          <div className="text-xs text-slate-500">Total outstanding</div>
        </div>
        <div>
          <div className="text-slate-800 font-semibold">{fees.studentsNotPaidThisMonth}</div>
          <div className="text-xs text-slate-500">Unpaid this month</div>
        </div>
      </div>
    </div>
  );
}

function TopPerformers({ topPerformers }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-700 mb-1">Top performers</h2>
      {!topPerformers.exam ? (
        <p className="text-sm text-slate-400 mt-3">No exams recorded yet.</p>
      ) : (
        <>
          <p className="text-xs text-slate-400 mb-3">
            {topPerformers.exam.examName} ({topPerformers.exam.term}) — {topPerformers.exam.className}
          </p>
          {topPerformers.students.length === 0 ? (
            <p className="text-sm text-slate-400">No grades entered for this exam yet.</p>
          ) : (
            <ul className="space-y-2">
              {topPerformers.students.map((s, i) => {
                const rankColor = [ICON_COLORS.yellow, '#9aa0a6', ICON_COLORS.orange][i];
                return (
                  <li
                    key={s.studentId}
                    className="flex items-center gap-3 text-sm border-t border-slate-100 pt-2 first:border-0 first:pt-0"
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{
                        backgroundColor: rankColor ? `${rankColor}1a` : '#f1f5f9',
                        color: rankColor || '#64748b',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-slate-700">{s.studentName}</span>
                    <span className="font-medium text-slate-800">{s.percentage}%</span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function QuickLinks({ links }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick links</h2>
      <div className="grid grid-cols-2 gap-2">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-600 hover:bg-violet-50 hover:border-violet-200 transition-colors"
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-white"
              style={{ background: `linear-gradient(135deg, ${l.gradient[0]}, ${l.gradient[1]})` }}
            >
              <div className="w-4 h-4">{ICONS[l.icon]}</div>
            </div>
            <span className="text-sm">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TodoWidget() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listTodos().then(setTodos).catch(() => {});
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    try {
      const todo = await createTodo(text.trim());
      setTodos((prev) => [todo, ...prev]);
      setText('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add task');
    }
  }

  async function handleToggle(todo) {
    const updated = await updateTodo(todo.id, { done: !todo.done });
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
  }

  async function handleDelete(id) {
    await deleteTodo(id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">To-do</h2>
      <form onSubmit={handleAdd} className="flex gap-2 mb-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm"
        />
        <button type="submit" className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-blue-700">
          Add
        </button>
      </form>
      {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
      {todos.length === 0 ? (
        <p className="text-sm text-slate-400">No tasks yet.</p>
      ) : (
        <ul className="space-y-2">
          {todos.map((t) => (
            <li key={t.id} className="flex items-center gap-2 border-t border-slate-100 pt-2 first:border-0 first:pt-0">
              <input type="checkbox" checked={t.done} onChange={() => handleToggle(t)} className="shrink-0" />
              <span className={`flex-1 text-sm ${t.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {t.text}
              </span>
              <button onClick={() => handleDelete(t.id)} className="text-xs text-red-500 hover:underline">
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ONBOARDING_STEPS = [
  { key: 'classes', label: 'Add classes', to: '/dashboard/classes', cta: 'Add class' },
  { key: 'teachers', label: 'Add teachers', to: '/dashboard/users', cta: 'Add teacher' },
  { key: 'students', label: 'Add students', to: '/dashboard/students', cta: 'Add student' },
];

function WelcomeBanner({ user, counts }) {
  const remaining = ONBOARDING_STEPS.filter((s) => !counts[s.key]);
  if (remaining.length === 0) return null;

  return (
    <div
      className="rounded-xl p-5 mb-6 text-white shadow-sm"
      style={{ background: 'linear-gradient(120deg, #4338ca 0%, #7c3aed 55%, #a21caf 100%)' }}
    >
      <h1 className="text-lg font-semibold">Welcome back, {user?.name}</h1>
      <p className="text-violet-100 text-sm mb-4">
        {remaining.length === ONBOARDING_STEPS.length
          ? "Let's get your school set up — start with these steps."
          : "You're making progress — here's what's left to set up."}
      </p>
      <div className="flex flex-wrap gap-3">
        {ONBOARDING_STEPS.map((step, i) => {
          const done = !!counts[step.key];
          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${done ? 'bg-white/10' : 'bg-white/15'}`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                  done ? 'bg-emerald-400 text-emerald-950' : 'bg-white/25 text-white'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-sm ${done ? 'text-violet-100 line-through' : 'text-white font-medium'}`}>
                {step.label}
              </span>
              {!done && (
                <Link
                  to={step.to}
                  className="text-xs font-semibold bg-white text-violet-700 rounded px-2 py-1 hover:bg-violet-50"
                >
                  {step.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminDashboard({ user }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard'));
  }, []);

  return (
    <div>
      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {!summary ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : (
        <>
          <WelcomeBanner user={user} counts={summary.counts} />
          {ONBOARDING_STEPS.every((s) => summary.counts[s.key]) && (
            <div className="mb-6">
              <h1 className="text-lg font-semibold text-slate-800">Welcome back, {user?.name}</h1>
              <p className="text-slate-500 text-sm">Here's what's happening in your school today.</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total students"
              value={summary.counts.students}
              to="/dashboard/students"
              icon="cap"
              gradient={ICON_GRADIENTS.blue}
            />
            <StatCard
              label="Total teachers"
              value={summary.counts.teachers}
              to="/dashboard/users"
              icon="book"
              gradient={ICON_GRADIENTS.aqua}
            />
            <StatCard
              label="Total staff"
              value={summary.counts.staff}
              to="/dashboard/staff"
              icon="badge"
              gradient={ICON_GRADIENTS.violet}
            />
            <StatCard
              label="Total classes"
              value={summary.counts.classes}
              to="/dashboard/classes"
              icon="building"
              gradient={ICON_GRADIENTS.orange}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <AttendanceDonut attendance={summary.attendanceToday} />
              <FeesChart fees={summary.fees} />
              <TopPerformers topPerformers={summary.topPerformers} />
            </div>
            <div className="space-y-6">
              <QuickLinks links={QUICK_LINKS} />
              <TodoWidget />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  if (['owner', 'admin'].includes(user?.role)) {
    return <AdminDashboard user={user} />;
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-800 mb-2">Welcome, {user?.name}</h1>
      <p className="text-slate-500 mb-6">
        Use the sidebar to manage students, classes, fees, attendance, grades, staff, and reports.
      </p>
      <div className="max-w-md">
        <TodoWidget />
      </div>
    </div>
  );
}
