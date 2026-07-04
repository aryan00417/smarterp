import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search, X, AlertTriangle } from 'lucide-react';

const empty = {
  name: '', sku: '', unit_id: '', purchase_price: '',
  selling_price: '', gst_rate: '18', opening_qty: '0'
};

export default function Stock() {
  const { company } = useAuth();
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      const [itemsRes, unitsRes] = await Promise.all([
        api.get(`/companies/${company.id}/stock-items`, { params: search ? { search } : {} }),
        api.get(`/companies/${company.id}/units`),
      ]);
      setItems(itemsRes.data);
      setUnits(unitsRes.data);
    } catch { toast.error('Failed to load stock items'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [search]);

  const openCreate = () => { setEditTarget(null); setForm(empty); setShowModal(true); };

  const openEdit = (item) => {
    setEditTarget(item);
    setForm({
      name: item.name,
      sku: item.sku || '',
      unit_id: item.unit_id || '',
      purchase_price: item.purchase_price,
      selling_price: item.selling_price,
      gst_rate: item.gst_rate,
      opening_qty: item.opening_qty,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Item name is required');
    setSaving(true);
    try {
      if (editTarget) {
        await api.put(`/companies/${company.id}/stock-items/${editTarget.id}`, form);
        toast.success('Item updated');
      } else {
        await api.post(`/companies/${company.id}/stock-items`, form);
        toast.success('Item created');
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.delete(`/companies/${company.id}/stock-items/${item.id}`);
      toast.success('Item deleted');
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const GST_RATES = ['0', '5', '12', '18', '28'];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Stock Items</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} items</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> New Item
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search items..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn-secondary flex items-center gap-1">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 mb-3">No stock items yet</p>
            <button onClick={openCreate} className="btn-primary">Add First Item</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Purchase ₹</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Selling ₹</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">GST %</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-sm">{item.name}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">{item.sku || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.unit_symbol || '—'}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">₹{parseFloat(item.purchase_price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">₹{parseFloat(item.selling_price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm text-right">{item.gst_rate}%</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    <span className={`font-semibold ${parseFloat(item.current_qty) <= 5 ? 'text-red-500' : 'text-green-600'}`}>
                      {parseFloat(item.current_qty).toLocaleString('en-IN')}
                      {parseFloat(item.current_qty) <= 5 && (
                        <AlertTriangle size={12} className="inline ml-1 text-red-500" />
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-brand-500 rounded">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-5">{editTarget ? 'Edit Item' : 'New Stock Item'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Item Name *</label>
                  <input className="input-field" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    autoFocus required placeholder="e.g. Basmati Rice 1kg" />
                </div>
                <div>
                  <label className="form-label">SKU</label>
                  <input className="input-field font-mono" value={form.sku}
                    onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                    placeholder="ITEM-001" />
                </div>
                <div>
                  <label className="form-label">Unit</label>
                  <select className="input-field" value={form.unit_id}
                    onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}>
                    <option value="">Select unit</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.symbol} — {u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Purchase Price (₹)</label>
                  <input className="input-field" type="number" min="0" step="0.01"
                    value={form.purchase_price}
                    onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))}
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="form-label">Selling Price (₹)</label>
                  <input className="input-field" type="number" min="0" step="0.01"
                    value={form.selling_price}
                    onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))}
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="form-label">GST Rate (%)</label>
                  <select className="input-field" value={form.gst_rate}
                    onChange={e => setForm(f => ({ ...f, gst_rate: e.target.value }))}>
                    {GST_RATES.map(r => (
                      <option key={r} value={r}>{r}%</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Opening Stock (qty)</label>
                  <input className="input-field" type="number" min="0" step="0.001"
                    value={form.opening_qty}
                    onChange={e => setForm(f => ({ ...f, opening_qty: e.target.value }))} />
                </div>
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