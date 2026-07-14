import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', roles: ['owner', 'admin', 'teacher', 'staff', 'parent'], end: true },
  {
    label: 'Admission Management',
    roles: ['owner', 'admin'],
    children: [
      { to: '/dashboard/students', label: 'Admit Student' },
      { to: '/dashboard/admissions/bulk', label: 'Admit Bulk Student' },
      { to: '/dashboard/admissions/reports', label: 'Admission Reports' },
    ],
  },
  { to: '/dashboard/students', label: 'Students', roles: ['teacher', 'staff', 'parent'] },
  { to: '/dashboard/classes', label: 'Classes', roles: ['owner', 'admin'] },
  { to: '/dashboard/fees', label: 'Fees', roles: ['owner', 'admin', 'parent'] },
  { to: '/dashboard/attendance', label: 'Attendance', roles: ['owner', 'admin', 'teacher', 'staff', 'parent'] },
  { to: '/dashboard/grades', label: 'Grades', roles: ['owner', 'admin', 'teacher', 'staff', 'parent'] },
  {
    label: 'Timetable',
    roles: ['owner', 'admin'],
    children: [
      { to: '/dashboard/timetable', label: 'View Timetable' },
      { to: '/dashboard/timetable/manage', label: 'Manage Timetable' },
    ],
  },
  { to: '/dashboard/timetable', label: 'Timetable', roles: ['teacher', 'staff', 'parent'] },
  { to: '/dashboard/calendar', label: 'Academic Calendar', roles: ['owner', 'admin', 'teacher', 'staff', 'parent'] },
  { to: '/dashboard/notices', label: 'Noticeboard', roles: ['owner', 'admin', 'teacher', 'staff', 'parent'] },
  { to: '/dashboard/leave', label: 'Leave Management', roles: ['owner', 'admin', 'teacher', 'staff'] },
  {
    label: 'Staff Management',
    roles: ['owner', 'admin'],
    children: [
      { to: '/dashboard/staff', label: 'Staff Management' },
      { to: '/dashboard/staff/departments', label: 'Departments' },
    ],
  },
  { to: '/dashboard/id-cards', label: 'ID Cards', roles: ['owner', 'admin'] },
  {
    label: 'Reporting Area',
    roles: ['owner', 'admin'],
    children: [
      { to: '/dashboard/reports', label: 'Reports' },
      { to: '/dashboard/reports/class-wise', label: 'Class Wise Reports' },
    ],
  },
  { to: '/dashboard/users', label: 'User accounts', roles: ['owner', 'admin'] },
];

function ChevronIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function NavGroup({ item, onNavigate }) {
  const location = useLocation();
  const hasActiveChild = item.children.some((c) => location.pathname === c.to);
  const [open, setOpen] = useState(hasActiveChild);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          hasActiveChild ? 'bg-white/15 text-white shadow-sm' : 'text-violet-100/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <span>{item.label}</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="mt-1 ml-2 pl-3 border-l border-white/10 space-y-0.5">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  isActive ? 'bg-white/15 text-white font-medium' : 'text-violet-100/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="w-1 h-1 rounded-full bg-current shrink-0" />
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex bg-slate-50">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col shrink-0 transform transition-transform duration-200 md:relative md:translate-x-0 md:w-60 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'linear-gradient(180deg, #2e1065 0%, #4c1d95 45%, #4338ca 100%)' }}
      >
        <div className="px-4 py-5 border-b border-white/10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#e9d5ff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M12 4 2 9l10 5 10-5-10-5Z" />
              <path d="M6 11.5V16c0 1.3 2.7 3 6 3s6-1.7 6-3v-4.5" />
            </svg>
          </div>
          <h2 className="font-semibold text-white text-sm leading-tight">School Management</h2>
        </div>
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) =>
            item.children ? (
              <NavGroup key={item.label} item={item} onNavigate={() => setSidebarOpen(false)} />
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-white/15 text-white shadow-sm' : 'text-violet-100/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            )
          )}
        </nav>
        <div className="px-4 py-3 border-t border-white/10 text-sm">
          <div className="text-white font-medium">{user?.name}</div>
          <div className="text-violet-200/70 capitalize mb-2">{user?.role}</div>
          <button onClick={logout} className="text-rose-200 hover:text-white hover:underline text-sm">
            Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header
          className="px-3 sm:px-6 py-3 flex items-center justify-between shrink-0 gap-2"
          style={{ background: 'linear-gradient(90deg, #4338ca 0%, #6d28d9 100%)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-white p-1 -ml-1 md:hidden shrink-0"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
            <h1 className="text-white font-semibold text-sm truncate">School Management System</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-sm shrink-0">
            <span className="text-white font-medium truncate max-w-[8rem] sm:max-w-none">{user?.name}</span>
            <span className="text-violet-200 capitalize hidden sm:inline">({user?.role})</span>
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
