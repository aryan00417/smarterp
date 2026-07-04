import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';

const LEDGER_TYPES = [
  { value: 'customer', label: 'Customer',  group_id: 1 },
  { value: 'supplier', label: 'Supplier',  group_id: 2 },
  { value: 'expense',  label: 'Expense',   group_id: 7 },
  { value: 'income',   label: 'Income',    group_id: 5 },
  { value: 'bank',     label: 'Bank',      group_id: 3 },
  { value: 'cash',     label: 'Cash',      group_id: 4 },
];

const TYPE_COLORS = {
  customer: 'bg-blue-100 text-blue-700',
  supplier: 'bg-purple-100 text-purple-700',
  expense:  'bg-red-100 text-red-700',
  income:   'bg-green-100 text-green-700',
  bank:     'bg-yellow-100 text-yellow-700',
  cash:     'bg-orange-100 text-orange-700',
};

const empty = { name:'', type:'customer', group_id:1, phone:'', address:'', gstin:'', opening_balance:'0' };

export default function Ledgers() {
  const { company } = useAuth();
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetchLedgers = async () => {
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (search) params.search = search;
      const res = await api.get(`/companies/${company.id}/ledgers`, { params });
      setLedgers(res.data);
    } catch { toast.error('Failed to load ledgers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLedgers(); }, [filterType, search]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(empty);
    setShowModal(true);
  };

  const openEdit = (l) => {
    setEditTarget(l);
    setForm({
      name: l.name,
      type: l.type,
      group_id: l.group_id,
      phone: l.phone || '',
      address: l.address || '',
      gstin: l.gstin || '',
      opening_balance: l.opening_balance || '0',
    });
    setShowModal(true);
  };

  const handleTypeChange = (type) => {
    const found = LEDGER_TYPES.find(t => t.value === type);
    setForm(f => ({ ...f, type, group_id: found?.group_id || 1 }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      if (editTarget) {
        await api.put(`/companies/${company.id}/ledgers/${editTarget.id}`, form);
        toast.success('Ledger updated');
      } else {
        await api.post(`/companies/${company.id}/ledgers`, form);
        toast.success('Ledger created');
      }
      setShowModal(false);
      fetchLedgers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (l) => {
    if (!confirm(`Delete "${l.name}"?`)) return;
    try {
      await api.delete(`/companies/${company.id}/ledgers/${l.id}`);
      toast.success('Ledger deleted');
      fetchLedgers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = ledgers;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Ledgers</h1>
          <p className="text-sm text-gray-500 mt-1">{ledgers.length} ledgers</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> New Ledger
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Search ledgers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-40"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {LEDGER_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {(search || filterType) && (
          <button onClick={() => { setSearch(''); setFilterType(''); }}
            className="btn-secondary flex items-center gap-1">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 mb-3">No ledgers found</p>
            <button onClick={openCreate} className="btn-primary">Create First Ledger</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">GSTIN</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-sm">{l.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${TYPE_COLORS[l.type]}`}>
                      {l.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{l.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">{l.gstin || '—'}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    <span className={parseFloat(l.balance) >= 0 ? 'text-green-600' : 'text-red-500'}>
                      ₹{parseFloat(l.balance).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(l)} className="p-1.5 text-gray-400 hover:text-brand-500 rounded">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(l)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-5">{editTarget ? 'Edit Ledger' : 'Create Ledger'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="form-label">Ledger Name *</label>
                <input className="input-field" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus required placeholder="e.g. Rahul Enterprises" />
              </div>

              <div>
                <label className="form-label">Type *</label>
                <select className="input-field" value={form.type} onChange={e => handleTypeChange(e.target.value)}>
                  {LEDGER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Phone</label>
                  <input className="input-field" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="9876543210" />
                </div>
                <div>
                  <label className="form-label">Opening Balance (₹)</label>
                  <input className="input-field" type="number" value={form.opening_balance}
                    onChange={e => setForm(f => ({ ...f, opening_balance: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="form-label">GSTIN</label>
                <input className="input-field font-mono" value={form.gstin}
                  onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                  placeholder="36AAAAA0000A1Z5" maxLength={15} />
              </div>

              <div>
                <label className="form-label">Address</label>
                <textarea className="input-field" rows={2} value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editTarget ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}