import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../services/auth';
import AuthBackground from '../../components/AuthBackground';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const result = await forgotPassword(email);
      setMessage(result.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthBackground>
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-sm space-y-4 border border-slate-100">
        <h1 className="text-xl font-semibold text-slate-800">Forgot password</h1>
        <p className="text-sm text-slate-500">Enter your account email and we'll send you a reset link.</p>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
        )}
        {message && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            {message}
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </button>

        <Link to="/login" className="block text-center text-sm text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </form>
    </AuthBackground>
  );
}
