import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function SetPassword() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/auth/set-password', { email, password, name });
      setSuccess('Password set successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to set password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-sm mx-4">
        <h1 className="text-3xl font-bold mb-2 text-center text-slate-800">PG Manager</h1>
        <h2 className="text-xl text-center mb-6 text-slate-600">Set Password</h2>
        <p className="text-sm text-slate-500 text-center mb-4">Enter the email your admin registered you with, and choose a password.</p>
        {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">{success}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={6}
            />
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300">
            {submitting ? 'Setting...' : 'Set Password'}
          </button>
          <p className="text-center text-slate-600">
            Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Sign In</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
