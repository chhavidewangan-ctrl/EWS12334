'use client';
import { useState, useEffect, useCallback } from 'react';
import { erpAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = ['Travel', 'Food & Beverage', 'Office Supplies', 'Software', 'Hardware', 'Utilities', 'Marketing', 'Training', 'Maintenance', 'Miscellaneous'];
const PAYMENT_MODES = ['cash', 'bank_transfer', 'card', 'upi', 'cheque'];

const IMG_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function ExpensesPage() {
  const { isAdmin } = useAuth();
  const [viewReceipt, setViewReceipt] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editExp, setEditExp] = useState(null);
  const [form, setForm] = useState({ category: '', amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'cash', description: '', vendor: '' });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0, totalAmount: 0 });
  const [receiptFile, setReceiptFile] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirm, setConfirm] = useState({ show: false, msg: '', onConfirm: null, id: null });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpAPI.getExpenses({ page, limit: 12, status: statusFilter, category: categoryFilter });
      const data = res.data.expenses || [];
      setExpenses(data);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      setStats({
        total: res.data.total || 0,
        approved: data.filter(e => e.status === 'approved').length,
        pending: data.filter(e => e.status === 'pending').length,
        rejected: data.filter(e => e.status === 'rejected').length,
        totalAmount: data.reduce((s, e) => s + (e.amount || 0), 0),
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter, categoryFilter]);

  useEffect(() => { 
    fetchExpenses(); 
    erpAPI.getVendors({ limit: 100 }).then(r => setVendors(r.data.vendors || [])).catch(() => {});
  }, [fetchExpenses]);

  const openCreate = () => {
    setEditExp(null);
    setReceiptFile(null);
    setForm({ category: '', amount: '', date: new Date().toISOString().split('T')[0], paymentMode: 'cash', description: '', vendor: '' });
    setShowModal(true);
  };

  const openEdit = (exp) => {
    setEditExp(exp);
    setReceiptFile(null);
    setForm({ category: exp.category, amount: exp.amount, date: exp.date?.split('T')[0] || '', paymentMode: exp.paymentMode || 'cash', description: exp.description || '', vendor: exp.vendor || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Use FormData for file upload
    const formData = new FormData();
    Object.keys(form).forEach(key => formData.append(key, form[key]));
    if (receiptFile) formData.append('receipt', receiptFile);

    try {
      if (editExp) await erpAPI.updateExpense(editExp._id, formData);
      else await erpAPI.createExpense(formData);
      setShowModal(false);
      fetchExpenses();
      showToast(editExp ? 'Expense updated!' : 'Expense submitted!');
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'danger'); }
    finally { setSaving(false); }
  };

  const askDelete = (id) => {
    setConfirm({
      show: true,
      msg: 'Are you sure you want to delete this expense record?',
      onConfirm: async () => {
        try {
          await erpAPI.deleteExpense(id);
          fetchExpenses();
          showToast('Expense deleted', 'success');
        } catch (err) { showToast(err.response?.data?.message || 'Delete failed', 'danger'); }
      }
    });
  };

  const handleApprove = async (id, status) => {
    try { 
      await erpAPI.updateExpense(id, { status }); 
      fetchExpenses();
      showToast(`Expense ${status}!`);
    } catch { showToast('Operation failed', 'danger'); }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
  const statusColor = { pending: 'warning', approved: 'success', rejected: 'danger' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Expenses</h1>
          <p>Track and manage business expenses</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Add Expense
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total', value: stats.total, color: '#6366f1' },
          { label: 'Approved', value: stats.approved, color: '#10b981' },
          { label: 'Pending', value: stats.pending, color: '#f59e0b' },
          { label: 'Rejected', value: stats.rejected, color: '#ef4444' },
          { label: 'Total Amount', value: fmt(stats.totalAmount), color: '#0ea5e9' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: s.label === 'Total Amount' ? 18 : 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <select className="form-control" style={{ width: 160 }} value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-control" style={{ width: 130 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button className="btn btn-secondary" onClick={() => { setCategoryFilter(''); setStatusFilter(''); setPage(1); }}>Reset</button>
      </div>

      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Receipt</th>
                <th>Date</th>
                <th>Payment Mode</th>
                <th>Description</th>
                <th>Vendor</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9}><div className="loading-overlay"><div className="loading-spinner"></div></div></td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <h3>No expenses found</h3><p>Submit your first expense</p>
                  </div>
                </td></tr>
              ) : expenses.map(exp => (
                <tr key={exp._id}>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>
                        {exp.category === 'Travel' ? '✈️' : exp.category === 'Food & Beverage' ? '🍽️' : exp.category === 'Software' ? '💻' : exp.category === 'Marketing' ? '📣' : '📝'}
                      </span>
                      {exp.category}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 14 }}>{fmt(exp.amount)}</td>
                  <td>
                    {exp.receipt ? (
                      <div 
                        onClick={() => setViewReceipt(`${IMG_URL}${exp.receipt}`)}
                        style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Click to view receipt"
                      >
                        {exp.receipt.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img src={`${IMG_URL}${exp.receipt}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td>{new Date(exp.date).toLocaleDateString('en-IN')}</td>
                  <td style={{ textTransform: 'capitalize', fontSize: 12 }}>{exp.paymentMode?.replace('_', ' ')}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-secondary)' }}>{exp.description || '-'}</td>
                  <td style={{ fontSize: 12 }}>{exp.vendor || '-'}</td>
                  <td><span className={`tag tag-${statusColor[exp.status] || 'secondary'}`}>{exp.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {exp.status === 'pending' && (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(exp)}>Edit</button>
                          {isAdmin() && (
                            <>
                              <button className="btn btn-success btn-sm" onClick={() => handleApprove(exp._id, 'approved')}>✓</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleApprove(exp._id, 'rejected')}>✗</button>
                            </>
                          )}
                        </>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => askDelete(exp._id)}>Del</button>
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

      {viewReceipt && (
        <div className="modal-overlay" onClick={() => setViewReceipt(null)}>
          <div className="modal" style={{ maxWidth: '80vw', maxHeight: '80vh', padding: 10, background: 'none', border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button 
                onClick={() => setViewReceipt(null)}
                style={{ position: 'fixed', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', cursor: 'pointer', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
              {viewReceipt.match(/\.pdf$/i) ? (
                <iframe src={viewReceipt} style={{ width: '80vw', height: '80vh', borderRadius: 12, border: '1px solid var(--border)' }}></iframe>
              ) : (
                <img src={viewReceipt} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', objectFit: 'contain' }} />
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-md" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>{editExp ? 'Edit Expense' : 'Add Expense'}</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
                <style jsx>{`
                  div::-webkit-scrollbar { width: 4px; }
                  div::-webkit-scrollbar-track { background: transparent; }
                  div::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
                  textarea::-webkit-scrollbar { display: none; }
                  textarea { scrollbar-width: none; ms-overflow-style: none; resize: none; }
                  input::-webkit-outer-spin-button,
                  input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                  input[type=number] { -moz-appearance: textfield; }
                `}</style>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select className="form-control" required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      <option value="">Select Category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (₹) *</label>
                    <input type="number" className="form-control" required min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-control" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select className="form-control" value={form.paymentMode} onChange={e => setForm({ ...form, paymentMode: e.target.value })}>
                      {PAYMENT_MODES.map(m => <option key={m} value={m} style={{ textTransform: 'capitalize' }}>{m.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Vendor / Paid To</label>
                    <select className="form-control" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })}>
                      <option value="">Select Vendor</option>
                      {vendors.map(v => <option key={v._id} value={v.name}>{v.name}</option>)}
                    </select>
                  </div>
                  {form.paymentMode !== 'cash' && (
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Payment Script / Receipt</label>
                      <input type="file" className="form-control" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files[0])} style={{ padding: '8px 12px' }} />
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Required for non-cash payments (Max 10MB)</p>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Expense details..." />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="loading-spinner"></div> Saving...</> : (editExp ? 'Update' : 'Submit Expense')}
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
              <button className="btn btn-danger" onClick={() => { confirm.onConfirm(); setConfirm({ ...confirm, show: false }); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
