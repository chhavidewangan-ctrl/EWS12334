'use client';
import { useState, useEffect, useCallback } from 'react';
import { erpAPI } from '../../services/api';

const TABS = ['clients', 'vendors', 'invoices', 'expenses', 'inventory', 'sales'];
const CATEGORIES = ['Electronics', 'Office Supplies', 'Furniture', 'Software', 'Hardware', 'Consumables', 'Equipment', 'Other'];
const UNITS = ['pcs', 'kg', 'litre', 'box', 'set', 'unit', 'meter', 'pack'];

export default function ERPPage() {
  const [tab, setTab] = useState('clients');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]); // For inventory supplier dropdown
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirm, setConfirm] = useState({ show: false, msg: '', onConfirm: null, id: null });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const askConfirm = (msg, onConfirm) => {
    setConfirm({ show: true, msg, onConfirm });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      const params = { page, limit: 10 };
      if (tab === 'clients') res = await erpAPI.getClients(params);
      else if (tab === 'vendors') res = await erpAPI.getVendors(params);
      else if (tab === 'invoices') res = await erpAPI.getInvoices(params);
      else if (tab === 'expenses') res = await erpAPI.getExpenses(params);
      else if (tab === 'inventory') res = await erpAPI.getInventory(params);
      else if (tab === 'sales') res = await erpAPI.getSales(params);
      const key = tab === 'inventory' ? 'items' : tab;
      setData(res.data[key] || []);
      setTotal(res.data.total || 0);
    } catch { } finally { setLoading(false); }
  }, [tab, page]);

  const fetchAllVendors = async () => {
    try {
      const res = await erpAPI.getVendors({ limit: 'all' });
      setVendors(res.data.vendors || []);
    } catch { }
  };

  useEffect(() => { fetchData(); setForm({}); if (tab === 'inventory') fetchAllVendors(); }, [fetchData, tab]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    let submitData = { ...form };
    if (tab === 'inventory') {
      submitData.quantity = Number(submitData.quantity) || 0;
      submitData.reorderLevel = Number(submitData.reorderLevel) || 0;
      submitData.purchasePrice = Number(submitData.purchasePrice) || 0;
      submitData.sellingPrice = Number(submitData.sellingPrice) || 0;
    }
    try {
      if (tab === 'clients') await erpAPI.createClient(submitData);
      else if (tab === 'vendors') await erpAPI.createVendor(submitData);
      else if (tab === 'expenses') await erpAPI.createExpense(submitData);
      else if (tab === 'inventory') await erpAPI.createInventoryItem(submitData);
      setShowModal(false);
      fetchData();
      showToast(`${tab.slice(0, -1)} created!`);
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'danger'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    askConfirm(`Delete this ${tab.slice(0, -1)}?`, async () => {
      try {
        if (tab === 'clients') await erpAPI.deleteClient(id);
        else if (tab === 'vendors') await erpAPI.deleteVendor(id);
        else if (tab === 'invoices') await erpAPI.deleteInvoice(id);
        else if (tab === 'expenses') await erpAPI.deleteExpense(id);
        else if (tab === 'inventory') await erpAPI.deleteInventoryItem(id);
        else if (tab === 'sales') await erpAPI.deleteSale(id);
        fetchData();
        showToast('Record deleted');
      } catch { showToast('Delete failed', 'danger'); }
    });
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  const renderForm = () => {
    const inputs = {
      clients: [
        { key: 'name', label: 'Company Name', required: true },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'phone', label: 'Phone' },
        { key: 'contactPerson', label: 'Contact Person' },
        { key: 'gstNumber', label: 'GST Number' },
        { key: 'industry', label: 'Industry' },
      ],
      vendors: [
        { key: 'name', label: 'Vendor Name', required: true },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'phone', label: 'Phone' },
        { key: 'contactPerson', label: 'Contact Person' },
        { key: 'category', label: 'Category' },
        { key: 'gstNumber', label: 'GST Number' },
      ],
      expenses: [
        { key: 'category', label: 'Category', required: true },
        { key: 'amount', label: 'Amount (₹)', type: 'number', required: true },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'description', label: 'Description' },
        { key: 'paymentMode', label: 'Payment Mode', select: ['cash', 'bank_transfer', 'card', 'upi', 'cheque'] },
      ],
      inventory: [
        { key: 'name', label: 'Item Name', required: true },
        { key: 'sku', label: 'SKU', required: true },
        { key: 'category', label: 'Category', select: CATEGORIES },
        { key: 'unit', label: 'Unit', select: UNITS },
        { key: 'quantity', label: 'Quantity', type: 'number' },
        { key: 'reorderLevel', label: 'Reorder Level', type: 'number' },
        { key: 'purchasePrice', label: 'Purchase Price (₹)', type: 'number' },
        { key: 'sellingPrice', label: 'Selling Price (₹)', type: 'number' },
        { key: 'supplier', label: 'Supplier', select: vendors.map(v => ({ label: v.name, value: v._id })) },
      ],
    };
    return (inputs[tab] || []).map(f => (
      <div className="form-group" key={f.key}>
        <label className="form-label">{f.label}{f.required ? ' *' : ''}</label>
        {f.select ? (
          <select className="form-control" required={f.required} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={{ cursor: 'pointer' }}>
            <option value="">Select...</option>
            {f.select.map(o => (
              <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
                {typeof o === 'string' ? o : o.label}
              </option>
            ))}
          </select>
        ) : (
          <input className="form-control" type={f.type || 'text'} required={f.required} placeholder={f.placeholder || ''} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
        )}
      </div>
    ));
  };

  const renderRow = (item) => {
    if (tab === 'clients' || tab === 'vendors') return (
      <tr key={item._id}>
        <td><div style={{ fontWeight: 500 }}>{item.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.email}</div></td>
        <td>{item.phone || '-'}</td>
        <td>{item.contactPerson || item.category || '-'}</td>
        <td>{item.gstNumber || '-'}</td>
        <td><span className={`tag tag-${item.status === 'active' ? 'success' : 'secondary'}`}>{item.status}</span></td>
        <td>
          <button onClick={() => handleDelete(item._id)} className="btn btn-danger btn-sm">Delete</button>
        </td>
      </tr>
    );
    if (tab === 'invoices') return (
      <tr key={item._id}>
        <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.invoiceNumber}</span></td>
        <td>{item.client?.name || '-'}</td>
        <td>{new Date(item.invoiceDate).toLocaleDateString('en-IN')}</td>
        <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN') : '-'}</td>
        <td style={{ fontWeight: 600 }}>{fmt(item.total)}</td>
        <td><span className={`tag tag-${item.status === 'paid' ? 'success' : item.status === 'overdue' ? 'danger' : 'warning'}`}>{item.status}</span></td>
        <td><button onClick={() => handleDelete(item._id)} className="btn btn-danger btn-sm">Delete</button></td>
      </tr>
    );
    if (tab === 'expenses') return (
      <tr key={item._id}>
        <td>{item.category}</td>
        <td style={{ fontWeight: 600, color: 'var(--danger)' }}>{fmt(item.amount)}</td>
        <td>{new Date(item.date).toLocaleDateString('en-IN')}</td>
        <td>{item.description || '-'}</td>
        <td>{item.paymentMode || '-'}</td>
        <td><span className={`tag tag-${item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning'}`}>{item.status}</span></td>
        <td><button onClick={() => handleDelete(item._id)} className="btn btn-danger btn-sm">Delete</button></td>
      </tr>
    );
    if (tab === 'inventory') return (
      <tr key={item._id}>
        <td><div style={{ fontWeight: 500 }}>{item.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.sku}</div></td>
        <td>{item.category || '-'}</td>
        <td>{item.quantity} {item.unit}</td>
        <td>{item.reorderLevel}</td>
        <td>{fmt(item.purchasePrice)}</td>
        <td>{fmt(item.sellingPrice)}</td>
        <td><span className={`tag tag-${item.status === 'in_stock' ? 'success' : item.status === 'low_stock' ? 'warning' : 'danger'}`}>{item.status?.replace('_', ' ')}</span></td>
        <td><button onClick={() => handleDelete(item._id)} className="btn btn-danger btn-sm">Delete</button></td>
      </tr>
    );
    if (tab === 'sales') return (
      <tr key={item._id}>
        <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.salesNumber}</span></td>
        <td>{item.client?.name || '-'}</td>
        <td>{new Date(item.date).toLocaleDateString('en-IN')}</td>
        <td style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(item.total)}</td>
        <td><span className={`tag tag-${item.paymentStatus === 'paid' ? 'success' : 'warning'}`}>{item.paymentStatus}</span></td>
      </tr>
    );
    return null;
  };

  const tableHeaders = {
    clients: ['Name/Email', 'Phone', 'Contact', 'GST', 'Status', 'Action'],
    vendors: ['Name/Email', 'Phone', 'Category', 'GST', 'Status', 'Action'],
    invoices: ['Invoice #', 'Client', 'Date', 'Due Date', 'Amount', 'Status', 'Action'],
    expenses: ['Category', 'Amount', 'Date', 'Description', 'Payment', 'Status', 'Action'],
    inventory: ['Name/SKU', 'Category', 'Quantity', 'Reorder', 'Purchase Price', 'Selling Price', 'Status', 'Action'],
    sales: ['Sale #', 'Client', 'Date', 'Total', 'Payment'],
  };

  const canCreate = ['clients', 'vendors', 'expenses', 'inventory'].includes(tab);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>ERP Modules</h1>
          <p>Manage business operations</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => { setForm({}); if (tab === 'inventory') fetchAllVendors(); setShowModal(true); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            Add {tab === 'inventory' ? 'Inventory' : tab.slice(0, -1)}
          </button>
        )}
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setPage(1); }} style={{ textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{total} records</p>

      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>{(tableHeaders[tab] || []).map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10}><div className="loading-overlay"><div className="loading-spinner"></div></div></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={10}>
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    <h3>No {tab} found</h3>
                  </div>
                </td></tr>
              ) : data.map(item => renderRow(item))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '0 16px' }}>
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(Math.ceil(total / 10), 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {showModal && canCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-md" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>Add {tab === 'inventory' ? 'Inventory Item' : tab.slice(0, -1)}</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
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
                <div className="form-grid">{renderForm()}</div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="loading-spinner"></div> Saving...</> : 'Create'}
                </button>
              </div>
            </form>
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
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h3 style={{ marginBottom: 8, fontSize: 18 }}>Are you sure?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>{confirm.msg}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setConfirm({ ...confirm, show: false })}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { confirm.onConfirm(); setConfirm({ ...confirm, show: false }); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
