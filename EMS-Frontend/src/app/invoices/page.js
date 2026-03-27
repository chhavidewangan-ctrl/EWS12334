'use client';
import { useState, useEffect, useCallback } from 'react';
import { erpAPI } from '../../services/api';

const TAX_RATES = [0, 5, 12, 18, 28];
const statusColor = { draft: 'secondary', sent: 'info', paid: 'success', overdue: 'danger', cancelled: 'secondary' };
const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [form, setForm] = useState({ client: '', invoiceDate: new Date().toISOString().split('T')[0], dueDate: '', items: [{ description: '', quantity: 1, rate: 0 }], taxRate: 18, discount: 0, notes: '', terms: 'Payment due within 30 days' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirm, setConfirm] = useState({ show: false, msg: '', onConfirm: null, id: null });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const askConfirm = (msg, onConfirm) => {
    setConfirm({ show: true, msg, onConfirm });
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpAPI.getInvoices({ page, limit: 10, status: statusFilter });
      setInvoices(res.data.invoices || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { erpAPI.getClients({ limit: 100 }).then(r => setClients(r.data.clients || [])).catch(() => {}); }, []);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, rate: 0 }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [field]: val }; return { ...f, items }; });

  const subtotal = form.items.reduce((s, i) => s + Number(i.quantity) * Number(i.rate), 0);
  const discountAmt = (subtotal * Number(form.discount)) / 100;
  const taxableAmt = subtotal - discountAmt;
  const taxAmt = (taxableAmt * Number(form.taxRate)) / 100;
  const grandTotal = taxableAmt + taxAmt;

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await erpAPI.createInvoice({ ...form, subtotal, discountAmount: discountAmt, taxAmount: taxAmt, total: grandTotal });
      setShowModal(false);
      setForm({ client: '', invoiceDate: new Date().toISOString().split('T')[0], dueDate: '', items: [{ description: '', quantity: 1, rate: 0 }], taxRate: 18, discount: 0, notes: '', terms: 'Payment due within 30 days' });
      fetchInvoices();
      showToast('Invoice created successfully!');
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'danger'); } finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    askConfirm('Delete this invoice?', async () => {
      try {
        await erpAPI.deleteInvoice(id);
        fetchInvoices();
        showToast('Invoice deleted');
      } catch { showToast('Delete failed', 'danger'); }
    });
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await erpAPI.updateInvoice(id, { status });
      fetchInvoices();
      showToast(`Invoice marked as ${status}`);
    } catch { showToast('Update failed', 'danger'); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Invoices</h1><p>Create and manage client invoices</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          New Invoice
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total', value: total, color: '#6366f1' },
          { label: 'Paid', value: invoices.filter(i => i.status === 'paid').length, color: '#10b981' },
          { label: 'Sent', value: invoices.filter(i => i.status === 'sent').length, color: '#0ea5e9' },
          { label: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <select className="form-control" style={{ width: 140 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {['draft','sent','paid','overdue','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={() => { setStatusFilter(''); setPage(1); }}>Reset</button>
      </div>

      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr><th>Invoice #</th><th>Client</th><th>Date</th><th>Due Date</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><div className="loading-overlay"><div className="loading-spinner"></div></div></td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <h3>No invoices yet</h3><p>Create your first invoice</p>
                </div></td></tr>
              ) : invoices.map(inv => (
                <tr key={inv._id}>
                  <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{inv.invoiceNumber}</span></td>
                  <td>{inv.client?.name || '-'}</td>
                  <td>{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                  <td style={{ color: inv.status === 'overdue' ? 'var(--danger)' : 'inherit' }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : '-'}</td>
                  <td>{fmt(inv.subtotal)}</td>
                  <td>{fmt(inv.taxAmount)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(inv.total)}</td>
                  <td><span className={`tag tag-${statusColor[inv.status] || 'secondary'}`}>{inv.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowPreview(inv)}>View</button>
                      {inv.status === 'draft' && <button className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate(inv._id, 'sent')}>Send</button>}
                      {inv.status === 'sent' && <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(inv._id, 'paid')}>Paid</button>}
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(inv._id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '0 16px' }}>
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-md" style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>Create Invoice</h2>
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
                      <option value="">Select Client</option>
                      {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Invoice Date *</label>
                    <input type="date" className="form-control" required value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="date" className="form-control" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Rate (%)</label>
                    <select className="form-control" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: Number(e.target.value) })}>
                      {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                </div>

                {/* Line items */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label className="form-label" style={{ margin: 0 }}>Line Items</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ Add Line</button>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>Description *</th><th style={{ width: 80 }}>Qty</th><th style={{ width: 130 }}>Rate (₹)</th><th style={{ width: 130 }}>Amount</th><th style={{ width: 40 }}></th></tr></thead>
                      <tbody>
                        {form.items.map((item, i) => (
                          <tr key={i}>
                            <td><input className="form-control" required placeholder="Service or product" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} /></td>
                            <td><input type="number" className="form-control" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} /></td>
                            <td><input type="number" className="form-control" min="0" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} /></td>
                            <td style={{ fontWeight: 600 }}>{fmt(Number(item.quantity) * Number(item.rate))}</td>
                            <td>{form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <div style={{ width: 260 }}>
                      {[['Subtotal', fmt(subtotal)], [`Discount (${form.discount}%)`, `-${fmt(discountAmt)}`], [`GST (${form.taxRate}%)`, fmt(taxAmt)]].map(([l, v], idx) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{l}
                            {idx === 1 && <input type="number" min="0" max="100" value={form.discount} onChange={e => setForm({ ...form, discount: Number(e.target.value) })}
                              style={{ width: 45, marginLeft: 6, border: '1px solid var(--border)', borderRadius: 4, padding: '1px 4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }} />}
                          </span>
                          <span>{v}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 18, fontWeight: 800 }}>
                        <span>Total</span><span style={{ color: 'var(--primary)' }}>{fmt(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Terms & Conditions</label>
                    <textarea className="form-control" rows={2} value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="loading-spinner"></div> Creating...</> : `Create Invoice — ${fmt(grandTotal)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPreview(null)}>
          <div className="modal modal-md" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>Invoice — {showPreview.invoiceNumber}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ Print</button>
                <button className="icon-btn" onClick={() => setShowPreview(null)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
              <style jsx>{`
                div::-webkit-scrollbar { width: 4px; }
                div::-webkit-scrollbar-track { background: transparent; }
                div::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
              `}</style>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)' }}>INVOICE</div>
                  <div style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{showPreview.invoiceNumber}</div>
                </div>
                <span className={`tag tag-${statusColor[showPreview.status]}`} style={{ fontSize: 13, padding: '6px 14px', alignSelf: 'flex-start' }}>{showPreview.status?.toUpperCase()}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Bill To</div>
                  <div style={{ fontWeight: 600 }}>{showPreview.client?.name || '-'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{showPreview.client?.email}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <div>Date: <strong>{new Date(showPreview.invoiceDate).toLocaleDateString('en-IN')}</strong></div>
                  {showPreview.dueDate && <div style={{ marginTop: 4 }}>Due: <strong style={{ color: 'var(--danger)' }}>{new Date(showPreview.dueDate).toLocaleDateString('en-IN')}</strong></div>}
                </div>
              </div>
              <div className="table-wrapper" style={{ marginBottom: 16 }}>
                <table>
                  <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                  <tbody>
                    {(showPreview.items || []).map((item, i) => (
                      <tr key={i}>
                        <td>{item.description}</td><td>{item.quantity}</td><td>{fmt(item.rate)}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(item.quantity * item.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 240 }}>
                  {[['Subtotal', fmt(showPreview.subtotal)], [`GST (${showPreview.taxRate || 0}%)`, fmt(showPreview.taxAmount)]].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <span>{l}</span><span>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid var(--border)', fontWeight: 900, fontSize: 20 }}>
                    <span>Total</span><span style={{ color: 'var(--primary)' }}>{fmt(showPreview.total)}</span>
                  </div>
                </div>
              </div>
              {showPreview.notes && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-hover)', borderRadius: 8, padding: 10 }}><strong>Notes:</strong> {showPreview.notes}</div>}
              {showPreview.terms && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}><strong>Terms:</strong> {showPreview.terms}</div>}
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setShowPreview(null)}>Close</button>
            </div>
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
              <button className="btn btn-danger" onClick={() => { confirm.onConfirm(); setConfirm({ ...confirm, show: false }); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
