import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Shield } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex justify-center mb-6">
          <div className="bg-slate-800 p-3 rounded-full">
            <Shield size={32} className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center text-slate-800">Admin Panel</h1>
        <p className="text-slate-500 text-center mb-6 text-sm">Sign in to manage users</p>
        {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500"
              required
            />
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-slate-800 text-white py-2.5 rounded-lg hover:bg-slate-700 transition-colors disabled:bg-slate-300">
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </div>
      </form>
    </div>
  );
}
