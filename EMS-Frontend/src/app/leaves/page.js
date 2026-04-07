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
  const [rejectModal, setRejectModal] = useState({ show: false, id: null, reason: '' });

  const DateInput = ({ label, value, onChange, min, required }) => {
    // Helper to format YYYY-MM-DD to DD/MM/YYYY for display
    const formatDisplayDate = (dateStr) => {
      if (!dateStr) return 'dd/mm/yyyy';
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    };

    return (
      <div className="form-group">
        <label className="form-label">{label}</label>
        <div style={{ position: 'relative' }}>
          <input 
            type="date" 
            className="form-control" 
            required={required}
            value={value} 
            onChange={onChange}
            min={min}
            style={{ 
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
              opacity: 0, cursor: 'pointer', zIndex: 2 
            }}
          />
          <div className="form-control" style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg-primary)', color: value ? 'var(--text-primary)' : 'var(--text-muted)'
          }}>
            {formatDisplayDate(value)}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
        </div>
      </div>
    );
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${cleanPath}`.replace(/([^:]\/)\/+/g, "$1");
  };

  const statusColor = (s) => ({ approved: 'success', rejected: 'danger', pending: 'warning', cancelled: 'secondary' }[s] || 'secondary');

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

  const [viewLeave, setViewLeave] = useState(null);
  const [isEdit, setIsEdit] = useState(false);

  const openEdit = (l) => {
    setForm({
      ...l,
      startDate: new Date(l.startDate).toISOString().split('T')[0],
      endDate: new Date(l.endDate).toISOString().split('T')[0],
    });
    setIsEdit(true);
    setShowModal(true);
  };

  const canEdit = (startDate) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return start > today;
  };

  const handleStatus = (id, status) => {
    if (status === 'rejected') {
      setRejectModal({ show: true, id, reason: '' });
      return;
    }

    askConfirm(`Are you sure you want to ${status} this leave request?`, async () => {
      try {
        await leaveAPI.updateStatus(id, { status });
        fetchLeaves();
        showToast(`Leave ${status}`);
        setViewLeave(null);
      } catch { showToast('Operation failed', 'danger'); }
    });
  };

  const confirmRejection = async () => {
    if (!rejectModal.reason.trim()) {
      showToast('Please provide a reason for rejection', 'danger');
      return;
    }
    try {
      await leaveAPI.updateStatus(rejectModal.id, { 
        status: 'rejected', 
        rejectionReason: rejectModal.reason 
      });
      setRejectModal({ show: false, id: null, reason: '' });
      fetchLeaves();
      showToast('Leave request rejected');
      setViewLeave(null);
    } catch { showToast('Operation failed', 'danger'); }
  };

  const handleCancel = (id) => {
    askConfirm('Are you sure you want to cancel this leave request?', async () => {
      try {
        await leaveAPI.cancel(id);
        fetchLeaves();
        showToast('Leave cancelled');
        setViewLeave(null);
      } catch { showToast('Cancel failed', 'danger'); }
    });
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Leave Management</h1>
          <p>Apply and manage employee leaves</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setIsEdit(false); setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '', isHalfDay: false }); setShowModal(true); }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, overflow:'hidden', border:'1px solid var(--border)' }}>
                        {getImageUrl(l.employee?.user?.avatar || l.employee?.profilePhoto) ? (
                          <img src={getImageUrl(l.employee?.user?.avatar || l.employee?.profilePhoto)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        ) : (
                          <>{l.employee?.user?.firstName?.[0]}{l.employee?.user?.lastName?.[0]}</>
                        )}
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
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={() => setViewLeave(l)} className="btn btn-secondary btn-sm" style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="View Details">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>

                      {l.status === 'pending' && canEdit(l.startDate) && (
                        <button onClick={() => openEdit(l)} className="btn btn-primary btn-sm" style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit Leave">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      )}

                      {l.status === 'pending' && isAdmin() && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleStatus(l._id, 'approved')} style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Approve">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleStatus(l._id, 'rejected')} style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Reject">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </>
                      )}
                      
                      {l.status === 'pending' && !isAdmin() && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(l._id)} style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cancel Request">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
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
              <h2>{isEdit ? 'Edit Leave Application' : 'Apply for Leave'}</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              setError('');
              try {
                if (isEdit) {
                  await leaveAPI.update(form._id, form);
                  showToast('Leave application updated!');
                } else {
                  await leaveAPI.apply(form);
                  showToast('Leave application submitted!');
                }
                setShowModal(false);
                setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '', isHalfDay: false });
                fetchLeaves();
              } catch (err) { showToast(err.response?.data?.message || 'Operation failed', 'danger'); }
              finally { setSaving(false); }
            }} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
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
                  <DateInput 
                    label="Start Date *" 
                    value={form.startDate} 
                    onChange={e => setForm({...form, startDate: e.target.value})} 
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                  <DateInput 
                    label="End Date *" 
                    value={form.endDate} 
                    onChange={e => setForm({...form, endDate: e.target.value})} 
                    min={form.startDate || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <textarea className="form-control" required rows={3} placeholder="Please describe the reason for leave..." value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="loading-spinner"></div> Processing...</> : (isEdit ? 'Update Leave' : 'Apply Leave')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewLeave && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewLeave(null)}>
          <div className="modal modal-sm" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2>Leave Details</h2>
              <button className="icon-btn" onClick={() => setViewLeave(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', flex:1, paddingRight:12, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style jsx>{`
                div::-webkit-scrollbar { display: none; }
              `}</style>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div className="avatar" style={{ width: 44, height: 44, overflow:'hidden', border:'2px solid var(--border)' }}>
                  {getImageUrl(viewLeave.employee?.user?.avatar || viewLeave.employee?.profilePhoto) ? (
                    <img src={getImageUrl(viewLeave.employee?.user?.avatar || viewLeave.employee?.profilePhoto)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    <>{viewLeave.employee?.user?.firstName?.[0]}{viewLeave.employee?.user?.lastName?.[0]}</>
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, margin: 0 }}>{viewLeave.employee?.user?.firstName} {viewLeave.employee?.user?.lastName}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Applied on {new Date(viewLeave.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div>
                  <label className="form-label">Type</label>
                  <div style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{viewLeave.leaveType}</div>
                </div>
                <div>
                  <label className="form-label">Duration</label>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{viewLeave.totalDays} Days</div>
                </div>
                <div>
                  <label className="form-label">From</label>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{new Date(viewLeave.startDate).toLocaleDateString('en-IN')}</div>
                </div>
                <div>
                  <label className="form-label">To</label>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{new Date(viewLeave.endDate).toLocaleDateString('en-IN')}</div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Status</label>
                <div><span className={`tag tag-${statusColor(viewLeave.status)}`}>{viewLeave.status}</span></div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Reason</label>
                <div style={{ fontSize: 13, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>{viewLeave.reason}</div>
              </div>

              {viewLeave.approvedBy && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                  Processed by {viewLeave.approvedBy.firstName} {viewLeave.approvedBy.lastName}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {viewLeave.status === 'pending' && isAdmin() && (
                <>
                  <button className="btn btn-success" onClick={() => handleStatus(viewLeave._id, 'approved')}>Approve</button>
                  <button className="btn btn-danger" onClick={() => handleStatus(viewLeave._id, 'rejected')}>Reject</button>
                </>
              )}
              {viewLeave.status === 'pending' && !isAdmin() && (
                <button className="btn btn-danger" onClick={() => handleCancel(viewLeave._id)}>Cancel Request</button>
              )}
              <button className="btn btn-secondary" onClick={() => setViewLeave(null)}>Close</button>
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

      {/* Rejection Reason Modal */}
      {rejectModal.show && (
        <div className="modal-overlay" style={{ zIndex: 10001 }}>
          <div className="modal modal-sm" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Rejection Reason</h2>
              <button className="icon-btn" onClick={() => setRejectModal({ show: false, id: null, reason: '' })}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                Please provide a reason for rejecting this leave request. This will be visible to the employee.
              </p>
              <div className="form-group">
                <label className="form-label">Reason for Rejection *</label>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  required
                  placeholder="e.g. Critical project deadline, Insufficient coverage..." 
                  value={rejectModal.reason} 
                  onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRejectModal({ show: false, id: null, reason: '' })}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmRejection}>Confirm Rejection</button>
            </div>
          </div>
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
