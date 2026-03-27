'use client';
import { useState, useEffect, useCallback } from 'react';
import { leaveAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const LEAVE_TYPES = ['casual','sick','earned','maternity','paternity','compensatory','unpaid','other'];

export default function LeavesPage() {
  const { isAdmin } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ leaveType: 'casual', startDate: '', endDate: '', reason: '', isHalfDay: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leaveAPI.getAll({ page, limit: 10, status: statusFilter });
      setLeaves(res.data.leaves);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirm, setConfirm] = useState({ show: false, msg: '', onConfirm: null, id: null });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const askConfirm = (msg, onConfirm) => {
    setConfirm({ show: true, msg, onConfirm });
  };

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);



  const handleApply = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await leaveAPI.apply(form);
      setShowModal(false);
      setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '', isHalfDay: false });
      fetchLeaves();
      showToast('Leave application submitted!');
    } catch (err) { showToast(err.response?.data?.message || 'Failed to apply leave', 'danger'); }
    finally { setSaving(false); }
  };

  const handleStatus = (id, status) => {
    askConfirm(`Are you sure you want to ${status} this leave request?`, async () => {
      try {
        await leaveAPI.updateStatus(id, { status });
        fetchLeaves();
        showToast(`Leave ${status}`);
      } catch { showToast('Operation failed', 'danger'); }
    });
  };

  const handleCancel = (id) => {
    askConfirm('Are you sure you want to cancel this leave request?', async () => {
      try {
        await leaveAPI.cancel(id);
        fetchLeaves();
        showToast('Leave cancelled');
      } catch { showToast('Cancel failed', 'danger'); }
    });
  };

  const statusColor = (s) => ({ approved: 'success', rejected: 'danger', pending: 'warning', cancelled: 'secondary' }[s] || 'secondary');

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Leave Management</h1>
          <p>Apply and manage employee leaves</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Apply Leave
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select className="form-control" style={{ width: 140 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {['pending','approved','rejected','cancelled'].map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={() => { setStatusFilter(''); setPage(1); }}>Reset</button>
      </div>

      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><div className="loading-overlay"><div className="loading-spinner"></div></div></td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <h3>No leaves found</h3><p>No leave requests match the current filter</p>
                </div></td></tr>
              ) : leaves.map(l => (
                <tr key={l._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                        {l.employee?.user?.firstName?.[0]}{l.employee?.user?.lastName?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{l.employee?.user?.firstName} {l.employee?.user?.lastName}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ textTransform: 'capitalize' }}>{l.leaveType}</span></td>
                  <td>{new Date(l.startDate).toLocaleDateString('en-IN')}</td>
                  <td>{new Date(l.endDate).toLocaleDateString('en-IN')}</td>
                  <td>{l.isHalfDay ? '0.5' : l.totalDays}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason}</td>
                  <td><span className={`tag tag-${statusColor(l.status)}`}>{l.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {l.status === 'pending' && isAdmin() && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleStatus(l._id, 'approved')}>✓</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleStatus(l._id, 'rejected')}>✗</button>
                        </>
                      )}
                      {l.status === 'pending' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleCancel(l._id)}>Cancel</button>
                      )}
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

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-md" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>Apply for Leave</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
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
                    <label className="form-label">Leave Type *</label>
                    <select className="form-control" required value={form.leaveType} onChange={e => setForm({...form, leaveType: e.target.value})}>
                      {LEAVE_TYPES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Half Day?</label>
                    <select className="form-control" value={form.isHalfDay ? 'yes' : 'no'} onChange={e => setForm({...form, isHalfDay: e.target.value === 'yes'})}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input type="date" className="form-control" required value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <input type="date" className="form-control" required value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} min={form.startDate} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <textarea className="form-control" required rows={3} placeholder="Please describe the reason for leave..." value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="loading-spinner"></div> Applying...</> : 'Apply Leave'}
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
              <button className="btn btn-primary" onClick={() => { confirm.onConfirm(); setConfirm({ ...confirm, show: false }); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
