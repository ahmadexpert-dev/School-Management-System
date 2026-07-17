import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getTokenExpiryMs } from '../utils/jwt';

const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes of inactivity
const WARNING_BEFORE_MS = 60 * 1000; // show a warning 60s before logging out
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'];

// Renders inside the authenticated layout only. Tracks user activity via a
// ref (not state) so listeners don't cause re-renders on every mouse move —
// a single interval periodically checks elapsed idle time and the token's
// own expiry, logging out and redirecting with a reason either way.
export default function SessionTimeoutMonitor() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const lastActivityRef = useRef(Date.now());
  const [secondsLeft, setSecondsLeft] = useState(null);

  useEffect(() => {
    function markActive() {
      lastActivityRef.current = Date.now();
    }
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActive));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!token) return;

      const tokenExpiryMs = getTokenExpiryMs(token);
      if (tokenExpiryMs !== null && Date.now() >= tokenExpiryMs) {
        logout('expired');
        navigate('/login?reason=expired', { replace: true });
        return;
      }

      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_TIMEOUT_MS) {
        logout('idle');
        navigate('/login?reason=idle', { replace: true });
        return;
      }

      const msUntilLogout = IDLE_TIMEOUT_MS - idleFor;
      setSecondsLeft(msUntilLogout <= WARNING_BEFORE_MS ? Math.ceil(msUntilLogout / 1000) : null);
    }, 1000);

    return () => clearInterval(interval);
  }, [token, logout, navigate]);

  function staySignedIn() {
    lastActivityRef.current = Date.now();
    setSecondsLeft(null);
  }

  if (secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full text-center">
        <h2 className="text-base font-semibold text-slate-800 mb-2">Still there?</h2>
        <p className="text-sm text-slate-500 mb-4">
          You'll be signed out due to inactivity in <span className="font-semibold text-slate-700">{secondsLeft}s</span>.
        </p>
        <button
          onClick={staySignedIn}
          className="text-white rounded px-4 py-2 text-sm font-medium w-full"
          style={{ background: 'linear-gradient(90deg, #4338ca, #7c3aed)' }}
        >
          Stay signed in
        </button>
      </div>
    </div>
  );
}
