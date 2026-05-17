import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import Login from './pages/Login';
import Users from './pages/Users';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  if (!user || !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-slate-800">PG Admin Panel</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{user?.email}</span>
            <button onClick={logout} className="text-sm text-red-600 hover:underline">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
