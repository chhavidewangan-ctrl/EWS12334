'use client';
import { useState, useEffect, useCallback } from 'react';
import { systemAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AuditLogsPage() {
  const { user, isAdmin, isPlatformAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    company: '', // Added company filter
    month: '',
    year: new Date().getFullYear()
  });
  const [selectedLog, setSelectedLog] = useState(null); // Added state for modal

  const fetchCompanies = useCallback(async () => {
    if (isPlatformAdmin()) {
      try {
        const res = await systemAPI.getCompany(); // This returns list of companies for superadmin
        setCompanies(res.data.companies || []);
      } catch (err) { console.error('Failed to fetch companies:', err); }
    }
  }, [isPlatformAdmin]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await systemAPI.getAuditLogs({ 
        page, 
        limit: 20,
        ...filters 
      });
      setLogs(res.data.logs);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    if (isAdmin()) fetchLogs();
  }, [fetchLogs, isAdmin]);

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'var(--success)';
      case 'UPDATE': return 'var(--info)';
      case 'DELETE': return 'var(--danger)';
      case 'LOGIN': return 'var(--primary)';
      case 'STATUS_CHANGE': return 'var(--warning)';
      default: return 'var(--text-secondary)';
    }
  };

  if (!isAdmin()) {
    return (
      <div className="empty-state">
        <h3>Access Denied</h3>
        <p>You do not have permission to view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Activity Logs</h1>
          <p>Track every action performed by administrators in your company</p>
        </div>
      </div>

      <div className="filter-bar">
        <select 
          className="form-control" 
          style={{ width: 'auto' }}
          value={filters.action}
          onChange={e => setFilters({ ...filters, action: e.target.value })}
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="STATUS_CHANGE">Status Change</option>
        </select>

        <select 
          className="form-control" 
          style={{ width: 'auto' }}
          value={filters.resource}
          onChange={e => setFilters({ ...filters, resource: e.target.value })}
        >
          <option value="">All Resources</option>
          <option value="Employee">Employees</option>
          <option value="Client">Clients</option>
          <option value="Vendor">Vendors</option>
          <option value="Payroll">Payroll</option>
          <option value="Inventory">Inventory</option>
          <option value="Leave">Leaves</option>
        </select>

        <select 
          className="form-control" 
          style={{ width: 'auto' }}
          value={filters.month}
          onChange={e => setFilters({ ...filters, month: e.target.value })}
        >
          <option value="">Select Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>

        {isPlatformAdmin() && (
          <select 
            className="form-control" 
            style={{ width: 'auto' }}
            value={filters.company}
            onChange={e => setFilters({ ...filters, company: e.target.value })}
          >
            <option value="">All Companies</option>
            {companies.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        )}

        <select 
          className="form-control" 
          style={{ width: 'auto' }}
          value={filters.year}
          onChange={e => setFilters({ ...filters, year: e.target.value })}
        >
          {[2023, 2024, 2025, 2026].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <button 
          className="btn btn-outline" 
          onClick={() => {
            const now = new Date();
            let m = now.getMonth(); // Current month index is Last Month's 1-based index
            let y = now.getFullYear();
            if (m === 0) { m = 12; y -= 1; }
            setFilters({ ...filters, month: m, year: y });
          }}
        >
          Last Month
        </button>

        <button className="btn btn-secondary" onClick={() => {
          setFilters({ action: '', resource: '', month: '', year: new Date().getFullYear() });
          setPage(1);
        }}>Reset</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                {isPlatformAdmin() && <th>Company</th>}
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Description</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8">
                    <div className="loading-overlay">
                      <div className="loading-spinner"></div>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">
                      <p>No activity logs found for the selected filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id}>
                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    {isPlatformAdmin() && (
                      <td>
                        <span className="tag-outline" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                          {log.company?.name || 'Platform'}
                        </span>
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ width: 24, height: 24, fontSize: '10px' }}>
                          {log.user?.firstName?.[0]}{log.user?.lastName?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{log.user?.firstName} {log.user?.lastName}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{log.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="tag" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '11px', textTransform: 'capitalize' }}>
                        {log.user?.role || 'System'}
                      </span>
                    </td>
                    <td>
                      <span className="tag" style={{ border: `1px solid ${getActionColor(log.action)}`, color: getActionColor(log.action), background: 'transparent' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{log.resourceType}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {log.description}
                    </td>
                    <td>
                      {log.details ? (
                        <button 
                          className="btn btn-sm btn-outline" 
                          style={{ fontSize: '10px', padding: '2px 8px' }}
                          onClick={() => setSelectedLog(log)}
                        >
                          View Details
                        </button>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination" style={{ padding: '0 16px' }}>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button 
                key={p} 
                className={`page-btn ${page === p ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Activity Details</h2>
              <button className="icon-btn" onClick={() => setSelectedLog(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Action & Resource</div>
                <div style={{ fontWeight: 600 }}>{selectedLog.action} on {selectedLog.resourceType}</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Description</div>
                <div>{selectedLog.description}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Metadata / Changes</div>
                <div style={{ 
                  background: 'var(--bg-secondary)', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  border: '1px solid var(--border)'
                }}>
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
              
              <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <div>
                  <strong>IP Address:</strong> {selectedLog.ipAddress || 'Unknown'}
                </div>
                <div>
                  <strong>Timestamp:</strong> {new Date(selectedLog.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
