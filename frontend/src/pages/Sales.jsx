import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Search, X, Eye, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const emptyItem = { stock_item_id: '', quantity: '', rate: '', gst_rate: '18', amount: 0, gst_amount: 0, total: 0 };

const generatePDF = (voucher, company) => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Header background
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 38, 'F');

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name || 'Company Name', 14, 14);

  // TAX INVOICE label
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('TAX INVOICE', pageW - 14, 10, { align: 'right' });

  // Company details
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  let headerY = 21;
  if (company.address) { doc.text(company.address, 14, headerY); headerY += 5; }
  if (company.gstin) { doc.text(`GSTIN: ${company.gstin}`, 14, headerY); headerY += 5; }
  if (company.contact) { doc.text(`Contact: ${company.contact}`, 14, headerY); }

  // Voucher number & date
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(voucher.voucher_no, pageW - 14, 22, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(new Date(voucher.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), pageW - 14, 30, { align: 'right' });

  // Bill To
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 14, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(voucher.party_name || '', 14, 58);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  let billY = 65;
  if (voucher.party_address) { doc.text(voucher.party_address, 14, billY); billY += 5; }
  if (voucher.party_phone) { doc.text(`Phone: ${voucher.party_phone}`, 14, billY); billY += 5; }
  if (voucher.party_gstin) { doc.text(`GSTIN: ${voucher.party_gstin}`, 14, billY); }

  // Items table — use Rs. instead of ₹ to avoid encoding issues
  const fmt = (n) => `Rs. ${parseFloat(n).toLocaleString('en-IN')}`;

  const tableRows = voucher.items?.map((item, i) => [
    i + 1,
    item.item_name,
    item.sku || '-',
    `${parseFloat(item.quantity)} ${item.unit || ''}`,
    fmt(item.rate),
    `${item.gst_rate}%`,
    fmt(item.gst_amount),
    fmt(item.total),
  ]) || [];

  autoTable(doc, {
    startY: 80,
    head: [['#', 'Item', 'SKU', 'Qty', 'Rate', 'GST%', 'GST Amt', 'Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 110, 245],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 40 },
      2: { cellWidth: 20 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'right', cellWidth: 30 },
      7: { halign: 'right', cellWidth: 30 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // Totals box
  const finalY = doc.lastAutoTable.finalY + 10;
  const boxW = 80;
  const boxX = pageW - 14 - boxW;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(boxX, finalY, boxW, 42, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  const labelX = boxX + 5;
  const valueX = boxX + boxW - 5;

  doc.text('Subtotal', labelX, finalY + 10);
  doc.setTextColor(30, 41, 59);
  doc.text(fmt(voucher.subtotal), valueX, finalY + 10, { align: 'right' });

  if (voucher.is_igst) {
    doc.setTextColor(100, 116, 139);
    doc.text('IGST', labelX, finalY + 20);
    doc.setTextColor(30, 41, 59);
    doc.text(fmt(voucher.igst_amount), valueX, finalY + 20, { align: 'right' });
  } else {
    doc.setTextColor(100, 116, 139);
    doc.text('CGST', labelX, finalY + 20);
    doc.setTextColor(30, 41, 59);
    doc.text(fmt(voucher.cgst_amount), valueX, finalY + 20, { align: 'right' });

    doc.setTextColor(100, 116, 139);
    doc.text('SGST', labelX, finalY + 30);
    doc.setTextColor(30, 41, 59);
    doc.text(fmt(voucher.sgst_amount), valueX, finalY + 30, { align: 'right' });
  }

  // Total dark bar
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(boxX, finalY + 34, boxW, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL', labelX, finalY + 41);
  doc.text(fmt(voucher.total_amount), valueX, finalY + 41, { align: 'right' });

  // Narration
  if (voucher.narration) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Note: ${voucher.narration}`, 14, finalY + 12);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY - 5, pageW - 14, footerY - 5);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a computer generated invoice.', 14, footerY);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, pageW - 14, footerY, { align: 'right' });

  doc.save(`${voucher.voucher_no}.pdf`);
  toast.success('PDF downloaded!');
};

export default function Sales() {
  const { company } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    ledger_id: '',
    narration: '',
    is_igst: false,
    items: [{ ...emptyItem }],
  });

  const fetchVouchers = async () => {
    try {
      const res = await api.get(`/companies/${company.id}/vouchers`, {
        params: { type: 'sales', ...(search ? { search } : {}) }
      });
      setVouchers(res.data);
    } catch { toast.error('Failed to load vouchers'); }
    finally { setLoading(false); }
  };

  const fetchMasters = async () => {
    try {
      const [custRes, stockRes] = await Promise.all([
        api.get(`/companies/${company.id}/ledgers`, { params: { type: 'customer' } }),
        api.get(`/companies/${company.id}/stock-items`),
      ]);
      setCustomers(custRes.data);
      setStockItems(stockRes.data);
    } catch { toast.error('Failed to load masters'); }
  };

  useEffect(() => { fetchVouchers(); }, [search]);

  const openCreate = async () => {
    await fetchMasters();
    setForm({
      date: new Date().toISOString().split('T')[0],
      ledger_id: '',
      narration: '',
      is_igst: false,
      items: [{ ...emptyItem }],
    });
    setShowModal(true);
  };

  const handleItemChange = (index, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[index] = { ...items[index], [field]: value };
      if (field === 'stock_item_id') {
        const found = stockItems.find(s => s.id === value);
        if (found) {
          items[index].rate = found.selling_price;
          items[index].gst_rate = found.gst_rate;
        }
      }
      const qty = parseFloat(items[index].quantity) || 0;
      const rate = parseFloat(items[index].rate) || 0;
      const gstRate = parseFloat(items[index].gst_rate) || 0;
      const amount = parseFloat((qty * rate).toFixed(2));
      const gst_amount = parseFloat(((amount * gstRate) / 100).toFixed(2));
      items[index].amount = amount;
      items[index].gst_amount = gst_amount;
      items[index].total = parseFloat((amount + gst_amount).toFixed(2));
      return { ...f, items };
    });
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));

  const removeItem = (index) => {
    if (form.items.length === 1) return toast.error('At least one item required');
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  };

  const totals = form.items.reduce((acc, item) => ({
    subtotal: acc.subtotal + (item.amount || 0),
    gst: acc.gst + (item.gst_amount || 0),
    total: acc.total + (item.total || 0),
  }), { subtotal: 0, gst: 0, total: 0 });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.ledger_id) return toast.error('Select a customer');
    const validItems = form.items.filter(i => i.stock_item_id && i.quantity && i.rate);
    if (!validItems.length) return toast.error('Add at least one item');
    setSaving(true);
    try {
      await api.post(`/companies/${company.id}/vouchers`, {
        type: 'sales',
        date: form.date,
        ledger_id: form.ledger_id,
        narration: form.narration,
        is_igst: form.is_igst,
        items: validItems,
      });
      toast.success('Sales voucher created!');
      setShowModal(false);
      fetchVouchers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this voucher? Stock will be reversed.')) return;
    try {
      await api.delete(`/companies/${company.id}/vouchers/${id}`);
      toast.success('Voucher deleted');
      fetchVouchers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleView = async (id) => {
    try {
      const res = await api.get(`/companies/${company.id}/vouchers/${id}`);
      setShowView(res.data);
    } catch { toast.error('Failed to load voucher'); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Sales Vouchers</h1>
          <p className="text-sm text-gray-500 mt-1">{vouchers.length} vouchers</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> New Sale <span className="text-xs opacity-60 ml-1">F8</span>
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search vouchers..."
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
        ) : vouchers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 mb-3">No sales vouchers yet</p>
            <button onClick={openCreate} className="btn-primary">Create First Sale</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Voucher No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subtotal</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">GST</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map(v => (
                <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm text-brand-600 font-medium">{v.voucher_no}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(v.date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm font-medium">{v.party_name}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">₹{parseFloat(v.subtotal).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-orange-600">
                    ₹{(parseFloat(v.cgst_amount) + parseFloat(v.sgst_amount) + parseFloat(v.igst_amount)).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-green-600">
                    ₹{parseFloat(v.total_amount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => handleView(v.id)} className="p-1.5 text-gray-400 hover:text-brand-500 rounded">
                        <Eye size={14} />
                      </button>
                      <button onClick={async () => { const res = await api.get(`/companies/${company.id}/vouchers/${v.id}`); generatePDF(res.data, company); }}
                        className="p-1.5 text-gray-400 hover:text-green-500 rounded" title="Download PDF">
                        <Download size={14} />
                      </button>
                      <button onClick={() => handleDelete(v.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-5">New Sales Voucher</h2>
            <form onSubmit={handleSave}>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="form-label">Customer *</label>
                  <select className="input-field" value={form.ledger_id}
                    onChange={e => setForm(f => ({ ...f, ledger_id: e.target.value }))} required>
                    <option value="">Select customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Date *</label>
                  <input type="date" className="input-field" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={form.is_igst}
                      onChange={e => setForm(f => ({ ...f, is_igst: e.target.checked }))} className="rounded" />
                    <span className="text-sm text-gray-600">Inter-state (IGST)</span>
                  </label>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">#</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Item</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Qty</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Rate (₹)</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">GST %</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Amount</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">GST</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Total</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-3 py-2 text-sm text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2">
                          <select className="input-field text-xs py-1.5" value={item.stock_item_id}
                            onChange={e => handleItemChange(i, 'stock_item_id', e.target.value)}>
                            <option value="">Select item</option>
                            {stockItems.map(s => <option key={s.id} value={s.id}>{s.name} (Stock: {s.current_qty})</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.001" className="input-field text-xs py-1.5 text-right w-24"
                            value={item.quantity} placeholder="0"
                            onChange={e => handleItemChange(i, 'quantity', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.01" className="input-field text-xs py-1.5 text-right w-28"
                            value={item.rate} placeholder="0.00"
                            onChange={e => handleItemChange(i, 'rate', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <select className="input-field text-xs py-1.5 w-20" value={item.gst_rate}
                            onChange={e => handleItemChange(i, 'gst_rate', e.target.value)}>
                            {['0','5','12','18','28'].map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-mono">₹{item.amount.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 text-right text-sm font-mono text-orange-600">₹{item.gst_amount.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 text-right text-sm font-mono font-semibold">₹{item.total.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500 p-1">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-3 py-2 bg-gray-50">
                  <button type="button" onClick={addItem}
                    className="text-sm text-brand-500 hover:text-brand-600 flex items-center gap-1">
                    <Plus size={14} /> Add Item
                  </button>
                </div>
              </div>

              <div className="flex justify-end mb-5">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-mono">₹{totals.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{form.is_igst ? 'IGST' : 'CGST + SGST'}</span>
                    <span className="font-mono text-orange-600">₹{totals.gst.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
                    <span>Total</span>
                    <span className="font-mono text-green-600">₹{totals.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <label className="form-label">Narration</label>
                <input className="input-field" value={form.narration}
                  onChange={e => setForm(f => ({ ...f, narration: e.target.value }))}
                  placeholder="Optional note..." />
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : 'Post Sales Voucher'}
                </button>
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold">{showView.voucher_no}</h2>
                <p className="text-sm text-gray-500">{new Date(showView.date).toLocaleDateString('en-IN')} · {showView.party_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => generatePDF(showView, company)}
                  className="btn-primary flex items-center gap-2 text-sm">
                  <Download size={14} /> Download PDF
                </button>
                <button onClick={() => setShowView(null)} className="text-gray-400 hover:text-gray-600 ml-2">
                  <X size={20} />
                </button>
              </div>
            </div>

            <table className="w-full mb-5">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Item</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Qty</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Rate</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">GST</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {showView.items?.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-sm">{item.item_name}</td>
                    <td className="px-3 py-2 text-sm text-right font-mono">{item.quantity} {item.unit}</td>
                    <td className="px-3 py-2 text-sm text-right font-mono">₹{parseFloat(item.rate).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-sm text-right font-mono text-orange-600">₹{parseFloat(item.gst_amount).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-sm text-right font-mono font-semibold">₹{parseFloat(item.total).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-56 space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-mono">₹{parseFloat(showView.subtotal).toLocaleString('en-IN')}</span></div>
                {showView.is_igst
                  ? <div className="flex justify-between text-sm"><span className="text-gray-500">IGST</span><span className="font-mono">₹{parseFloat(showView.igst_amount).toLocaleString('en-IN')}</span></div>
                  : <>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">CGST</span><span className="font-mono">₹{parseFloat(showView.cgst_amount).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">SGST</span><span className="font-mono">₹{parseFloat(showView.sgst_amount).toLocaleString('en-IN')}</span></div>
                  </>
                }
                <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
                  <span>Total</span>
                  <span className="font-mono text-green-600">₹{parseFloat(showView.total_amount).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}