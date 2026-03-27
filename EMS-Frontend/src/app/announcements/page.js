'use client';
import { useState, useEffect } from 'react';
import { systemAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AnnouncementsPage() {
  const { user, isAdmin, isManager, isHR } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title:'', content:'', type:'general', targetAudience:'all' });
  const [saving, setSaving] = useState(false);

  const canManage = isAdmin() || isManager() || isHR();

  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirm, setConfirm] = useState({ show: false, msg: '', onConfirm: null, id: null });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const askConfirm = (msg, onConfirm) => {
    setConfirm({ show: true, msg, onConfirm });
  };

  useEffect(() => {
    systemAPI.getAnnouncements()
      .then(res => setAnnouncements(res.data.announcements || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await systemAPI.createAnnouncement(form);
      setAnnouncements(prev => [res.data.announcement, ...prev]);
      setShowModal(false);
      setForm({ title:'', content:'', type:'general', targetAudience:'all' });
      showToast('Announcement published!');
    } catch(err) {
      const msg = err.response?.data?.details || err.response?.data?.message || 'Failed to publish announcement';
      showToast(msg, 'danger');
    } finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    askConfirm('Are you sure you want to delete this announcement?', async () => {
      try {
        await systemAPI.deleteAnnouncement(id);
        setAnnouncements(prev => prev.filter(a => a._id !== id));
        showToast('Announcement deleted');
      } catch { showToast('Delete failed', 'danger'); }
    });
  };

  const typeColor = { general:'secondary', important:'warning', urgent:'danger' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Announcements</h1>
          <p>Company-wide communications</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            New Announcement
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" style={{ width:36, height:36 }}></div></div>
      ) : announcements.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
          <h3>No announcements</h3>
          <p>Create the first announcement</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {announcements.map(a => (
            <div key={a._id} className="card" style={{ padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, marginBottom:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span className={`tag tag-${typeColor[a.type]||'secondary'}`}>{a.type}</span>
                    <span className="tag tag-secondary" style={{ textTransform:'capitalize' }}>{a.targetAudience}</span>
                    {a.isActive && <span className="tag tag-success">Active</span>}
                  </div>
                  <h3 style={{ fontSize:16, fontWeight:600 }}>{a.title}</h3>
                </div>
                {canManage && (
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => handleDelete(a._id)} className="btn btn-danger btn-sm">Delete</button>
                  </div>
                )}
              </div>
              <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6, marginBottom:8 }}>{a.content}</p>
              <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', gap:16 }}>
                {a.publishDate && <span>Published: {new Date(a.publishDate).toLocaleDateString('en-IN')}</span>}
                {a.expiryDate && <span>Expires: {new Date(a.expiryDate).toLocaleDateString('en-IN')}</span>}
                <span>By: {a.createdBy?.firstName} {a.createdBy?.lastName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && canManage && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal modal-md" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>New Announcement</h2>
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
                  input::-webkit-outer-spin-button,
                  input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                  input[type=number] { -moz-appearance: textfield; }
                `}</style>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-control" required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Announcement title" />
                </div>
                <div className="form-group">
                  <label className="form-label">Content *</label>
                  <textarea className="form-control" required rows={5} value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Write the announcement content..." />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-control" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                      <option value="general">Normal</option>
                      <option value="important">Important</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Audience</label>
                    <select className="form-control" value={form.targetAudience} onChange={e=>setForm({...form,targetAudience:e.target.value})}>
                      <option value="all">All</option>
                      <option value="employees">Employees</option>
                      <option value="managers">Managers</option>
                      <option value="hr">HR</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Publish Date</label>
                    <input type="date" className="form-control" value={form.publishDate||''} onChange={e=>setForm({...form,publishDate:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry Date</label>
                    <input type="date" className="form-control" value={form.expiryDate||''} onChange={e=>setForm({...form,expiryDate:e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="loading-spinner"></div>Publishing...</> : 'Publish'}
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
