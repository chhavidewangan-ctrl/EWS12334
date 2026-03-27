'use client';
import { useState, useEffect, useCallback } from 'react';
import { systemAPI } from '../../services/api';

const PRIORITY_C = { low:'secondary', medium:'info', high:'warning', urgent:'danger' };
const STATUS_C = { open:'warning', in_progress:'info', resolved:'success', closed:'secondary' };

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ subject:'', description:'', category:'general', priority:'medium' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    systemAPI.getTickets({ status: statusFilter })
      .then(res => setTickets(res.data.tickets || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await systemAPI.createTicket(form);
      setTickets(prev => [res.data.ticket, ...prev]);
      setShowModal(false);
      setForm({ subject:'', description:'', category:'general', priority:'medium' });
      showToast('Ticket created successfully!');
    } catch(err){ showToast(err.response?.data?.message || 'Failed', 'danger'); }
    finally { setSaving(false); }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    try {
      await systemAPI.replyTicket(selected._id, { message: reply });
      setReply('');
      const res = await systemAPI.getTickets();
      setTickets(res.data.tickets || []);
      const updated = res.data.tickets?.find(t => t._id === selected._id);
      if (updated) setSelected(updated);
      showToast('Reply sent');
    } catch { showToast('Failed to send reply', 'danger'); }
  };

  const handleStatus = async (id, status) => {
    try {
      await systemAPI.updateTicket(id, { status });
      setTickets(prev => prev.map(t => t._id===id ? {...t, status} : t));
      if (selected?._id === id) setSelected(prev => ({...prev, status}));
      showToast('Status updated');
    } catch { showToast('Update failed', 'danger'); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Support Tickets</h1>
          <p>IT helpdesk and issue tracking</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          New Ticket
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap:16 }}>
        <div>
          <div className="filter-bar" style={{ marginBottom:12 }}>
            <select className="form-control" style={{ width:130 }} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {['open','in_progress','resolved','closed'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {loading ? (
              <div className="loading-overlay"><div className="loading-spinner"></div></div>
            ) : tickets.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
                <h3>No tickets found</h3><p>Open a support ticket for any issues</p>
              </div>
            ) : tickets.map(t => (
              <div key={t._id} className="card" onClick={() => setSelected(t)}
                style={{ padding:16, cursor:'pointer', border: selected?._id===t._id ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <div style={{ display:'flex', gap:4 }}>
                    <span className={`tag tag-${STATUS_C[t.status]||'secondary'}`}>{t.status?.replace('_',' ')}</span>
                    <span className={`tag tag-${PRIORITY_C[t.priority]||'secondary'}`}>{t.priority}</span>
                  </div>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>#{t.ticketNumber}</span>
                </div>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{t.subject}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{t.category} · {new Date(t.createdAt).toLocaleDateString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="card" style={{ padding:20, height:'fit-content' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <div style={{ display:'flex', gap:6, marginBottom:6 }}>
                  <span className={`tag tag-${STATUS_C[selected.status]||'secondary'}`}>{selected.status?.replace('_',' ')}</span>
                  <span className={`tag tag-${PRIORITY_C[selected.priority]||'secondary'}`}>{selected.priority}</span>
                </div>
                <h3 style={{ fontSize:16, fontWeight:600 }}>{selected.subject}</h3>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
                  #{selected.ticketNumber} · {selected.category} · {new Date(selected.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
              <button className="icon-btn" onClick={() => setSelected(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ background:'var(--bg-hover)', borderRadius:'var(--radius-sm)', padding:12, marginBottom:16, fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
              {selected.description}
            </div>

            <div style={{ display:'flex', gap:4, marginBottom:16 }}>
              {['in_progress','resolved','closed'].map(s => (
                <button key={s} className={`btn btn-secondary btn-sm ${selected.status===s?'active':''}`}
                  onClick={() => handleStatus(selected._id, s)}
                  style={{ fontSize:11, textTransform:'capitalize' }}>
                  {s.replace('_',' ')}
                </button>
              ))}
            </div>

            {/* Replies */}
            {(selected.replies||[]).map((r,i) => (
              <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:12, marginBottom:8 }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>
                  {r.user?.firstName} {r.user?.lastName}
                  <span style={{ color:'var(--text-muted)', fontWeight:400, marginLeft:8 }}>{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{r.message}</div>
              </div>
            ))}

            {selected.status !== 'closed' && (
              <form onSubmit={handleReply} style={{ marginTop:12 }}>
                <textarea className="form-control" rows={3} value={reply} onChange={e=>setReply(e.target.value)} placeholder="Write a reply..." style={{ marginBottom:8 }} />
                <button type="submit" className="btn btn-primary btn-sm" disabled={!reply.trim()}>Send Reply</button>
              </form>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal modal-md" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>Open New Ticket</h2>
              <button className="icon-btn" onClick={()=>setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
                <style jsx>{`
                  div::-webkit-scrollbar { width: 4px; }
                  div::-webkit-scrollbar-track { background: transparent; }
                  div::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
                  textarea::-webkit-scrollbar { display: none; }
                  textarea { scrollbar-width: none; ms-overflow-style: none; resize: none; }
                `}</style>
                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <input className="form-control" required value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Briefly describe the issue" />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                      {['general','it','hr','payroll','leave','attendance','other'].map(c=><option key={c} value={c} style={{textTransform:'capitalize'}}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-control" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
                      {['low','medium','high','urgent'].map(p=><option key={p} value={p} style={{textTransform:'capitalize'}}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea className="form-control" required rows={5} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe the issue in detail..." />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="loading-spinner"></div>Submitting...</> : 'Submit Ticket'}
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
    </div>
  );
}
