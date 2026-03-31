'use client';
import { useState, useEffect, useCallback } from 'react';
import { erpAPI } from '../../services/api';

const PAYMENT_MODES = ['cash', 'bank_transfer', 'card', 'upi', 'cheque'];
const PAYMENT_STATUS = ['pending', 'paid', 'partial', 'overdue'];

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ client: '', date: new Date().toISOString().split('T')[0], items: [{ product: '', name: '', quantity: 1, rate: 0 }], paymentMode: 'bank_transfer', paymentStatus: 'pending', notes: '' });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, totalAmount: 0 });
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirm, setConfirm] = useState({ show: false, msg: '', onConfirm: null, id: null });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const askConfirm = (msg, onConfirm) => {
    setConfirm({ show: true, msg, onConfirm });
  };

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpAPI.getSales({ page, limit: 10 });
      const data = res.data.sales || [];
      setSales(data);
      setTotal(res.data.total || 0);
      setStats({
        total: res.data.total || 0,
        paid: data.filter(s => s.paymentStatus === 'paid').length,
        pending: data.filter(s => s.paymentStatus === 'pending').length,
        totalAmount: data.reduce((sum, s) => sum + (s.total || 0), 0),
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchSales(); }, [fetchSales]);
  useEffect(() => {
    erpAPI.getClients({ limit: 100 }).then(r => setClients(r.data.clients || [])).catch(() => {});
    erpAPI.getInventory({ limit: 100 }).then(r => setInventory(r.data.items || [])).catch(() => {});
  }, []);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product: '', name: '', quantity: 1, rate: 0 }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[i] = { ...items[i], [field]: value };
      if (field === 'product') {
        const inv = inventory.find(it => it._id === value);
        if (inv) { items[i].name = inv.name; items[i].rate = inv.sellingPrice; }
      }
      return { ...f, items };
    });
  };

  const subtotal = form.items.reduce((s, i) => s + (Number(i.quantity) * Number(i.rate)), 0);
  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    const processedItems = form.items.map(it => ({
      ...it,
      amount: Number(it.quantity) * Number(it.rate)
    }));
    try {
      await erpAPI.createSale({ ...form, items: processedItems, subtotal, total: subtotal });
      setShowModal(false);
      setForm({ client: '', date: new Date().toISOString().split('T')[0], items: [{ product: '', name: '', quantity: 1, rate: 0 }], paymentMode: 'bank_transfer', paymentStatus: 'pending', notes: '' });
      fetchSales();
      showToast('Sale recorded successfully!');
    } catch (err) { showToast(err.response?.data?.message || 'Failed to create sale', 'danger'); }
    finally { setSaving(false); }
  };

  const handlePrint = async (id) => {
    try {
      const res = await erpAPI.getSaleById(id);
      const sale = res.data.sale;
      const printWindow = window.open('', '_blank');
      const html = `
        <html>
          <head>
            <title>Sale ${sale.salesNumber}</title>
            <style>
              body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
              .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
              .company-info h1 { margin: 0; color: #6366f1; font-size: 24px; }
              .invoice-details { text-align: right; }
              .invoice-details h2 { margin: 0; font-size: 20px; color: #64748b; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
              .section-title { font-size: 12px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { text-align: left; background: #f8fafc; padding: 12px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0; }
              td { padding: 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
              .totals { margin-left: auto; width: 250px; }
              .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
              .grand-total { font-weight: 700; font-size: 18px; color: #1e293b; border-top: 2px solid #f1f5f9; margin-top: 10px; padding-top: 10px; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-info">
                <h1>${sale.company?.name || 'ERP System'}</h1>
                <p>${sale.company?.email || ''}</p>
                <p>${sale.company?.phone || ''}</p>
              </div>
              <div class="invoice-details">
                <h2>SALE RECEIPT</h2>
                <p style="font-weight: 600; font-size: 16px; margin: 5px 0;">#${sale.salesNumber}</p>
                <p>Date: ${new Date(sale.date).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
            
            <div class="grid">
              <div>
                <div class="section-title">Bill To</div>
                <div style="font-weight: 600; font-size: 15px;">${sale.client?.name || 'Walking Customer'}</div>
                <div style="color: #64748b;">${sale.client?.phone || ''}</div>
                <div style="color: #64748b;">${sale.client?.address || ''}</div>
              </div>
              <div style="text-align: right;">
                <div class="section-title">Payment Info</div>
                <div>Status: <strong style="color: ${sale.paymentStatus === 'paid' ? '#10b981' : '#f59e0b'}">${sale.paymentStatus.toUpperCase()}</strong></div>
                <div>Method: ${sale.paymentMode?.replace('_', ' ').toUpperCase()}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: center; width: 60px;">Qty</th>
                  <th style="text-align: right; width: 100px;">Rate</th>
                  <th style="text-align: right; width: 120px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${sale.items.map(item => `
                  <tr>
                    <td>${item.name || item.product?.name || 'Product'}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: right;">₹${(item.rate || 0).toLocaleString()}</td>
                    <td style="text-align: right; font-weight: 600;">₹${(item.amount || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row"><span>Subtotal</span><span>₹${(sale.subtotal || 0).toLocaleString()}</span></div>
              <div class="total-row"><span>Tax</span><span>₹${(sale.taxTotal || 0).toLocaleString()}</span></div>
              <div class="total-row grand-total"><span>Total Revenue</span><span>₹${(sale.total || 0).toLocaleString()}</span></div>
            </div>

            <div style="margin-top: 80px; padding-top: 20px; border-top: 1px dashed #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
              This is a computer generated receipt and does not require a physical signature.
            </div>
            
            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 500);
              }
            </script>
          </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (err) {
      console.error(err);
      showToast('Failed to generate print view', 'danger');
    }
  };

  const statusColor = { pending: 'warning', paid: 'success', partial: 'info', overdue: 'danger' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Sales</h1>
          <p>Track sales transactions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          New Sale
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Sales', value: stats.total, color: '#6366f1' },
          { label: 'Paid', value: stats.paid, color: '#10b981' },
          { label: 'Pending', value: stats.pending, color: '#f59e0b' },
          { label: 'Total Revenue', value: fmt(stats.totalAmount), color: '#0ea5e9' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Sale #</th>
                <th>Client</th>
                <th>Date</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Total</th>
                <th>Payment Mode</th>
                <th>Status</th>
                <th style={{ width: 60 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><div className="loading-overlay"><div className="loading-spinner"></div></div></td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    <h3>No sales yet</h3><p>Record your first sale</p>
                  </div>
                </td></tr>
              ) : sales.map(s => (
                <tr key={s._id}>
                  <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{s.salesNumber}</span></td>
                  <td>{s.client?.name || '-'}</td>
                  <td>{new Date(s.date).toLocaleDateString('en-IN')}</td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.items?.length || 0} item(s)</span></td>
                  <td>{fmt(s.subtotal)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(s.total)}</td>
                  <td style={{ textTransform: 'capitalize', fontSize: 12 }}>{s.paymentMode?.replace('_', ' ')}</td>
                  <td><span className={`tag tag-${statusColor[s.paymentStatus] || 'secondary'}`}>{s.paymentStatus}</span></td>
                  <td>
                    <button onClick={() => handlePrint(s._id)} className="btn btn-secondary btn-sm" title="Print Receipt" style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '0 16px' }}>
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(Math.ceil(total / 10), 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {/* New Sale Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-md" style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>New Sale</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
                <style jsx>{`
                  div::-webkit-scrollbar { width: 4px; }
                  div::-webkit-scrollbar-track { background: transparent; }
                  div::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
                `}</style>
                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Client</label>
                    <select className="form-control" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })}>
                      <option value="">Select Client (optional)</option>
                      {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sale Date *</label>
                    <input type="date" className="form-control" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select className="form-control" value={form.paymentMode} onChange={e => setForm({ ...form, paymentMode: e.target.value })}>
                      {PAYMENT_MODES.map(m => <option key={m} value={m} style={{ textTransform: 'capitalize' }}>{m.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Status</label>
                    <select className="form-control" value={form.paymentStatus} onChange={e => setForm({ ...form, paymentStatus: e.target.value })}>
                      {PAYMENT_STATUS.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Items */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label className="form-label" style={{ margin: 0 }}>Sale Items *</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ Add Item</button>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Item / Description</th>
                          <th style={{ width: 80 }}>Qty</th>
                          <th style={{ width: 120 }}>Unit Price (₹)</th>
                          <th style={{ width: 120 }}>Amount</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((item, i) => (
                          <tr key={i}>
                            <td>
                              <select className="form-control" value={item.product} onChange={e => updateItem(i, 'product', e.target.value)} style={{ marginBottom: 4 }}>
                                <option value="">Select from inventory</option>
                                {inventory.map(inv => <option key={inv._id} value={inv._id}>{inv.name} (Stock: {inv.quantity})</option>)}
                              </select>
                              <input className="form-control" placeholder="Or type description" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} style={{ fontSize: 12 }} />
                            </td>
                            <td><input type="number" className="form-control" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} /></td>
                            <td><input type="number" className="form-control" min="0" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} /></td>
                            <td style={{ fontWeight: 600 }}>{fmt(Number(item.quantity) * Number(item.rate))}</td>
                            <td>
                              {form.items.length > 1 && (
                                <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>×</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 24 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Subtotal</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{fmt(subtotal)}</div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." style={{ resize: 'none' }} />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="loading-spinner"></div> Saving...</> : `Create Sale — ${fmt(subtotal)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Toast */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`} style={{
          position: 'fixed', top: 20, right: 20, padding: '12px 20px', borderRadius: 8,
          background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500 }}>
            {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
          </div>
          <style jsx>{`
            @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          `}</style>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirm.show && (
        <div className="modal-overlay" style={{ zIndex: 10001 }}>
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center', padding: 24 }}>
            <div style={{ color: 'var(--danger)', marginBottom: 16 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3 style={{ marginBottom: 8, fontSize: 18 }}>Are you sure?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>{confirm.msg}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setConfirm({ ...confirm, show: false })}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { confirm.onConfirm(); setConfirm({ ...confirm, show: false }); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
