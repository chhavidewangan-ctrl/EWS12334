'use client';
import { useState, useEffect } from 'react';
import { systemAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const TABS = [
  { id: 'company', label: 'Company', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'appearance', label: 'Appearance', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { id: 'holidays', label: 'Holidays', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
];

export default function SettingsPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState('company');
  const [company, setCompany] = useState(null);
  const [companyForm, setCompanyForm] = useState({ name: '', email: '', phone: '', address: { street: '', city: '', state: '', country: 'India', pincode: '' }, website: '', gstin: '', pan: '' });
  const [holidays, setHolidays] = useState([]);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', type: 'national', description: '' });
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

  useEffect(() => {
    systemAPI.getCompany().then(res => {
      const c = res.data.company;
      setCompany(c);
      if (c) setCompanyForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', address: c.address || { street: '', city: '', state: '', country: 'India', pincode: '' }, website: c.website || '', gstin: c.gstin || '', pan: c.pan || '' });
    }).catch(() => {});
    systemAPI.getHolidays().then(res => setHolidays(res.data.holidays || [])).catch(() => {});
  }, []);

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (company?._id) {
        await systemAPI.updateCompany(company._id, companyForm);
        showToast('Company settings updated!');
      } else {
        const res = await systemAPI.createCompany(companyForm);
        setCompany(res.data.company);
        showToast('Company registered successfully!');
      }
    } catch (err) { 
      showToast(err.response?.data?.message || 'Error saving details', 'danger');
    } finally { setSaving(false); }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await systemAPI.createHoliday(holidayForm);
      setHolidays(prev => [...prev, res.data.holiday]);
      setShowHolidayModal(false);
      setHolidayForm({ name: '', date: '', type: 'national', description: '' });
      showToast('Holiday added');
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'danger'); }
    finally { setSaving(false); }
  };

  const handleDeleteHoliday = (id) => {
    askConfirm('Delete this holiday?', async () => {
      try {
        await systemAPI.deleteHoliday(id);
        setHolidays(prev => prev.filter(h => h._id !== id));
        showToast('Holiday deleted');
      } catch { showToast('Delete failed', 'danger'); }
    });
  };

  const isUpcoming = (date) => new Date(date) >= new Date();

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Settings</h1><p>Configure your EMS ERP system</p></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Sidebar Tabs */}
        <div className="card" style={{ padding: 8 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: tab === t.id ? 'var(--primary)' : 'transparent', color: tab === t.id ? 'white' : 'var(--text-secondary)', textAlign: 'left', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, marginBottom: 2, transition: 'all 0.15s' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={t.icon} /></svg>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {/* Company Settings */}
          {tab === 'company' && (
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Company Information</h2>
              <form onSubmit={handleSaveCompany}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    <input className="form-control" required value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={companyForm.email} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-control" value={companyForm.phone} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Website</label>
                    <input className="form-control" value={companyForm.website} onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GSTIN</label>
                    <input className="form-control" value={companyForm.gstin} onChange={e => setCompanyForm({ ...companyForm, gstin: e.target.value })} placeholder="27XXXXX..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PAN</label>
                    <input className="form-control" value={companyForm.pan} onChange={e => setCompanyForm({ ...companyForm, pan: e.target.value })} />
                  </div>
                </div>

                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '16px 0 12px', color: 'var(--text-secondary)' }}>Address</h3>
                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Street</label>
                    <input className="form-control" value={companyForm.address?.street || ''} onChange={e => setCompanyForm({ ...companyForm, address: { ...companyForm.address, street: e.target.value } })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-control" value={companyForm.address?.city || ''} onChange={e => setCompanyForm({ ...companyForm, address: { ...companyForm.address, city: e.target.value } })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input className="form-control" value={companyForm.address?.state || ''} onChange={e => setCompanyForm({ ...companyForm, address: { ...companyForm.address, state: e.target.value } })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input className="form-control" value={companyForm.address?.pincode || ''} onChange={e => setCompanyForm({ ...companyForm, address: { ...companyForm.address, pincode: e.target.value } })} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><div className="loading-spinner"></div> Saving...</> : 'Save Company Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Appearance */}
          {tab === 'appearance' && (
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Appearance & Theme</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Dark Mode</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Switch between light and dark theme</div>
                  </div>
                  <button onClick={toggleTheme}
                    style={{ width: 52, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer', background: theme === 'dark' ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'background 0.2s' }}>
                    <span style={{ position: 'absolute', top: 3, left: theme === 'dark' ? 26 : 3, width: 22, height: 22, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}></span>
                  </button>
                </div>

                <div style={{ padding: '16px 20px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>Current Theme</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[
                      { name: 'Indigo (Default)', primary: '#6366f1' },
                      { name: 'Blue', primary: '#3b82f6' },
                      { name: 'Green', primary: '#10b981' },
                      { name: 'Purple', primary: '#8b5cf6' },
                    ].map(t => (
                      <div key={t.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: t.primary, boxShadow: t.primary === '#6366f1' ? `0 0 0 3px white, 0 0 0 5px ${t.primary}` : 'none' }}></div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '16px 20px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Logged In As</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.firstName} {user?.lastName} · <span style={{ textTransform: 'capitalize' }}>{user?.role}</span> · {user?.email}</div>
                </div>
              </div>
            </div>
          )}

          {/* Holidays */}
          {tab === 'holidays' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Holidays ({new Date().getFullYear()})</h2>
                {isAdmin() && (
                  <button className="btn btn-primary btn-sm" onClick={() => setShowHolidayModal(true)}>+ Add Holiday</button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {holidays.length === 0 ? (
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <h3>No holidays added</h3>
                  </div>
                ) : holidays.map(h => (
                  <div key={h._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: isUpcoming(h.date) ? 'rgba(99,102,241,0.05)' : 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', border: `1px solid ${isUpcoming(h.date) ? 'rgba(99,102,241,0.2)' : 'var(--border-light)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 24 }}>
                        {h.type === 'national' ? '🇮🇳' : h.type === 'regional' ? '🏛️' : h.type === 'optional' ? '📅' : '🏢'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{h.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`tag tag-${isUpcoming(h.date) ? 'primary' : 'secondary'}`} style={{ textTransform: 'capitalize' }}>{h.type}</span>
                      {isAdmin() && <button className="btn btn-danger btn-sm" onClick={() => handleDeleteHoliday(h._id)}>Del</button>}
                    </div>
                  </div>
                ))}
              </div>

              {showHolidayModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowHolidayModal(false)}>
                  <div className="modal modal-sm" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="modal-header">
                      <h2>Add Holiday</h2>
                      <button className="icon-btn" onClick={() => setShowHolidayModal(false)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <form onSubmit={handleAddHoliday} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                      <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
                        <style jsx>{`
                          div::-webkit-scrollbar { width: 4px; }
                          div::-webkit-scrollbar-track { background: transparent; }
                          div::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
                        `}</style>
                        <div className="form-group">
                          <label className="form-label">Holiday Name *</label>
                          <input className="form-control" required value={holidayForm.name} onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="Independence Day" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Date *</label>
                          <input type="date" className="form-control" required value={holidayForm.date} onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Type</label>
                          <select className="form-control" value={holidayForm.type} onChange={e => setHolidayForm({ ...holidayForm, type: e.target.value })}>
                            <option value="national">National</option>
                            <option value="regional">Regional</option>
                            <option value="optional">Optional</option>
                            <option value="company">Company</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Description</label>
                          <textarea className="form-control" rows={3} value={holidayForm.description} onChange={e => setHolidayForm({ ...holidayForm, description: e.target.value })} style={{ resize: 'none' }} />
                        </div>
                      </div>
                      <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowHolidayModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                          {saving ? <><div className="loading-spinner"></div> Adding...</> : 'Add Holiday'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          {tab === 'notifications' && (
            <div className="card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Notification Preferences</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Leave Requests', desc: 'Get notified when employees apply for leave', enabled: true },
                  { label: 'Attendance Alerts', desc: 'Alerts for late arrivals and absences', enabled: true },
                  { label: 'Payroll Generated', desc: 'Notify when payroll is processed', enabled: true },
                  { label: 'Invoice Due', desc: 'Remind when invoices are overdue', enabled: false },
                  { label: 'Low Stock Alerts', desc: 'Notify when inventory is below reorder level', enabled: true },
                  { label: 'New Ticket', desc: 'Notify when a support ticket is raised', enabled: true },
                  { label: 'Task Assignment', desc: 'Notify when a task is assigned to you', enabled: true },
                  { label: 'Project Updates', desc: 'Get project progress notifications', enabled: false },
                ].map((n, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{n.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.desc}</div>
                    </div>
                    <div style={{ width: 44, height: 24, borderRadius: 99, background: n.enabled ? 'var(--primary)' : 'var(--border)', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', top: 2, left: n.enabled ? 21 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}></span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-primary">Save Preferences</button>
              </div>
            </div>
          )}
        </div>
      </div>

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
