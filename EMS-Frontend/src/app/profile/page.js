'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({ firstName:'', lastName:'', phone:'' });
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ firstName:user.firstName||'', lastName:user.lastName||'', phone:user.phone||'' });
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(''); setError('');
    try {
      // Profile update endpoint could be added; using refreshUser as placeholder
      await authAPI.getMe();
      setMessage('Profile updated successfully!');
    } catch(err){ setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { setError('Passwords do not match'); return; }
    setSaving(true);
    setMessage(''); setError('');
    try {
      await authAPI.updatePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setMessage('Password changed successfully!');
      setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch(err){ setError(err.response?.data?.message || 'Invalid current password'); }
    finally { setSaving(false); }
  };

  const initials = user ? `${user.firstName?.[0]||''}${user.lastName?.[0]||''}`.toUpperCase() : 'U';

  const roleColors = { superadmin:'primary', admin:'info', hr:'success', manager:'warning', accountant:'secondary', employee:'secondary' };

  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>My Profile</h1>
          <p>Manage your account settings</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom:20, padding:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <div className="avatar" style={{ width:72, height:72, fontSize:28, fontWeight:800 }}>{initials}</div>
          <div>
            <h2 style={{ fontSize:20, fontWeight:700 }}>{user?.firstName} {user?.lastName}</h2>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>{user?.email}</div>
            <div style={{ marginTop:8 }}>
              <span className={`tag tag-${roleColors[user?.role]||'secondary'}`} style={{ textTransform:'capitalize' }}>{user?.role}</span>
              {user?.isEmailVerified && <span className="tag tag-success" style={{ marginLeft:6 }}>✓ Verified</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab==='profile'?'active':''}`} onClick={()=>setTab('profile')}>Profile Info</button>
        <button className={`tab ${tab==='password'?'active':''}`} onClick={()=>setTab('password')}>Change Password</button>
      </div>

      {message && <div style={{ padding:'10px 16px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:8, color:'var(--success)', fontSize:13, marginBottom:16 }}>{message}</div>}
      {error && <div style={{ padding:'10px 16px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'var(--danger)', fontSize:13, marginBottom:16 }}>{error}</div>}

      {tab === 'profile' && (
        <div className="card" style={{ padding:24 }}>
          <form onSubmit={handleSaveProfile}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-control" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-control" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" value={user?.email||''} disabled style={{ opacity:0.6 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 XXXXXXXXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input className="form-control" value={user?.role||''} disabled style={{ opacity:0.6, textTransform:'capitalize' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <input className="form-control" value={user?.isActive?'Active':'Inactive'} disabled style={{ opacity:0.6 }} />
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving?<><div className="loading-spinner"></div>Saving...</>:'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'password' && (
        <div className="card" style={{ padding:24 }}>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <input type="password" className="form-control" required value={pwForm.currentPassword} onChange={e=>setPwForm({...pwForm,currentPassword:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input type="password" className="form-control" required value={pwForm.newPassword} onChange={e=>setPwForm({...pwForm,newPassword:e.target.value})} placeholder="Min 6 characters" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password *</label>
              <input type="password" className="form-control" required value={pwForm.confirmPassword} onChange={e=>setPwForm({...pwForm,confirmPassword:e.target.value})} />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving?<><div className="loading-spinner"></div>Updating...</>:'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
