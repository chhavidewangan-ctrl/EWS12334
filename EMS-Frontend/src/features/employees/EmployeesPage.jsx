import React, { useState, useEffect } from 'react';
import { useEmployees } from '../../hooks/useEmployees';
import { systemAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import EmployeeList from './EmployeeList';
import EmployeeFilters from './EmployeeFilters';

const EmployeesPage = () => {
  const { 
    employees, 
    loading, 
    total, 
    page, 
    setPage, 
    totalPages, 
    filters, 
    updateFilters, 
    deleteEmployee 
  } = useEmployees();

  const [userRole, setUserRole] = useState('employee');
  const [companies, setCompanies] = useState([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('ems_user') || '{}');
    setUserRole(user.role || 'employee');

    if (user.role === 'superadmin' || user.role === 'admin') {
      systemAPI.getCompany().then(res => {
        setCompanies(Array.isArray(res.data.companies) ? res.data.companies : []);
      }).catch(() => {});
    }
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      const result = await deleteEmployee(id);
      if (result.success) {
        alert('Employee deleted successfully');
      } else {
        alert(result.error);
      }
    }
  };

  return (
    <div className="employees-feature">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Employees</h1>
          <p>{total} total employees</p>
        </div>
        {userRole !== 'superadmin' && (
          <Button onClick={() => setShowFormModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: 8}}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add Employee
          </Button>
        )}
      </div>

      <EmployeeFilters 
        filters={filters} 
        onFilterChange={updateFilters} 
        companies={companies}
        userRole={userRole}
      />

      <EmployeeList 
        employees={employees} 
        loading={loading}
        userRole={userRole}
        onDelete={handleDelete}
        onEdit={(emp) => { setSelectedEmployee(emp); setShowFormModal(true); }}
        onView={(emp) => { /* TODO: View Modal */ }}
        onMessage={(emp) => { /* TODO: Message Modal */ }}
      />

      {totalPages > 1 && (
        <div className="card" style={{ marginTop: '16px', padding: '0 16px' }}>
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}

      {/* Simplified Modal for demo purposes - In a real refactor, I would create EmployeeForm.jsx */}
      <Modal 
        isOpen={showFormModal} 
        onClose={() => { setShowFormModal(false); setSelectedEmployee(null); }}
        title={selectedEmployee ? 'Edit Employee' : 'Add Employee'}
        size="lg"
      >
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Feature-based Form Component would go here.<br/>
          (Refactoring continued...)
        </div>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
