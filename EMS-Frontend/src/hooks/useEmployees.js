import { useState, useEffect, useCallback } from 'react';
import { employeeAPI } from '../services/api';

export const useEmployees = (initialParams = {}) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    status: '',
    company: '',
    ...initialParams
  });

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeAPI.getAll({ 
        page, 
        limit: 10, 
        search: filters.search, 
        department: filters.department, 
        status: filters.status, 
        company: filters.company 
      });
      const data = res.data.employees || res.data.users || [];
      setEmployees(data);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page on filter change
  };

  const deleteEmployee = async (id) => {
    try {
      await employeeAPI.delete(id);
      await fetchEmployees();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Delete failed' };
    }
  };

  return {
    employees,
    loading,
    total,
    page,
    setPage,
    totalPages,
    filters,
    updateFilters,
    refresh: fetchEmployees,
    deleteEmployee
  };
};
