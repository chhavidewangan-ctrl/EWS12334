import React from 'react';
import Badge from '../../components/ui/Badge';
import { getImageUrl } from '../../services/api';

const EmployeeList = ({ employees, loading, onEdit, onDelete, onView, onMessage, userRole }) => {
  const statusColor = (s) => ({
    active: 'success',
    inactive: 'secondary',
    on_notice: 'warning',
    terminated: 'danger',
    resigned: 'danger'
  }[s] || 'secondary');

  if (loading) {
    return (
      <div className="card">
        <div className="loading-overlay" style={{ height: '300px' }}>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <h3>No employees found</h3>
          <p>Try adjusting filters or add a new employee</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="table-wrapper">
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
            {employees.map(emp => (
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
                  <Badge variant="primary" style={{ fontSize: 11, background: 'rgba(99,102,241,0.08)' }}>
                    {emp.company?.name || 'Main Organization'}
                  </Badge>
                </td>
                <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{emp.employeeId}</span></td>
                <td>{emp.department}</td>
                <td>{emp.designation}</td>
                <td>{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN') : '-'}</td>
                <td><Badge variant={statusColor(emp.status)}>{emp.status}</Badge></td>
                <td>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button onClick={() => onView(emp)} className="btn btn-secondary btn-sm" style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="View Details">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button onClick={() => onMessage(emp)} className="btn btn-info btn-sm" style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Send Message">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                    {userRole !== 'superadmin' && (
                      <>
                        <button onClick={() => onEdit(emp)} className="btn btn-primary btn-sm" style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => onDelete(emp._id)} className="btn btn-danger btn-sm" style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeList;
