'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, API_URL } from '../../services/api';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({ firstName:'', lastName:'', phone:'' });
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

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
      await authAPI.updateProfile(form);
      await refreshUser();
      setMessage('Profile updated successfully!');
    } catch(err){ setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSaving(true);
    setMessage(''); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await authAPI.uploadAvatar(formData);
      await refreshUser();
      setMessage('Profile photo updated!');
    } catch (err) { setError(err.response?.data?.message || 'Upload failed'); }
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
  const avatarUrl = user?.avatar ? `${API_URL}/${user.avatar}` : null;

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
        <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <div className="avatar" style={{ width:80, height:80, fontSize:32, fontWeight:800, overflow: 'hidden' }}>
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            <label className="avatar-upload-btn" title="Change Photo">
              <input type="file" hidden accept="image/*" onChange={handleAvatarChange} disabled={saving} />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize:20, fontWeight:700 }}>{user?.firstName} {user?.lastName}</h2>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>{user?.email}</div>
            <div style={{ marginTop:8 }}>
              <span className={`tag tag-${roleColors[user?.role]||'secondary'}`} style={{ textTransform:'capitalize' }}>{user?.role}</span>
              {user?.isEmailVerified && <span className="tag tag-success" style={{ marginLeft:6 }}>✓ Verified</span>}
            </div>
          </div>
        </div>
        <style jsx>{`
          .avatar-upload-btn {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 28px;
            height: 28px;
            background: var(--primary);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border: 2px solid white;
            transition: all 0.2s;
          }
          .avatar-upload-btn:hover { background: var(--primary-dark, #4338ca); transform: scale(1.1); }
        `}</style>
      </div>

      <div className="tabs">
        <button className={`tab ${tab==='profile'?'active':''}`} onClick={()=>setTab('profile')}>Profile Info</button>
        {user?.employee?.bankDetails && <button className={`tab ${tab==='bank'?'active':''}`} onClick={()=>setTab('bank')}>Bank Details</button>}
        <button className={`tab ${tab==='password'?'active':''}`} onClick={()=>setTab('password')}>Change Password</button>
      </div>

      {message && <div style={{ padding:'10px 16px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:8, color:'var(--success)', fontSize:13, marginBottom:16 }}>{message}</div>}
      {error && <div style={{ padding:'10px 16px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'var(--danger)', fontSize:13, marginBottom:16 }}>{error}</div>}

      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Account Settings */}
          <div className="card" style={{ padding:24 }}>
            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:20, color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Account Information</h3>
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
                  <label className="form-label">Email Address</label>
                  <input className="form-control" value={user?.email||''} disabled style={{ opacity:0.6, background:'var(--bg-alt)' }} title="Email cannot be changed" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-control" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 XXXXXXXXXX" />
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving?'Saving...':'Update Profile'}
                </button>
              </div>
            </form>
          </div>

          <div className="card" style={{ padding:24 }}>
            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:20, color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Employment Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <div className="form-control disabled-field">{user?.employee?.employeeId || 'N/A'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <div className="form-control disabled-field">{user?.employee?.department || 'N/A'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Designation</label>
                <div className="form-control disabled-field">{user?.employee?.designation || 'N/A'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Joining Date</label>
                <div className="form-control disabled-field">{user?.employee?.joiningDate ? new Date(user.employee.joiningDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <div className="form-control disabled-field" style={{ textTransform:'capitalize' }}>{user?.role || 'N/A'}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Employment Status</label>
                <div className="form-control disabled-field" style={{ textTransform:'capitalize' }}>{user?.employee?.status || 'Active'}</div>
              </div>
            </div>
          </div>



          <style jsx>{`
            .disabled-field {
              background: var(--bg-alt);
              border-color: var(--border);
              color: var(--text-main);
              opacity: 0.8;
              font-weight: 500;
              height: 38px;
              display: flex;
              align-items: center;
              padding: 0 14px;
            }
          `}</style>
        </div>
      )}

      {tab === 'bank' && user?.employee?.bankDetails && (
        <div className="card" style={{ padding:24 }}>
          <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16, color:'var(--primary)' }}>My Banking Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <div className="form-control" style={{ background:'var(--bg-alt)', height:'auto', padding:'10px 14px' }}>{user.employee.bankDetails.bankName || 'N/A'}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <div className="form-control" style={{ background:'var(--bg-alt)', height:'auto', padding:'10px 14px', fontWeight:600 }}>{user.employee.bankDetails.accountNumber || 'N/A'}</div>
            </div>
            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <div className="form-control" style={{ background:'var(--bg-alt)', height:'auto', padding:'10px 14px', textTransform:'uppercase' }}>{user.employee.bankDetails.ifscCode || 'N/A'}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Account Type</label>
              <div className="form-control" style={{ background:'var(--bg-alt)', height:'auto', padding:'10px 14px', textTransform:'capitalize' }}>{user.employee.bankDetails.accountType || 'Savings'}</div>
            </div>
          </div>
          <div style={{ marginTop:20, padding:14, background:'rgba(79,70,229,0.05)', borderRadius:10, fontSize:12, color:'var(--text-muted)' }}>
             <p><strong>Note:</strong> These details are used for payroll processing. If you need to update your bank information, please contact the HR or Admin department.</p>
          </div>
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
