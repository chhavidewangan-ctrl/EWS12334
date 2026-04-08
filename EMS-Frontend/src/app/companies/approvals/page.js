'use client';
import { useEffect, useState } from 'react';
import { systemAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

export default function CompanyApprovals() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await systemAPI.getAllCompanies();
      setCompanies(res.data.data);
    } catch (err) {
      setError('Failed to fetch companies.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await systemAPI.updateCompanyStatus(id, status);
      setCompanies(companies.map(c => c._id === id ? { ...c, status, isActive: status === 'approved' } : c));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  if (loading) return <div className="loading-overlay"><div className="loading-spinner"></div></div>;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-header-left">
          <div className="breadcrumb">
            <span>System</span> / <span>Company Approvals</span>
          </div>
          <h1>Company Approvals</h1>
          <p>Review and approve new company registration requests</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Admin Name</th>
                <th>Email</th>
                <th>Industry</th>
                <th>Status</th>
                <th>Registered On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No company requests found.</td>
                </tr>
              ) : companies.map(c => (
                <tr key={c._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.website || 'No website'}</div>
                  </td>
                  <td>{c.createdBy?.firstName} {c.createdBy?.lastName}</td>
                  <td>{c.createdBy?.email}</td>
                  <td><span className="tag tag-info">{c.industry || 'Other'}</span></td>
                  <td>
                    <span className={`tag ${
                      c.status === 'approved' ? 'tag-success' : 
                      c.status === 'rejected' ? 'tag-danger' : 
                      'tag-warning'
                    }`}>
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {c.status === 'pending' && (
                        <>
                          <button 
                            className="btn btn-sm btn-success" 
                            onClick={() => handleUpdateStatus(c._id, 'approved')}
                          >
                            Approve
                          </button>
                          <button 
                            className="btn btn-sm btn-danger" 
                            onClick={() => handleUpdateStatus(c._id, 'rejected')}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {c.status !== 'pending' && (
                        <button 
                          className="btn btn-sm btn-secondary" 
                          onClick={() => handleUpdateStatus(c._id, 'pending')}
                        >
                          Reset to Pending
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
