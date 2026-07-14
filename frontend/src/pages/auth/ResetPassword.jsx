import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../services/auth';
import AuthBackground from '../../components/AuthBackground';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthBackground>
        <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-sm text-center space-y-4 border border-slate-100">
          <p className="text-sm text-red-600">Missing or invalid reset link.</p>
          <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
            Request a new one
          </Link>
        </div>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-sm space-y-4 border border-slate-100">
        <h1 className="text-xl font-semibold text-slate-800">Reset password</h1>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </AuthBackground>
  );
}
