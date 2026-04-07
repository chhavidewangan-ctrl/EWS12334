'use client';
import { useState, useEffect, useCallback } from 'react';
import { payrollAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function PayrollPage() {
  const { user, isAdmin, isAccountant } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [showPayslip, setShowPayslip] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirm, setConfirm] = useState({ show: false, msg: '', onConfirm: null, id: null });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const askConfirm = (msg, onConfirm) => {
    setConfirm({ show: true, msg, onConfirm });
  };

  const fetchPayrolls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollAPI.getAll({ page, limit: 10, month, year });
      setPayrolls(res.data.payrolls);
      setTotalPages(res.data.totalPages || 1);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }, [page, month, year]);

  useEffect(() => { fetchPayrolls(); }, [fetchPayrolls]);

  const handleGenerate = () => {
    askConfirm(`Generate payroll for ${MONTHS[month-1]} ${year}?`, async () => {
      setGenerating(true);
      try {
        const res = await payrollAPI.generate({ month, year });
        showToast(`Generated ${res.data.count} payroll records.`);
        fetchPayrolls();
      } catch(err){ showToast(err.response?.data?.message || 'Failed to generate', 'danger'); }
      finally { setGenerating(false); }
    });
  };

  const handleStatus = (id, status) => {
    askConfirm(`Are you sure you want to mark this status as ${status}?`, async () => {
      try {
        await payrollAPI.updateStatus(id, { status });
        fetchPayrolls();
        showToast(`Status updated to ${status}`);
      } catch { showToast('Update failed', 'danger'); }
    });
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${cleanPath}`.replace(/([^:]\/)\/+/g, "$1");
  };

  const fmt = (n) => `₹${(n||0).toLocaleString('en-IN')}`;
  const statusColor = { draft: 'secondary', processed: 'info', approved: 'primary', paid: 'success', cancelled: 'danger' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Payroll</h1>
          <p>Manage employee salaries and payslips</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-control" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
          <select className="form-control" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {(isAdmin() || isAccountant()) && (
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? <><div className="loading-spinner"></div> Generating...</> : 'Generate Payroll'}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Month/Year</th>
                <th>Gross Salary</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th>Attendance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><div className="loading-overlay"><div className="loading-spinner"></div></div></td></tr>
              ) : payrolls.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  <h3>No payroll records</h3>
                  <p>Generate payroll for {MONTHS[month-1]} {year}</p>
                </div></td></tr>
              ) : payrolls.map(p => (
                <tr key={p._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, overflow:'hidden', border:'1px solid var(--border)' }}>
                        {getImageUrl(p.employee?.user?.avatar || p.employee?.profilePhoto) ? (
                          <img src={getImageUrl(p.employee?.user?.avatar || p.employee?.profilePhoto)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        ) : (
                          <>{p.employee?.user?.firstName?.[0]}{p.employee?.user?.lastName?.[0]}</>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.employee?.user?.firstName} {p.employee?.user?.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.employee?.designation}</div>
                      </div>
                    </div>
                  </td>
                  <td>{MONTHS[p.month-1]} {p.year}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(p.grossSalary)}</td>
                  <td style={{ color: 'var(--danger)' }}>{fmt(p.totalDeductions)}</td>
                  <td style={{ fontWeight: 700, fontSize: 15 }}>{fmt(p.netSalary)}</td>
                  <td>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {p.attendanceSummary?.presentDays || 0}/{p.attendanceSummary?.totalDays || 0} days
                    </div>
                  </td>
                  <td><span className={`tag tag-${statusColor[p.status] || 'secondary'}`}>{p.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowPayslip(p)}>View</button>
                      {p.status === 'processed' && isAdmin() && (
                        <button className="btn btn-success btn-sm" onClick={() => handleStatus(p._id, 'approved')}>Approve</button>
                      )}
                      {p.status === 'approved' && (isAdmin() || isAccountant()) && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleStatus(p._id, 'paid')}>Mark Paid</button>
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
            <button className="page-btn" disabled={page<=1} onClick={() => setPage(p=>p-1)}>‹</button>
            {Array.from({length: Math.min(totalPages,7)},(_,i)=>i+1).map(p=>(
              <button key={p} className={`page-btn ${page===p?'active':''}`} onClick={()=>setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}>›</button>
          </div>
        </div>
      </div>

      {/* Payslip Modal */}
      {showPayslip && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowPayslip(null)}>
          <div className="modal modal-md" style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>Payslip — {MONTHS[showPayslip.month-1]} {showPayslip.year}</h2>
              <button className="icon-btn" onClick={() => setShowPayslip(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="modal-body payslip-print-area" style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
              <style jsx>{`
                div::-webkit-scrollbar { width: 4px; }
                div::-webkit-scrollbar-track { background: transparent; }
                div::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
                @media print {
                  body * { visibility: hidden; }
                  .payslip-print-area, .payslip-print-area * { visibility: visible; }
                  .payslip-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; }
                  .no-print { display: none !important; }
                }
              `}</style>
              
              {/* Company Header */}
              <div style={{ textAlign: 'center', marginBottom: 24, borderBottom: '2px solid var(--border)', paddingBottom: 16 }}>
                <h1 style={{ margin: 0, color: 'var(--primary)', fontSize: 24, textTransform: 'uppercase' }}>{user?.company?.name || 'EMS ERP'}</h1>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {user?.company?.email && <span>{user.company.email}</span>}
                  {user?.company?.phone && <span> | {user.company.phone}</span>}
                </div>
                <div style={{ marginTop: 8, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>PAYSLIP FOR {MONTHS[showPayslip.month-1].toUpperCase()} {showPayslip.year}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Employee Details</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{showPayslip.employee?.user?.firstName} {showPayslip.employee?.user?.lastName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{showPayslip.employee?.designation} | {showPayslip.employee?.department}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {showPayslip.employee?.employeeId}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Status</div>
                  <span className={`tag tag-${statusColor[showPayslip.status]}`}>{showPayslip.status.toUpperCase()}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--success)', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>EARNINGS</h4>
                  {Object.entries(showPayslip.earnings||{}).filter(([,v])=>v>0).map(([k,v])=>(
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'4px 0' }}>
                      <span style={{ textTransform:'capitalize', color:'var(--text-secondary)' }}>{k.replace(/([A-Z])/g,' $1')}</span>
                      <span style={{ fontWeight:500 }}>{fmt(v)}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:700, marginTop:8, padding:'8px 0', borderTop:'1px solid var(--border)', color:'var(--success)' }}>
                    <span>Gross Salary</span><span>{fmt(showPayslip.totalEarnings)}</span>
                  </div>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--danger)', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>DEDUCTIONS</h4>
                  {Object.entries(showPayslip.deductions||{}).filter(([,v])=>v>0).map(([k,v])=>(
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'4px 0' }}>
                      <span style={{ textTransform:'capitalize', color:'var(--text-secondary)' }}>{k.replace(/([A-Z])/g,' $1')}</span>
                      <span style={{ fontWeight:500, color:'var(--danger)' }}>-{fmt(v)}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:700, marginTop:8, padding:'8px 0', borderTop:'1px solid var(--border)', color:'var(--danger)' }}>
                    <span>Total Deductions</span><span>-{fmt(showPayslip.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop:20, padding:16, background:'linear-gradient(135deg,rgba(99,102,241,0.05),rgba(14,165,233,0.05))', border: '1px solid var(--primary)', borderRadius: 8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:15, fontWeight:700 }}>NET SALARY PAYABLE</span>
                <span style={{ fontSize:22, fontWeight:800, color:'var(--primary)' }}>{fmt(showPayslip.netSalary)}</span>
              </div>

              <div style={{ marginTop:20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight: 1.5 }}>
                  <strong>Attendance Summary:</strong><br />
                  Present: {showPayslip.attendanceSummary?.presentDays || 0} days<br />
                  Absent: {showPayslip.attendanceSummary?.absentDays || 0} days<br />
                  Leaves: {showPayslip.attendanceSummary?.leaveDays || 0} days
                </div>
                <div style={{ textAlign: 'right', alignSelf: 'flex-end' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>Authorized Signatory</div>
                  <div style={{ marginTop: 5, borderTop: '1px solid #000', width: 120, marginLeft: 'auto' }}></div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setShowPayslip(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}>Print Payslip</button>
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
    </div>
  );
}
