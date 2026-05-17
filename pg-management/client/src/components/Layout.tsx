import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Building2, Users, MessageSquare, Calendar, Send, Settings, LayoutDashboard, Phone, Menu, X, LogOut } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/buildings', label: 'Buildings', icon: Building2 },
  { path: '/tenants', label: 'Tenants', icon: Users },
  { path: '/templates', label: 'Templates', icon: MessageSquare },
  { path: '/scheduler', label: 'Scheduler', icon: Calendar },
  { path: '/messages', label: 'Messages', icon: Send },
  { path: '/whatsapp', label: 'WhatsApp', icon: Phone },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuthStore();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-white flex-col shrink-0">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold">PG Manager</h1>
          <p className="text-sm text-slate-400 truncate">{user?.name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive(path)
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-slate-900 text-white px-4 flex items-center justify-between sticky top-0 z-30" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)', paddingBottom: '0.75rem' }}>
          <h1 className="text-lg font-bold">PG Manager</h1>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 hover:bg-slate-800 rounded-lg"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </header>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 text-white flex flex-col">
              <div className="px-4 border-b border-slate-700 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)', paddingBottom: '1rem' }}>
                <div>
                  <h1 className="text-xl font-bold">PG Manager</h1>
                  <p className="text-sm text-slate-400 truncate">{user?.name}</p>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive(path)
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </Link>
                ))}
              </nav>
              <div className="p-4 border-t border-slate-700">
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
