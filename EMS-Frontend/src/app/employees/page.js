'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { employeeAPI, systemAPI } from '../../services/api';

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
    firstName: '', lastName: '', email: '', employeeId: '', department: '', designation: '', 
    joiningDate: '', role: 'employee', employmentType: 'full_time',
    leaveBalance: { casual: 12, sick: 12, earned: 15, compensatory: 0 }
  };
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [viewEmp, setViewEmp] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirm, setConfirm] = useState({ show: false, msg: '', onConfirm: null, id: null });
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgRecipient, setMsgRecipient] = useState(null);
  const [msgForm, setMsgForm] = useState({ title: '', message: '' });
  const [sendingMsg, setSendingMsg] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const askConfirm = (msg, onConfirm) => {
    setConfirm({ show: true, msg, onConfirm });
  };

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeAPI.getAll({ page, limit: 10, search, department, status });
      const employeesData = res.data.employees || res.data.users || [];
      setEmployees(employeesData);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, department, status]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  useEffect(() => {
    employeeAPI.getStats().then(res => setStats(res.data.stats)).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await employeeAPI.update(form._id, form);
        showToast('Employee updated!');
      } else {
        await employeeAPI.create(form);
        showToast('Employee added!');
      }
      setShowModal(false);
      setIsEdit(false);
      setForm(INITIAL_FORM);
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
      role: emp.user?.role || 'employee',
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '',
      leaveBalance: emp.leaveBalance || { casual: 12, sick: 12, earned: 15, compensatory: 0 }
    });
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
                      <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                        {emp.user?.firstName?.[0]}{emp.user?.lastName?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{emp.user?.firstName} {emp.user?.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.user?.email}</div>
                      </div>
                    </div>
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
                {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
                <div className="form-grid">
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
                    <input className="form-control" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@company.com" />
                  </div>
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
                <div className="avatar" style={{ width: 44, height: 44, background:'var(--primary)', color:'white' }}>
                  {viewEmp.user?.firstName?.[0]}{viewEmp.user?.lastName?.[0]}
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

    </div>
  );
}
