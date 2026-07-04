import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, BookOpen, Package, FileText, ShoppingCart,
  LogOut, Building2
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard',  to: '/dashboard',           icon: LayoutDashboard, shortcut: 'Ctrl+H' },
  { label: 'Ledgers',    to: '/dashboard/ledgers',   icon: BookOpen,        shortcut: 'Alt+L'  },
  { label: 'Stock',      to: '/dashboard/stock',     icon: Package,         shortcut: 'Alt+S'  },
  { label: 'Sales',      to: '/dashboard/sales',     icon: FileText,        shortcut: 'F8'     },
  { label: 'Purchases',  to: '/dashboard/purchases', icon: ShoppingCart,    shortcut: 'F9'     },
];

export default function DashboardLayout() {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!company) navigate('/companies');
  }, [company]);

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'h') { e.preventDefault(); navigate('/dashboard'); }
      if (e.ctrlKey && e.key === 'q') { e.preventDefault(); logout(); }
      if (e.key === 'F8') { e.preventDefault(); navigate('/dashboard/sales'); }
      if (e.key === 'F9') { e.preventDefault(); navigate('/dashboard/purchases'); }
      if (e.altKey && e.key === 'l') { e.preventDefault(); navigate('/dashboard/ledgers'); }
      if (e.altKey && e.key === 's') { e.preventDefault(); navigate('/dashboard/stock'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-700">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="text-white font-bold text-sm">SmartERP</span>
        </div>

        {/* Company */}
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Building2 size={13} className="text-brand-400 flex-shrink-0" />
            <p className="text-white text-xs font-medium truncate">{company?.name}</p>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">{company?.financial_year}</p>
          <button
            onClick={() => navigate('/companies')}
            className="text-xs text-slate-500 hover:text-slate-300 mt-1"
          >
            Switch →
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${isActive ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`
              }
            >
              <item.icon size={17} className="flex-shrink-0" />
              <span className="flex-1 font-medium">{item.label}</span>
              <span className="text-xs opacity-40 font-mono">{item.shortcut}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-4 py-4 border-t border-slate-700">
          <p className="text-xs text-slate-400 truncate">{user?.name}</p>
          <p className="text-xs text-slate-600 truncate mb-2">{user?.email}</p>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm transition-colors"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}