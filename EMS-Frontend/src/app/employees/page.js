'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { employeeAPI, systemAPI, API_URL } from '../../services/api';

const DEPT_OPTIONS = ['Engineering','HR','Finance','Marketing','Sales','Operations','Design','Management','Support','IT'];
const STATUS_OPTIONS = ['active','inactive','on_notice','terminated','resigned'];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const INITIAL_FORM = { 
    firstName: '', lastName: '', email: '', password: '', employeeId: '', department: '', designation: '', 
    joiningDate: '', role: 'employee', employmentType: 'full_time', company: '',
    documents: { aadharNumber: '', panNumber: '', voterIdNumber: '', drivingLicense: '', passportNumber: '' },
    leaveBalance: { casual: 12, sick: 12, earned: 15, compensatory: 0 }
  };
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [idProofFile, setIdProofFile] = useState(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [idProofType, setIdProofType] = useState('aadharNumber');
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [viewEmp, setViewEmp] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirm, setConfirm] = useState({ show: false, msg: '', onConfirm: null, id: null });
  const [showIdCard, setShowIdCard] = useState(null);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgRecipient, setMsgRecipient] = useState(null);
  const [msgForm, setMsgForm] = useState({ title: '', message: '' });
  const [sendingMsg, setSendingMsg] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [userRole, setUserRole] = useState('employee');

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_URL}/${cleanPath}`;
  };

  const askConfirm = (msg, onConfirm) => {
    setConfirm({ show: true, msg, onConfirm });
  };

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeAPI.getAll({ page, limit: 10, search, department, status, company: companyId });
      const employeesData = res.data.employees || res.data.users || [];
      setEmployees(employeesData);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, department, status, companyId]);

  useEffect(() => { 
    fetchEmployees(); 
  }, [fetchEmployees]);

  useEffect(() => {
    employeeAPI.getStats().then(res => setStats(res.data.stats)).catch(() => {});
    
    // Fetch user info for role tracking
    const user = JSON.parse(localStorage.getItem('ems_user') || '{}');
    setUserRole(user.role || 'employee');

    // Fetch companies for filtering (if superadmin)
    if (user.role === 'superadmin' || user.role === 'admin') {
      systemAPI.getCompany().then(res => {
        setCompanies(Array.isArray(res.data.companies) ? res.data.companies : []);
      }).catch(() => {});
    }
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let empId = form._id;
      if (isEdit) {
        await employeeAPI.update(form._id, form);
        showToast('Employee updated!');
      } else {
        const res = await employeeAPI.create(form);
        empId = res.data?.employee?._id;
        showToast(res.data?.message || 'Employee added!');
      }
      
      // Handle ID Proof Photo Upload
      if (idProofFile && empId) {
        const formData = new FormData();
        formData.append('file', idProofFile);
        formData.append('type', 'id_proof');
        formData.append('documentType', idProofType);
        formData.append('description', `Uploaded ${idProofType} photo`);
        try { await employeeAPI.uploadDocument(empId, formData); } catch (e) { console.error(e); }
      }

      // Handle Profile Photo Upload
      if (profilePhotoFile && empId) {
        const formData = new FormData();
        formData.append('file', profilePhotoFile);
        formData.append('type', 'profile_photo');
        formData.append('name', 'Profile Photo');
        try { await employeeAPI.uploadDocument(empId, formData); } catch (e) { console.error(e); }
      }

      setShowModal(false);
      setIsEdit(false);
      setForm(INITIAL_FORM);
      setIdProofFile(null);
      setProfilePhotoFile(null);
      fetchEmployees();
    } catch (err) { showToast(err.response?.data?.message || 'Operation failed', 'danger'); }
    finally { setSaving(false); }
  };

  const openEdit = (emp) => {
    setForm({
      ...emp,
      firstName: emp.user?.firstName || '',
      lastName: emp.user?.lastName || '',
      email: emp.user?.email || '',
      password: '',
      role: emp.user?.role || 'employee',
      company: emp.company?._id || emp.company || '',
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '',
      leaveBalance: emp.leaveBalance || { casual: 12, sick: 12, earned: 15, compensatory: 0 },
      documents: emp.documents || INITIAL_FORM.documents,
      salaryInfo: emp.salaryInfo || { basicSalary: 0, hra: 0, specialAllowance: 0 }
    });
    setIdProofFile(null);
    setProfilePhotoFile(null);
    setIsEdit(true);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    askConfirm('Are you sure you want to delete this employee? This action cannot be undone.', async () => {
      try {
        await employeeAPI.delete(id);
        fetchEmployees();
        showToast('Employee deleted successfully');
      } catch { showToast('Delete failed', 'danger'); }
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgRecipient) return;
    setSendingMsg(true);
    try {
      await systemAPI.sendDirectMessage({
        userId: msgRecipient.user?._id || msgRecipient.user,
        title: msgForm.title,
        message: msgForm.message
      });
      showToast('Message sent successfully!');
      setShowMsgModal(false);
      setMsgForm({ title: '', message: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send message', 'danger');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleStatusChange = (id, newStatus) => {
    askConfirm(`Change employee status to ${newStatus.replace('_',' ')}?`, async () => {
      try {
        await employeeAPI.update(id, { status: newStatus });
        fetchEmployees();
        setViewEmp(null);
        showToast('Status updated');
      } catch { showToast('Update failed', 'danger'); }
    });
  };

  const statusColor = (s) => ({ active: 'success', inactive: 'secondary', on_notice: 'warning', terminated: 'danger', resigned: 'danger' }[s] || 'secondary');

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Employees</h1>
          <p>{total} total employees</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Add Employee
        </button>
      </div>

      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
          {[
            { label: 'Total', value: stats.total, color: '#6366f1' },
            { label: 'Active', value: stats.active, color: '#10b981' },
            { label: 'On Notice', value: stats.onNotice, color: '#f59e0b' },
            { label: 'Inactive', value: stats.inactive, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="filter-bar">
        <div className="search-input" style={{ flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
          <input placeholder="Search by ID, department..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {(userRole === 'superadmin' || companies.length > 1) && (
          <select className="form-control" style={{ width: 160 }} value={companyId} onChange={e => { setCompanyId(e.target.value); setPage(1); }}>
            <option value="">All Companies</option>
            {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        )}
        <select className="form-control" style={{ width: 140 }} value={department} onChange={e => { setDepartment(e.target.value); setPage(1); }}>
          <option value="">All Departments</option>
          {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="form-control" style={{ width: 120 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrapper" style={{ borderRadius: 'var(--radius)', border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Company</th>
                <th>ID</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Joining Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><div className="loading-overlay"><div className="loading-spinner"></div></div></td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <h3>No employees found</h3>
                    <p>Try adjusting filters or add a new employee</p>
                  </div>
                </td></tr>
              ) : employees.map(emp => (
                <tr key={emp._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 34, height: 34, fontSize: 12, overflow: 'hidden' }}>
                        {getImageUrl(emp.user?.avatar || emp.profilePhoto) ? (
                          <img src={getImageUrl(emp.user?.avatar || emp.profilePhoto)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <>{emp.user?.firstName?.[0]}{emp.user?.lastName?.[0]}</>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{emp.user?.firstName} {emp.user?.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: 11, 
                      fontWeight: 600, 
                      padding: '4px 8px', 
                      background: 'rgba(99,102,241,0.08)', 
                      borderRadius: 6, 
                      color: 'var(--primary)' 
                    }}>
                      {emp.company?.name || 'Main Organization'}
                    </span>
                  </td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{emp.employeeId}</span></td>
                  <td>{emp.department}</td>
                  <td>{emp.designation}</td>
                  <td>{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN') : '-'}</td>
                  <td><span className={`tag tag-${statusColor(emp.status)}`}>{emp.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={() => setViewEmp(emp)} className="btn btn-secondary btn-sm" style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="View Details">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button onClick={() => { setMsgRecipient(emp); setShowMsgModal(true); }} className="btn btn-info btn-sm" style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Send Message">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      </button>
                      <button onClick={() => openEdit(emp)} className="btn btn-primary btn-sm" style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit Employee">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => handleDelete(emp._id)} className="btn btn-danger btn-sm" style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete Employee">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
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
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg" style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>{isEdit ? 'Edit Employee' : 'Add New Employee'}</h2>
              <button className="icon-btn" onClick={() => { setShowModal(false); setIsEdit(false); setForm(INITIAL_FORM); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: 8, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style jsx>{`
                  div::-webkit-scrollbar { display: none; }
                  textarea::-webkit-scrollbar { display: none; }
                  textarea { scrollbar-width: none; ms-overflow-style: none; resize: none; }
                  input::-webkit-outer-spin-button,
                  input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                  input[type=number] { -moz-appearance: textfield; }
                `}</style>
                {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
                <div className="form-grid">
                  {(userRole === 'superadmin' || companies.length > 1) && (
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Assign to Company *</label>
                      <select className="form-control" required value={form.company} onChange={e => setForm({...form, company: e.target.value})}>
                        <option value="">Select Company</option>
                        {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input className="form-control" required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="John" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input className="form-control" required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Doe" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-control" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@company.com" autoComplete="off" />
                  </div>
                  {!isEdit && (
                    <div className="form-group">
                      <label className="form-label">Password *</label>
                      <input className="form-control" type="password" required={!isEdit} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Set login password" autoComplete="new-password" />
                      <small style={{ fontSize: 10, color: 'var(--text-muted)' }}>This will be the employee's login password</small>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Employee ID *</label>
                    <input className="form-control" required value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} placeholder="EMP001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select className="form-control" required value={form.department} onChange={e => setForm({...form, department: e.target.value})}>
                      <option value="">Select Department</option>
                      {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designation *</label>
                    <input className="form-control" required value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} placeholder="Software Engineer" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Joining Date *</label>
                    <input className="form-control" type="date" required value={form.joiningDate} onChange={e => setForm({...form, joiningDate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employment Type</label>
                    <select className="form-control" value={form.employmentType} onChange={e => setForm({...form, employmentType: e.target.value})}>
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-control" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                      <option value="employee">Employee</option>
                      <option value="hr">HR</option>
                      <option value="manager">Manager</option>
                      <option value="accountant">Accountant</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Basic Salary (₹)</label>
                    <input className="form-control" type="number" placeholder="0" value={form.salaryInfo?.basicSalary || 0} onChange={e => setForm({...form, salaryInfo: {...(form.salaryInfo||{}), basicSalary: Number(e.target.value)}})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">HRA (₹)</label>
                    <input className="form-control" type="number" placeholder="0" value={form.salaryInfo?.hra || 0} onChange={e => setForm({...form, salaryInfo: {...(form.salaryInfo||{}), hra: Number(e.target.value)}})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Other Allowances (₹)</label>
                    <input className="form-control" type="number" placeholder="0" value={form.salaryInfo?.specialAllowance || 0} onChange={e => setForm({...form, salaryInfo: {...(form.salaryInfo||{}), specialAllowance: Number(e.target.value)}})} />
                  </div>
                </div>

                <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <h4 style={{ marginBottom: 16, fontSize: 11, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Identity Proof & Photo</h4>
                  <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Profile Photo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                      <div className="avatar" style={{ width: 60, height: 60 }}>
                        {profilePhotoFile ? (
                          <img src={URL.createObjectURL(profilePhotoFile)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                          <span>IMG</span>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e => setProfilePhotoFile(e.target.files[0])}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ID Type *</label>
                      <select className="form-control" value={idProofType} onChange={e => setIdProofType(e.target.value)}>
                        <option value="aadharNumber">Aadhar Card</option>
                        <option value="panNumber">PAN Card</option>
                        <option value="voterIdNumber">Voter ID</option>
                        <option value="drivingLicense">Driving License</option>
                        <option value="passportNumber">Passport</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">ID Number *</label>
                      <input 
                        className="form-control" 
                        placeholder="Enter ID Number" 
                        value={form.documents?.[idProofType] || ''} 
                        onChange={e => setForm({...form, documents: {...(form.documents||{}), [idProofType]: e.target.value }})}
                      />
                    </div>
                    {!isEdit && (
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Upload ID Proof Photo</label>
                        <div className="file-upload-zone" style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: '12px', textAlign: 'center', background: 'var(--bg-alt)' }}>
                          <input 
                            type="file" 
                            id="idProof" 
                            hidden 
                            onChange={e => setIdProofFile(e.target.files[0])} 
                            accept="image/*"
                          />
                          <label htmlFor="idProof" style={{ cursor: 'pointer', display: 'block' }}>
                            {idProofFile ? (
                              <div style={{ color: 'var(--success)', fontWeight: 500 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}><path d="M20 6L9 17l-5-5"/></svg>
                                {idProofFile.name}
                              </div>
                            ) : (
                              <div style={{ color: 'var(--text-muted)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: 8, display: 'block', margin: '0 auto' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                Click to upload photo (PNG, JPG)
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isEdit && (
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ marginBottom: 16, fontSize: 11, textTransform: 'uppercase', color: 'var(--primary)' }}>Leave Balance (Days)</h4>
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                      <div className="form-group">
                        <label className="form-label">Casual</label>
                        <input className="form-control" type="number" value={form.leaveBalance?.casual || 0} onChange={e => setForm({...form, leaveBalance: {...form.leaveBalance, casual: Number(e.target.value)}})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Sick</label>
                        <input className="form-control" type="number" value={form.leaveBalance?.sick || 0} onChange={e => setForm({...form, leaveBalance: {...form.leaveBalance, sick: Number(e.target.value)}})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Earned</label>
                        <input className="form-control" type="number" value={form.leaveBalance?.earned || 0} onChange={e => setForm({...form, leaveBalance: {...form.leaveBalance, earned: Number(e.target.value)}})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Comp Off</label>
                        <input className="form-control" type="number" value={form.leaveBalance?.compensatory || 0} onChange={e => setForm({...form, leaveBalance: {...form.leaveBalance, compensatory: Number(e.target.value)}})} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="loading-spinner"></div> Saving...</> : (isEdit ? 'Update Employee' : 'Create Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewEmp && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setViewEmp(null)}>
          <div className="modal modal-md" style={{ maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div className="modal-header" style={{ justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar" style={{ width: 44, height: 44, background:'var(--primary)', color:'white', overflow: 'hidden' }}>
                  {getImageUrl(viewEmp.user?.avatar || viewEmp.profilePhoto) ? (
                    <img src={getImageUrl(viewEmp.user?.avatar || viewEmp.profilePhoto)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>{viewEmp.user?.firstName?.[0]}{viewEmp.user?.lastName?.[0]}</>
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, marginBottom:2 }}>{viewEmp.user?.firstName} {viewEmp.user?.lastName}</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{viewEmp.designation} • {viewEmp.department}</p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setViewEmp(null)} style={{ marginTop:-4, marginRight:-8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="modal-body" style={{ overflowY: 'auto', flex:1, paddingRight:12 }}>
              <style jsx>{`
                div::-webkit-scrollbar { width: 4px; }
                div::-webkit-scrollbar-track { background: transparent; }
                div::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
              `}</style>
              
              <div className="detail-section">
                <h4 style={{ marginBottom: 12, fontSize: 11, textTransform:'uppercase', letterSpacing:'0.05em', color: 'var(--primary)', opacity:0.8 }}>Employment Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom:2 }}>Employee ID</label>
                    <span style={{ fontSize: 14, fontWeight: 500, fontFamily:'monospace' }}>{viewEmp.employeeId}</span>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom:2 }}>Joining Date</label>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{new Date(viewEmp.joiningDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom:2 }}>Email Address</label>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{viewEmp.user?.email}</span>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom:2 }}>Current Status</label>
                    <span className={`tag tag-${statusColor(viewEmp.status)}`}>{viewEmp.status?.replace('_',' ')}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section" style={{ marginTop: 24 }}>
                <h4 style={{ marginBottom: 12, fontSize: 11, textTransform:'uppercase', letterSpacing:'0.05em', color: 'var(--primary)', opacity:0.8 }}>Salary & Type</h4>
                <div className="card" style={{ padding: 12, background: 'rgba(99,102,241,0.03)', border: '1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>Monthly Basic</label>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>
                      {fmt(viewEmp.salaryInfo?.basicSalary)}
                    </span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>Type</label>
                    <span style={{ fontSize: 13, fontWeight: 500, textTransform:'capitalize' }}>{viewEmp.employmentType?.replace('_',' ')}</span>
                  </div>
                </div>
              </div>
              <div className="detail-section" style={{ marginTop: 24 }}>
                <h4 style={{ marginBottom: 12, fontSize: 11, textTransform:'uppercase', letterSpacing:'0.05em', color: 'var(--primary)', opacity:0.8 }}>Leave Balance (Available Days)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Casual', val: viewEmp.leaveBalance?.casual },
                    { label: 'Sick', val: viewEmp.leaveBalance?.sick },
                    { label: 'Earned', val: viewEmp.leaveBalance?.earned },
                    { label: 'Comp Off', val: viewEmp.leaveBalance?.compensatory },
                  ].map(l => (
                    <div key={l.label} style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>{l.val || 0}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{l.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {viewEmp.documents && viewEmp.documents.length > 0 && (
                <div className="detail-section" style={{ marginTop: 24 }}>
                  <h4 style={{ marginBottom: 12, fontSize: 11, textTransform:'uppercase', letterSpacing:'0.05em', color: 'var(--primary)', opacity:0.8 }}>Uploaded Documents ({viewEmp.documents.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {viewEmp.documents.map((doc, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, background: 'var(--bg-alt)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, background: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M13 2v7h7"/></svg>
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{doc.name || doc.type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Document'}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Type: {doc.type?.replace('_', ' ')}</div>
                          </div>
                        </div>
                        <a 
                          href={`${API_URL}/${doc.url}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-sm" 
                          style={{ padding: '4px 10px', fontSize: 11, background: 'var(--primary)', color: 'white', border: 'none' }}
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-section" style={{ marginTop: 24, padding:16, borderRadius:12, background:'var(--bg-alt)', border:'1px solid var(--border)' }}>
                <h4 style={{ marginBottom: 16, fontSize: 11, textTransform:'uppercase', letterSpacing:'0.05em', color: 'var(--primary)', opacity:0.8 }}>Update Status</h4>
                <div style={{ display:'flex', gap:10 }}>
                  {viewEmp.status !== 'on_notice' && viewEmp.status !== 'terminated' && (
                    <button 
                      className="btn btn-warning" 
                      style={{ flex:1, fontSize:12, height:36, padding:'0 12px' }}
                      onClick={() => handleStatusChange(viewEmp._id, 'on_notice')}
                    >
                      Put on Notice
                    </button>
                  )}
                  {viewEmp.status === 'on_notice' && (
                    <button 
                      className="btn btn-success" 
                      style={{ flex:1, fontSize:12, height:36, padding:'0 12px' }}
                      onClick={() => handleStatusChange(viewEmp._id, 'active')}
                    >
                      Re-activate
                    </button>
                  )}
                  <button className="btn btn-primary" style={{ flex:1, fontSize:12, height:36, padding:'0 12px' }} onClick={() => setViewEmp(null)}>
                    Close
                  </button>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ width:'100%', fontSize:12, height:36, display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'var(--bg-card)', border:'1px solid var(--primary)', color:'var(--primary)' }}
                    onClick={() => setShowIdCard(viewEmp)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><circle cx="9" cy="10" r="3"/><path d="M16 14h4m-4-4h4m-4-4h4M9 13c-2.2 0-4 1.8-4 4h8c0-2.2-1.8-4-4-4z"/></svg>
                    Generate Digital ID Card
                  </button>
                </div>
              </div>

              <div className="detail-section" style={{ marginTop: 24, opacity:0.6 }}>
                <h4 style={{ marginBottom: 8, fontSize: 10, textTransform:'uppercase', color: 'var(--text-muted)' }}>Internal Metadata</h4>
                <div style={{ fontSize: 10, fontFamily:'monospace' }}>
                  <p>Role: {viewEmp.user?.role}</p>
                </div>
              </div>
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
              <button className="btn btn-primary" onClick={() => { confirm.onConfirm(); setConfirm({ ...confirm, show: false }); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMsgModal && msgRecipient && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMsgModal(false)}>
          <div className="modal modal-sm" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2>Message {msgRecipient.user?.firstName}</h2>
              <button className="icon-btn" onClick={() => setShowMsgModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSendMessage}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input className="form-control" required value={msgForm.title} onChange={e => setMsgForm({ ...msgForm, title: e.target.value })} placeholder="e.g. Important Update" />
                </div>
                <div className="form-group">
                  <label className="form-label">Message Content</label>
                  <textarea className="form-control" required rows={5} value={msgForm.message} onChange={e => setMsgForm({ ...msgForm, message: e.target.value })} placeholder="Write your message here..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMsgModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={sendingMsg}>
                  {sendingMsg ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital ID Card Modal */}
      {showIdCard && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowIdCard(null)} style={{ background: 'rgba(0,0,0,0.85)', zIndex: 20000 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, maxWidth: '100%' }}>
            
            <div id="id-card-capture" className="id-card-v3">
              <div className="id-v3-inner">
                {/* Left Section - Identity Column */}
                <div className="id-v3-left">
                  <div className="id-v3-photo-ring">
                    {getImageUrl(showIdCard.user?.avatar || showIdCard.profilePhoto) ? (
                      <img src={getImageUrl(showIdCard.user?.avatar || showIdCard.profilePhoto)} alt="Member" className="id-v3-img" />
                    ) : (
                      <div className="id-v3-initials">{(showIdCard.user?.firstName?.[0]||'E')}</div>
                    )}
                  </div>
                  <div className="id-v3-qr-wrap">
                    <div className="id-v3-qr-inner">
                      {Array.from({length:16}).map((_,i) => <div key={i} className="qr-dot" style={{ opacity: Math.random() > 0.3 ? 1 : 0.2 }}></div>)}
                    </div>
                  </div>
                </div>

                {/* Right Section - Data Column */}
                <div className="id-v3-right">
                  <div className="id-v3-header">
                    <div className="id-v3-logo-badge">{(JSON.parse(localStorage.getItem('ems_user'))?.company?.name?.[0] || 'E')}</div>
                    <div className="id-v3-company-group">
                      <h3 className="id-v3-company-name">{JSON.parse(localStorage.getItem('ems_user'))?.company?.name || 'TSRIJANALI IT SERVICES'}</h3>
                      <p className="id-v3-subtitle">Corporate Access Identity</p>
                    </div>
                  </div>

                  <div className="id-v3-member-block">
                    <h2 className="id-v3-name">{showIdCard.user?.firstName} {showIdCard.user?.lastName}</h2>
                    <p className="id-v3-desig">{showIdCard.designation}</p>
                  </div>

                  <div className="id-v3-info-grid">
                    <div className="id-v3-item">
                      <span className="id-v3-label">ID NO.</span>
                      <span className="id-v3-value">{showIdCard.employeeId}</span>
                    </div>
                    <div className="id-v3-item">
                      <span className="id-v3-label">ROLE</span>
                      <span className="id-v3-value" style={{ textTransform:'capitalize' }}>{showIdCard.user?.role}</span>
                    </div>
                    <div className="id-v3-item">
                      <span className="id-v3-label">DEPT.</span>
                      <span className="id-v3-value">{showIdCard.department}</span>
                    </div>
                    <div className="id-v3-item">
                      <span className="id-v3-label">JOINED</span>
                      <span className="id-v3-value">{new Date(showIdCard.joiningDate).toLocaleDateString('en-IN', { month:'short', year:'numeric' })}</span>
                    </div>
                  </div>

                  <div className="id-v3-footer">
                    <div className="id-v3-security">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ opacity:0.6 }}><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/></svg>
                      <span>Secure Digitally Verified</span>
                    </div>
                    <div className="id-v3-accent-dots"></div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setShowIdCard(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-2 4H8v-4h8v4z"/></svg>
                Print ID Card
              </button>
            </div>
          </div>

          <style jsx>{`
            .id-card-v3 {
              width: 520px;
              height: 320px;
              background: #0f172a;
              border-radius: 28px;
              padding: 1px;
              position: relative;
              overflow: hidden;
              color: white;
              font-family: 'Inter', system-ui, sans-serif;
              box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.6);
            }
            .id-v3-inner {
              width: 100%;
              height: 100%;
              background: radial-gradient(circle at top right, rgba(99,102,241,0.15), transparent 60%),
                          radial-gradient(circle at bottom left, rgba(16,185,129,0.05), transparent 60%),
                          #0f172a;
              border-radius: 27px;
              display: flex;
              position: relative;
              z-index: 1;
            }
            .id-v3-left {
              width: 170px;
              background: rgba(255,255,255,0.02);
              border-right: 1px solid rgba(255,255,255,0.05);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 24px;
            }
            .id-v3-photo-ring {
              width: 124px;
              height: 124px;
              border-radius: 24px;
              background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
              padding: 3px;
              box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4);
            }
            .id-v3-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              border-radius: 21px;
              border: 2px solid #0f172a;
            }
            .id-v3-initials {
              width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
              font-size: 52px; font-weight: 900; color: rgba(255,255,255,0.1);
            }
            .id-v3-qr-wrap {
              background: rgba(255,255,255,0.05);
              padding: 10px;
              border-radius: 12px;
              border: 1px solid rgba(255,255,255,0.1);
            }
            .id-v3-qr-inner {
              display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px;
            }
            .qr-dot { width: 5px; height: 5px; background: white; border-radius: 1px; }

            .id-v3-right {
              flex: 1;
              padding: 32px 36px;
              display: flex;
              flex-direction: column;
            }
            .id-v3-header {
              display: flex;
              align-items: center;
              gap: 14px;
              margin-bottom: 28px;
            }
            .id-v3-logo-badge {
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, #6366f1, #10b981);
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 16px;
              color: white;
            }
            .id-v3-company-name {
              font-size: 15px;
              font-weight: 800;
              margin: 0;
              color: #f8fafc;
              letter-spacing: -0.01em;
            }
            .id-v3-subtitle {
              font-size: 9px;
              text-transform: uppercase;
              color: #94a3b8;
              letter-spacing: 0.12em;
              font-weight: 700;
              margin: 3px 0 0;
            }
            .id-v3-member-block { margin-bottom: 28px; }
            .id-v3-name { font-size: 26px; font-weight: 800; margin: 0; color: white; letter-spacing: -0.03em; }
            .id-v3-desig { font-size: 13px; color: #6366f1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
            
            .id-v3-info-grid {
              display: grid;
              grid-template-columns: 1fr 1.2fr;
              gap: 16px 24px;
            }
            .id-v3-item { display: flex; flex-direction: column; gap: 3px; }
            .id-v3-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
            .id-v3-value { font-size: 12px; font-weight: 600; color: #cbd5e1; }

            .id-v3-footer {
              margin-top: auto;
              padding-top: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-top: 1px solid rgba(255,255,255,0.05);
            }
            .id-v3-security { display: flex; align-items: center; gap: 6px; font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
            .id-v3-accent-dots { position: absolute; bottom: 32px; right: 36px; width: 40px; height: 4px; border-radius: 10px; background: linear-gradient(90deg, #6366f1, transparent); }

            @media print {
              body * { visibility: hidden; }
              #id-card-capture, #id-card-capture * { visibility: visible; }
              #id-card-capture { 
                position: fixed;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                border: none;
                box-shadow: none;
                width: 520px; height: 320px;
              }
              .modal-overlay { background: white !important; }
            }
          `}</style>


        </div>
      )}
    </div>
  );
}
