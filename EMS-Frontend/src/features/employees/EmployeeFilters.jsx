import React from 'react';
import Select from '../../components/ui/Select';

const DEPT_OPTIONS = ['Engineering','HR','Finance','Marketing','Sales','Operations','Design','Management','Support','IT'];
const STATUS_OPTIONS = ['active','inactive','on_notice','terminated','resigned'];

const EmployeeFilters = ({ filters, onFilterChange, companies, userRole }) => {
  return (
    <div className="filter-bar" style={{ gap: '16px', marginBottom: '24px' }}>
      <div className="search-input" style={{ flex: '1 1 300px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
        </svg>
        <input 
          placeholder="Search by name, ID, department..." 
          value={filters.search} 
          onChange={e => onFilterChange({ search: e.target.value })} 
        />
      </div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '2 1 400px' }}>
        {(userRole === 'superadmin' || companies.length > 1) && (
          <Select 
            className="form-control" 
            style={{ flex: 1, minWidth: 140 }} 
            value={filters.company} 
            onChange={e => onFilterChange({ company: e.target.value })}
            placeholder="All Companies"
            options={companies.map(c => ({ value: c._id, label: c.name }))}
          />
        )}
        <Select 
          className="form-control" 
          style={{ flex: 1, minWidth: 140 }} 
          value={filters.department} 
          onChange={e => onFilterChange({ department: e.target.value })}
          placeholder="All Departments"
          options={DEPT_OPTIONS}
        />
        <Select 
          className="form-control" 
          style={{ flex: 1, minWidth: 120 }} 
          value={filters.status} 
          onChange={e => onFilterChange({ status: e.target.value })}
          placeholder="All Status"
          options={STATUS_OPTIONS.map(s => ({ value: s, label: s.replace('_',' ').toUpperCase() }))}
        />
      </div>
    </div>
  );
};

export default EmployeeFilters;
