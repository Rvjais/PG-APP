import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';
import Dashboard from './pages/Dashboard';
import Buildings from './pages/Buildings';
import Tenants from './pages/Tenants';
import Templates from './pages/Templates';
import Scheduler from './pages/Scheduler';
import Messages from './pages/Messages';
import WhatsApp from './pages/WhatsApp';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  if (!user || !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="buildings" element={<Buildings />} />
          <Route path="tenants" element={<Tenants />} />
          <Route path="templates" element={<Templates />} />
          <Route path="scheduler" element={<Scheduler />} />
          <Route path="messages" element={<Messages />} />
          <Route path="whatsapp" element={<WhatsApp />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<div className="text-center py-20"><h1 className="text-4xl font-bold text-slate-400">404</h1><p className="text-slate-500 mt-2">Page not found</p></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;