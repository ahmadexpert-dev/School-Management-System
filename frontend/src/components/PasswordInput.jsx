import { useState, forwardRef } from 'react';

function EyeIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      {off ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
          <path d="M9.36 5.11A9.7 9.7 0 0 1 12 4.8c5 0 9 4.2 10.5 7.2a11.6 11.6 0 0 1-2.16 3.02M6.6 6.6C4.4 8.05 2.7 10.1 1.5 12c1.5 3 5.5 7.2 10.5 7.2 1.35 0 2.6-.3 3.75-.8" />
        </>
      ) : (
        <>
          <path d="M1.5 12S5.5 4.8 12 4.8 22.5 12 22.5 12 18.5 19.2 12 19.2 1.5 12 1.5 12Z" />
          <circle cx="12" cy="12" r="2.8" />
        </>
      )}
    </svg>
  );
}

// A drop-in replacement for <input type="password">, with a toggle to
// reveal the typed value — plain text is easy to mistype, and mobile
// keyboards especially benefit from a way to double-check before submit.
const PasswordInput = forwardRef(function PasswordInput({ className = '', ...props }, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        <EyeIcon off={visible} />
      </button>
    </div>
  );
});

export default PasswordInput;
