import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Building2, Pencil, Trash2, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const STATES = ['Andhra Pradesh','Telangana','Karnataka','Tamil Nadu','Maharashtra',
  'Gujarat','Rajasthan','Uttar Pradesh','Madhya Pradesh','Bihar','West Bengal',
  'Delhi','Haryana','Punjab','Kerala','Goa'];

const empty = { name:'', address:'', gstin:'', state:'', financial_year:'2024-25', contact:'' };

export default function Companies() {
  const { user, logout, selectCompany } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    try {
      const res = await api.get('/companies');
      setCompanies(res.data);
    } catch { toast.error('Failed to load companies'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditTarget(null); setForm(empty); setShowModal(true); };
  const openEdit = (c, e) => {
    e.stopPropagation();
    setEditTarget(c);
    setForm({ name:c.name, address:c.address||'', gstin:c.gstin||'', state:c.state||'', financial_year:c.financial_year||'2024-25', contact:c.contact||'' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Company name is required');
    setSaving(true);
    try {
      if (editTarget) { await api.put(`/companies/${editTarget.id}`, form); toast.success('Updated'); }
      else { await api.post('/companies', form); toast.success('Company created'); }
      setShowModal(false); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c, e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${c.name}"?`)) return;
    try { await api.delete(`/companies/${c.id}`); toast.success('Deleted'); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleSelect = (c) => { selectCompany(c); navigate('/dashboard'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold">S</div>
            <div>
              <p className="text-white font-semibold text-sm">SmartERP</p>
              <p className="text-slate-400 text-xs">Welcome, {user?.name}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
            <LogOut size={15} /> Sign out
          </button>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Select Company</h1>
              <p className="text-sm text-gray-500 mt-0.5">{companies.length}/5 companies</p>
            </div>
            {companies.length < 5 && (
              <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                <Plus size={15} /> New Company
              </button>
            )}
          </div>

          {companies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm mb-4">No companies yet.</p>
              <button onClick={openCreate} className="btn-primary">Create Company</button>
            </div>
          ) : (
            <div className="space-y-2">
              {companies.map(c => (
                <div key={c.id} onClick={() => handleSelect(c)}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-brand-500 hover:bg-blue-50 cursor-pointer transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 size={18} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.state || 'No state'} · {c.financial_year} · GSTIN: {c.gstin || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => openEdit(c, e)} className="p-1.5 text-gray-400 hover:text-brand-500 rounded"><Pencil size={14} /></button>
                    <button onClick={e => handleDelete(c, e)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 size={14} /></button>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-500 ml-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-5">{editTarget ? 'Edit Company' : 'Create Company'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="form-label">Company Name *</label>
                <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
              </div>
              <div>
                <label className="form-label">Address</label>
                <textarea className="input-field" rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">GSTIN</label>
                  <input className="input-field font-mono" placeholder="22AAAAA0000A1Z5" value={form.gstin}
                    onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))} maxLength={15} />
                </div>
                <div>
                  <label className="form-label">Contact</label>
                  <input className="input-field" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">State</label>
                  <select className="input-field" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                    <option value="">Select state</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Financial Year</label>
                  <select className="input-field" value={form.financial_year} onChange={e => setForm(f => ({ ...f, financial_year: e.target.value }))}>
                    <option value="2023-24">2023-24</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26">2025-26</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : editTarget ? 'Update' : 'Create'}</button>
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}