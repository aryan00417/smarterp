import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { BookOpen, Package, FileText, ShoppingCart, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(n);

export default function Dashboard() {
  const { company } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;
    (async () => {
      try {
        const [ledgers, stock, sales, purchases] = await Promise.all([
          api.get(`/companies/${company.id}/ledgers`),
          api.get(`/companies/${company.id}/stock-items`),
          api.get(`/companies/${company.id}/vouchers?type=sales`),
          api.get(`/companies/${company.id}/vouchers?type=purchase`),
        ]);
        setStats({
          ledgerCount: ledgers.data.length,
          stockCount: stock.data.length,
          totalSales: sales.data.reduce((s, v) => s + parseFloat(v.total_amount), 0),
          totalPurchases: purchases.data.reduce((s, v) => s + parseFloat(v.total_amount), 0),
          salesCount: sales.data.length,
          purchaseCount: purchases.data.length,
          lowStock: stock.data.filter(i => i.current_qty <= 5).length,
          recentSales: sales.data.slice(0, 5),
          recentPurchases: purchases.data.slice(0, 5),
        });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [company]);

  const quickActions = [
    { label:'New Ledger',   to:'/dashboard/ledgers',   icon:BookOpen,    color:'bg-purple-100 text-purple-600', shortcut:'Alt+L' },
    { label:'New Stock',    to:'/dashboard/stock',     icon:Package,     color:'bg-green-100 text-green-600',   shortcut:'Alt+S' },
    { label:'New Sale',     to:'/dashboard/sales',     icon:FileText,    color:'bg-blue-100 text-blue-600',     shortcut:'F8'    },
    { label:'New Purchase', to:'/dashboard/purchases', icon:ShoppingCart,color:'bg-orange-100 text-orange-600', shortcut:'F9'    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="page-title">Gateway — {company?.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{company?.financial_year} · {company?.state || 'No state set'}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card p-5 h-24 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Sales" value={fmt(stats.totalSales)} sub={`${stats.salesCount} vouchers`} icon={TrendingUp} color="text-green-500" />
            <StatCard label="Total Purchases" value={fmt(stats.totalPurchases)} sub={`${stats.purchaseCount} vouchers`} icon={TrendingDown} color="text-orange-500" />
            <StatCard label="Ledgers" value={stats.ledgerCount} sub="parties" icon={BookOpen} color="text-purple-500" />
            <StatCard label="Stock Items" value={stats.stockCount} sub={stats.lowStock > 0 ? `⚠️ ${stats.lowStock} low` : 'all good'} icon={Package} color="text-blue-500" />
          </div>

          {stats.lowStock > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                <strong>{stats.lowStock} items</strong> are low on stock.{' '}
                <Link to="/dashboard/stock" className="underline">View stock →</Link>
              </p>
            </div>
          )}
        </>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map(a => (
            <Link key={a.to} to={a.to} className="card p-4 hover:shadow-md transition-shadow flex flex-col gap-2 group">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.color}`}><a.icon size={18} /></div>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-600">{a.label}</p>
              <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 self-start">{a.shortcut}</span>
            </Link>
          ))}
        </div>
      </div>

      {!loading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentTable title="Recent Sales" rows={stats.recentSales} to="/dashboard/sales" color="text-green-600" />
          <RecentTable title="Recent Purchases" rows={stats.recentPurchases} to="/dashboard/purchases" color="text-orange-600" />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        </div>
        <Icon size={22} className={color} />
      </div>
    </div>
  );
}

function RecentTable({ title, rows, to, color }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <Link to={to} className={`text-xs ${color} hover:underline`}>View all →</Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No entries yet</p>
      ) : (
        <table className="w-full">
          <tbody>
            {rows.map(v => (
              <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{v.voucher_no}</td>
                <td className="px-4 py-2 text-sm font-medium">{v.party_name}</td>
                <td className="px-4 py-2 text-sm text-right font-mono">₹{parseInt(v.total_amount).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}