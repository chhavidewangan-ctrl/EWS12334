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
            <div className="modal-body payslip-print-area" style={{ overflowY: 'auto', flex: 1, padding: '20px', backgroundColor: '#fff', color: '#000' }}>
              <style jsx>{`
                .payslip-table {
                  width: 100%;
                  border-collapse: collapse;
                  border: 2px solid #000;
                  font-family: 'Arial', sans-serif;
                  font-size: 13px;
                }
                .payslip-table th, .payslip-table td {
                  border: 1px solid #000;
                  padding: 6px 10px;
                  text-align: left;
                }
                .bg-light { background-color: #fff9e6; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                
                @media print {
                  body * { visibility: hidden; }
                  .payslip-print-area, .payslip-print-area * { visibility: visible; }
                  .payslip-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
                  .no-print { display: none !important; }
                  .modal-header, .modal-footer { display: none !important; }
                  .modal { border: none !important; box-shadow: none !important; }
                }
              `}</style>
              
              <table className="payslip-table">
                {/* Main Header */}
                <tbody>
                  <tr>
                    <td rowSpan="3" width="30%" className="text-center">
                      <img src="/logo.png" alt="Srijana Logo" style={{ height: '60px' }} />
                    </td>
                    <td colSpan="3" className="text-center font-bold" style={{ fontSize: '18px' }}>
                      {showPayslip.company?.name?.toUpperCase() || 'TSRIJANALI FOOD AND SERVICES PVT LTD'}
                    </td>

                  </tr>
                  <tr>
                    <td colSpan="3" className="text-center" style={{ fontSize: '11px' }}>
                      {showPayslip.company?.address ? (
                        typeof showPayslip.company.address === 'object' ? (
                          [showPayslip.company.address.street, showPayslip.company.address.city, showPayslip.company.address.state, showPayslip.company.address.country, showPayslip.company.address.pincode].filter(Boolean).join(', ')
                        ) : showPayslip.company.address
                      ) : 'Mahadev Tata Motors ke Samne, Bank Of Baroda ke Baju, Naya Dhamtari Road Deopuri Raipur'}
                    </td>
                  </tr>


                  <tr>
                    <td width="30%" className="text-center font-bold">Pay Slip</td>
                    <td colSpan="2" className="text-center font-bold bg-light">
                      {MONTHS[showPayslip.month-1].substring(0,3)}-{showPayslip.year.toString().substring(2)}
                    </td>
                  </tr>

                  {/* Employee Details Row 1 */}
                  <tr>
                    <td className="font-bold">Employee Name</td>
                    <td>{showPayslip.employee?.user?.firstName} {showPayslip.employee?.user?.lastName}</td>
                    <td className="font-bold">Bank Name</td>
                    <td className="bg-light">{showPayslip.employee?.bankDetails?.bankName || 'N/A'}</td>
                  </tr>
                  {/* Employee Details Row 2 */}
                  <tr>
                    <td className="font-bold">Employee ID</td>
                    <td>{showPayslip.employee?.employeeId}</td>
                    <td className="font-bold">Bank A/c No</td>
                    <td>{showPayslip.employee?.bankDetails?.accountNumber || 'N/A'}</td>
                  </tr>
                  {/* Employee Details Row 3 */}
                  <tr>
                    <td className="font-bold">Designation</td>
                    <td>{showPayslip.employee?.designation}</td>
                    <td className="font-bold">PAN No.</td>
                    <td>{showPayslip.employee?.documents?.panNumber || 'NIL'}</td>
                  </tr>
                  {/* Employee Details Row 4 */}
                  <tr>
                    <td className="font-bold">Department,</td>
                    <td>{showPayslip.employee?.department}</td>
                    <td className="font-bold">UAN</td>
                    <td>{showPayslip.employee?.documents?.uanNumber || 'NIL'}</td>
                  </tr>
                  {/* Employee Details Row 5 */}
                  <tr>
                    <td className="font-bold">Date of Joining</td>
                    <td>{showPayslip.employee?.joiningDate ? new Date(showPayslip.employee.joiningDate).toLocaleDateString('en-GB') : '-'}</td>
                    <td colSpan="2"></td>
                  </tr>
                  {/* Employee Details Row 6 */}
                  <tr>
                    <td className="font-bold">Gross Salary</td>
                    <td className="bg-light">{showPayslip.grossSalary || 0}</td>
                    <td colSpan="2"></td>
                  </tr>

                  {/* Earnings and Deductions Header */}
                  <tr>
                    <td colSpan="2" className="text-center font-bold">Earnings</td>
                    <td colSpan="2" className="text-center font-bold">Deductions</td>
                  </tr>

                  {/* Table Content */}
                  <tr>
                    <td colSpan="2" style={{ padding: 0 }}>
                      <table width="100%" style={{ border: 'none', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td width="60%" style={{ border: 'none', borderRight: '1px solid #000' }}>Basic Salary</td>
                            <td style={{ border: 'none' }} className="text-right">₹ {showPayslip.earnings?.basicSalary?.toLocaleString() || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    <td colSpan="2" rowSpan="3" style={{ padding: 0 }}>
                      <table width="100%" style={{ border: 'none', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr style={{ height: '80px' }}>
                            <td className="text-center font-bold" width="50%" style={{ border: 'none', borderRight: '1px solid #000' }}>TOTAL LEAVE</td>
                            <td className="text-center" style={{ border: 'none' }}>{showPayslip.attendanceSummary?.leaveDays || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2" style={{ padding: 0 }}>
                      <table width="100%" style={{ border: 'none', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td width="60%" style={{ border: 'none', borderRight: '1px solid #000' }}>HRA</td>
                            <td style={{ border: 'none' }} className="text-right">₹ {showPayslip.earnings?.hra?.toLocaleString() || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2" style={{ padding: 0 }}>
                      <table width="100%" style={{ border: 'none', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td width="60%" style={{ border: 'none', borderRight: '1px solid #000' }}>Conveyance Allowances</td>
                            <td style={{ border: 'none' }} className="text-right">₹ {showPayslip.earnings?.conveyance?.toLocaleString() || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2" style={{ padding: 0 }}>
                      <table width="100%" style={{ border: 'none', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td width="60%" style={{ border: 'none', borderRight: '1px solid #000' }}>Extra Duty</td>
                            <td style={{ border: 'none' }} className="text-right">₹ {showPayslip.earnings?.extraDuty?.toLocaleString() || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    <td colSpan="2" style={{ padding: 0 }}>
                      <table width="100%" style={{ border: 'none', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td width="60%" style={{ border: 'none', borderRight: '1px solid #000' }}>Food & Accommodation</td>
                            <td style={{ border: 'none' }} className="text-right">₹ {showPayslip.deductions?.food?.toLocaleString() || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2" style={{ border: 'none' }}></td>
                    <td colSpan="2" style={{ padding: 0 }}>
                      <table width="100%" style={{ border: 'none', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td width="60%" style={{ border: 'none', borderRight: '1px solid #000' }}>Transportation</td>
                            <td style={{ border: 'none' }} className="text-right">₹ {showPayslip.deductions?.transportation?.toLocaleString() || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2" style={{ padding: 0 }}>
                      <table width="100%" style={{ border: 'none', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td width="60%" className="font-bold" style={{ border: 'none', borderRight: '1px solid #000' }}>EGross Salary</td>
                            <td style={{ border: 'none' }} className="text-right font-bold">₹ {showPayslip.totalEarnings?.toLocaleString() || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    <td colSpan="2" style={{ padding: 0 }}>
                      <table width="100%" style={{ border: 'none', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td width="60%" className="font-bold" style={{ border: 'none', borderRight: '1px solid #000' }}>Total Deductions</td>
                            <td style={{ border: 'none' }} className="text-right font-bold">₹ {showPayslip.totalDeductions?.toLocaleString() || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* Net Pay */}
                  <tr>
                    <td colSpan="2" className="text-center font-bold">Net Pay</td>
                    <td colSpan="2" className="text-right font-bold" style={{ fontSize: '16px' }}>
                      ₹ {showPayslip.netSalary?.toLocaleString() || 0}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #000', width: '150px', marginTop: '40px' }}></div>
                  <div style={{ fontSize: '12px' }}>Employee Signature</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #000', width: '150px', marginTop: '40px' }}></div>
                  <div style={{ fontSize: '12px' }}>Authorized Signatory</div>
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
