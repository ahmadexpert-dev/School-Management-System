import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AuthBackground from '../../components/AuthBackground';
import PasswordInput from '../../components/PasswordInput';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('The server took too long to respond. Please try again in a moment.');
      } else {
        setError(err.response?.data?.error || 'Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthBackground>
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-sm space-y-4 border border-slate-100"
      >
        <div className="flex flex-col items-center text-center mb-1">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <svg viewBox="0 0 64 64" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 24 32 12l28 12-28 12L4 24Z" />
              <path d="M18 30v12c0 4 6.3 8 14 8s14-4 14-8V30" />
              <path d="M56 24v14" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-800">School Management System</h1>
          <p className="text-sm text-slate-500">Sign in to your school account</p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <PasswordInput
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>

        <Link to="/forgot-password" className="block text-center text-sm text-blue-600 hover:underline">
          Forgot password?
        </Link>
      </form>
    </AuthBackground>
  );
}
