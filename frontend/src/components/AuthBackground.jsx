// Hand-drawn-style school doodles (pencil, book, graduation cap, apple,
// ruler) scattered behind the auth forms. Plain inline SVG, no assets/fonts
// to load — kept at low opacity so they read as texture, not clutter.

function Pencil({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 56 12 44 44 12l8 8-32 32-12 4Z" />
      <path d="M40 16l8 8" />
      <path d="M12 44l8 8" />
    </svg>
  );
}

function Book({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 14c6-3 14-3 24 2v34c-10-5-18-5-24-2V14Z" />
      <path d="M56 14c-6-3-14-3-24 2v34c10-5 18-5 24-2V14Z" />
      <path d="M32 16v34" />
    </svg>
  );
}

function GradCap({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 24 32 12l28 12-28 12L4 24Z" />
      <path d="M18 30v12c0 4 6.3 8 14 8s14-4 14-8V30" />
      <path d="M56 24v14" />
    </svg>
  );
}

function Apple({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M32 26c8-8 20-4 20 8 0 12-10 22-20 22s-20-10-20-22c0-12 12-16 20-8Z" />
      <path d="M32 26v-6" />
      <path d="M32 20c0-4 3-7 7-8" />
    </svg>
  );
}

function Ruler({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="24" width="52" height="16" rx="2" transform="rotate(-10 32 32)" />
      <path d="M16 27l2 6M24 25l2 8M32 23l2 10M40 22l2 11" transform="rotate(-10 32 32)" />
    </svg>
  );
}

function Backpack({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 26c0-8 7-14 16-14s16 6 16 14v22c0 4-3 6-6 6H22c-3 0-6-2-6-6V26Z" />
      <path d="M24 12v8M40 12v8" />
      <path d="M22 34h20M26 44h12" />
      <rect x="26" y="26" width="12" height="8" rx="2" />
    </svg>
  );
}

function Globe({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="22" />
      <ellipse cx="32" cy="32" rx="9" ry="22" />
      <path d="M10 32h44M14 20h36M14 44h36" />
    </svg>
  );
}

function Bell({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M32 10v4" />
      <path d="M16 42c0-4 2-6 2-14 0-8 6-14 14-14s14 6 14 14c0 8 2 10 2 14H16Z" />
      <path d="M26 48c1.5 3 4 4 6 4s4.5-1 6-4" />
    </svg>
  );
}

function Star({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M32 8l7 16 17 2-13 12 3 17-14-9-14 9 3-17-13-12 17-2 7-16Z" />
    </svg>
  );
}

function Notebook({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="14" y="8" width="38" height="48" rx="3" />
      <path d="M8 16h6M8 26h6M8 36h6M8 46h6" />
      <path d="M22 20h22M22 30h22M22 40h14" />
    </svg>
  );
}

function Scissors({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="16" r="6" />
      <circle cx="14" cy="48" r="6" />
      <path d="M19 20l34 24M19 44l34-24" />
    </svg>
  );
}

const DOODLES = [
  { Icon: Pencil, className: 'w-16 h-16 -rotate-12', style: { top: '8%', left: '6%' } },
  { Icon: Book, className: 'w-20 h-20 rotate-6', style: { bottom: '10%', left: '10%' } },
  { Icon: GradCap, className: 'w-16 h-16 rotate-3', style: { top: '12%', right: '8%' } },
  { Icon: Apple, className: 'w-14 h-14 -rotate-6', style: { bottom: '14%', right: '10%' } },
  { Icon: Ruler, className: 'w-16 h-16 rotate-12', style: { top: '46%', left: '3%' } },
  { Icon: Pencil, className: 'w-12 h-12 rotate-45', style: { top: '42%', right: '4%' } },
  { Icon: Backpack, className: 'w-16 h-16 -rotate-6', style: { top: '24%', left: '20%' } },
  { Icon: Globe, className: 'w-16 h-16 rotate-6', style: { bottom: '22%', left: '22%' } },
  { Icon: Bell, className: 'w-14 h-14 rotate-6', style: { top: '22%', right: '20%' } },
  { Icon: Star, className: 'w-12 h-12 -rotate-12', style: { bottom: '24%', right: '20%' } },
  { Icon: Notebook, className: 'w-14 h-14 rotate-3', style: { top: '2%', left: '32%' } },
  { Icon: Scissors, className: 'w-14 h-14 -rotate-45', style: { bottom: '4%', right: '32%' } },
];

export default function AuthBackground({ children }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
      {DOODLES.map(({ Icon, className, style }, i) => (
        <div key={i} className="absolute text-blue-400 pointer-events-none" style={style}>
          <Icon className={className} />
        </div>
      ))}
      <div className="relative z-10 w-full flex items-center justify-center px-4">{children}</div>
    </div>
  );
}
