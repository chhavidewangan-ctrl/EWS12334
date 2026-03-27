'use client';
import { useState, useEffect, useCallback } from 'react';
import { projectAPI } from '../../services/api';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

const PRIORITY_COLORS = { low: 'secondary', medium: 'info', high: 'warning', critical: 'danger' };
const STATUS_COLORS = { planning: 'secondary', active: 'success', on_hold: 'warning', completed: 'info', cancelled: 'danger' };

export default function ProjectsPage() {
  const { isManager, isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [viewProject, setViewProject] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', status: 'planning', priority: 'medium', startDate: '', endDate: '', budget: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirm, setConfirm] = useState({ show: false, msg: '', onConfirm: null, id: null });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectAPI.getAll({ page, limit: 9, status, search });
      setProjects(res.data.projects);
      setTotalPages(res.data.totalPages || 1);
    } catch { } finally { setLoading(false); }
  }, [page, status, search]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const openEdit = (p) => {
    setForm({
      ...p,
      startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
      endDate: p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : ''
    });
    setIsEdit(true);
    setShowModal(true);
    setViewProject(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await projectAPI.update(form._id, form);
        showToast('Project updated!');
      } else {
        await projectAPI.create(form);
        showToast('Project created!');
      }
      setShowModal(false);
      setIsEdit(false);
      setForm({ name: '', description: '', status: 'planning', priority: 'medium', startDate: '', endDate: '', budget: '' });
      fetchProjects();
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'danger'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    setConfirm({
      show: true,
      msg: 'Are you sure you want to delete this project?',
      onConfirm: async () => {
        try {
          await projectAPI.delete(id);
          fetchProjects();
          showToast('Project deleted');
        } catch { showToast('Delete failed', 'danger'); }
      }
    });
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Projects</h1>
          <p>Manage projects and track progress</p>
        </div>
        {isManager() && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            New Project
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" /></svg>
          <input placeholder="Search projects..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-control" style={{ width: 130 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {['planning', 'active', 'on_hold', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" style={{ width: 36, height: 36 }}></div></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          <h3>No projects found</h3><p>Create your first project</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
          {projects.map(p => (
            <div key={p._id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <span className={`tag tag-${STATUS_COLORS[p.status] || 'secondary'}`}>{p.status}</span>
                    <span className={`tag tag-${PRIORITY_COLORS[p.priority] || 'secondary'}`}>{p.priority}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</h3>
                  {p.client && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.client.name}</div>}
                </div>
              </div>
              {p.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>{p.description.slice(0, 100)}{p.description.length > 100 ? '...' : ''}</p>}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>Progress</span>
                  <span>{p.progress || 0}%</span>
                </div>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${p.progress || 0}%` }}></div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                {p.startDate && <div>Start: {new Date(p.startDate).toLocaleDateString('en-IN')}</div>}
                {p.endDate && <div>End: {new Date(p.endDate).toLocaleDateString('en-IN')}</div>}
                {p.budget > 0 && <div>Budget: ₹{p.budget.toLocaleString('en-IN')}</div>}
                <div>Team: {p.team?.length || 0} members</div>
              </div>
              {p.projectManager && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 12 }}>
                  <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>
                    {p.projectManager?.user?.firstName?.[0]}{p.projectManager?.user?.lastName?.[0]}
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>{p.projectManager?.user?.firstName} {p.projectManager?.user?.lastName}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setViewProject(p)} className="btn btn-primary btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  View
                </button>
                {isManager() && (
                  <button onClick={() => openEdit(p)} className="btn btn-secondary btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    Edit
                  </button>
                )}
                {isAdmin() && (
                  <button onClick={() => handleDelete(p._id)} className="btn btn-danger btn-sm" style={{ padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-6 5v6m4-6v6" /></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
            <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setIsEdit(false); setForm({ name: '', description: '', status: 'planning', priority: 'medium', startDate: '', endDate: '', budget: '' }); } }}>
          <div className="modal modal-md" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>{isEdit ? 'Edit Project' : 'Create New Project'}</h2>
              <button className="icon-btn" onClick={() => { setShowModal(false); setIsEdit(false); setForm({ name: '', description: '', status: 'planning', priority: 'medium', startDate: '', endDate: '', budget: '' }); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
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
                  <label className="form-label">Project Name *</label>
                  <input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Project Alpha" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {['planning', 'active', 'on_hold', 'completed'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-control" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-control" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input type="date" className="form-control" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Budget (₹)</label>
                    <input type="number" className="form-control" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="0" />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setIsEdit(false); setForm({ name: '', description: '', status: 'planning', priority: 'medium', startDate: '', endDate: '', budget: '' }); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="loading-spinner"></div> Saving...</> : (isEdit ? 'Update Project' : 'Create Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewProject && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewProject(null)}>
          <div className="modal modal-md" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={`tag tag-${STATUS_COLORS[viewProject.status] || 'secondary'}`} style={{ height: 20, display: 'flex', alignItems: 'center', fontSize: 10 }}>{viewProject.status}</div>
                <h2 style={{ fontSize: 18 }}>{viewProject.name}</h2>
              </div>
              <button className="icon-btn" onClick={() => setViewProject(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: 12 }}>
              <style jsx>{`
                div::-webkit-scrollbar { width: 4px; }
                div::-webkit-scrollbar-track { background: transparent; }
                div::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
              `}</style>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div className="card" style={{ padding: 12, background: 'var(--bg-alt)', border: '1px solid var(--border)' }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>PRIORITY</label>
                  <span className={`tag tag-${PRIORITY_COLORS[viewProject.priority] || 'secondary'}`} style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 600 }}>{viewProject.priority}</span>
                </div>
                <div className="card" style={{ padding: 12, background: 'var(--bg-alt)', border: '1px solid var(--border)' }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>EST. BUDGET</label>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>₹{viewProject.budget?.toLocaleString('en-IN') || 0}</span>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 11, color: 'var(--primary)', marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Project Description</h4>
                <div style={{ padding: 16, borderLeft: '3px solid var(--primary)', background: 'rgba(99,102,241,0.03)', fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {viewProject.description || 'No description provided.'}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 11, color: 'var(--primary)', marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Timeline & Progress</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: 16, border: '1px solid var(--border)', borderRadius: 12 }}>
                  <div>
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)' }}>START DATE</span>
                    <span style={{ fontWeight: 600 }}>{viewProject.startDate ? new Date(viewProject.startDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)' }}>END DATE</span>
                    <span style={{ fontWeight: 600 }}>{viewProject.endDate ? new Date(viewProject.endDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                  </div>
                  <div style={{ gridColumn: '1 / span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                      <span>Current Progress</span>
                      <span>{viewProject.progress || 0}%</span>
                    </div>
                    <div className="progress" style={{ height: 6 }}><div className="progress-bar" style={{ width: `${viewProject.progress || 0}%` }}></div></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setViewProject(null)}>Close View</button>
              {isManager() && (
                <button className="btn btn-primary" onClick={() => openEdit(viewProject)}>Edit Project</button>
              )}
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
