'use client';
import { useState, useEffect, useCallback } from 'react';
import { erpAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = ['Electronics', 'Office Supplies', 'Furniture', 'Software', 'Hardware', 'Consumables', 'Equipment', 'Other'];

export default function InventoryPage() {
  const { canEdit } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', category: '', unit: 'pcs', quantity: '', reorderLevel: '10', purchasePrice: '', sellingPrice: '', description: '', supplier: '' });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ total: 0, inStock: 0, lowStock: 0, outOfStock: 0, totalValue: 0 });
  const [vendors, setVendors] = useState([]);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirm, setConfirm] = useState({ show: false, msg: '', onConfirm: null, id: null });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const askConfirm = (msg, onConfirm) => {
    setConfirm({ show: true, msg, onConfirm });
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpAPI.getInventory({ page, limit: 12, search, category, status: stockFilter });
      const data = res.data.items || [];
      setItems(data);
      setTotal(res.data.total || 0);
      // compute stats
      const s = { total: data.length, inStock: 0, lowStock: 0, outOfStock: 0, totalValue: 0 };
      data.forEach(i => {
        if (i.status === 'in_stock') s.inStock++;
        else if (i.status === 'low_stock') s.lowStock++;
        else if (i.status === 'out_of_stock') s.outOfStock++;
        s.totalValue += (i.quantity || 0) * (i.purchasePrice || 0);
      });
      setStats(s);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, category, stockFilter]);

  const fetchVendors = async () => {
    try {
      const res = await erpAPI.getVendors({ limit: 'all' });
      setVendors(res.data.vendors || []);
    } catch (e) {
      console.error("Ven fetch err:", e);
    }
  };

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchVendors(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', sku: '', category: '', unit: 'pcs', quantity: '', reorderLevel: '10', purchasePrice: '', sellingPrice: '', description: '', supplier: '' });
    fetchVendors(); // Refresh vendors list to make it active
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name, sku: item.sku, category: item.category || '', unit: item.unit || 'pcs',
      quantity: item.quantity, reorderLevel: item.reorderLevel,
      purchasePrice: item.purchasePrice, sellingPrice: item.sellingPrice,
      description: item.description || '', supplier: item.supplier || ''
    });
    fetchVendors(); // Refresh vendors list to make it active
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const submitData = {
      ...form,
      quantity: Number(form.quantity) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
      purchasePrice: Number(form.purchasePrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
    };
    try {
      if (editItem) {
        await erpAPI.updateInventoryItem(editItem._id, submitData);
        showToast('Item updated!');
      } else {
        await erpAPI.createInventoryItem(submitData);
        showToast('Item added!');
      }
      setShowModal(false);
      fetchItems();
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'danger'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    askConfirm('Delete this inventory item?', async () => {
      try {
        await erpAPI.deleteInventoryItem(id);
        fetchItems();
        showToast('Item deleted');
      } catch { showToast('Delete failed', 'danger'); }
    });
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
  const statusColor = { in_stock: 'success', low_stock: 'warning', out_of_stock: 'danger' };
  const statusLabel = { in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock' };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Inventory</h1>
          <p>Manage stock and items</p>
        </div>
        {canEdit() && (
          <button className="btn btn-primary" onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            Add Item
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Items', value: total, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
          { label: 'In Stock', value: stats.inStock, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Low Stock', value: stats.lowStock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Out of Stock', value: stats.outOfStock, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          { label: 'Stock Value', value: fmt(stats.totalValue), color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input" style={{ flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" /></svg>
          <input placeholder="Search by name or SKU..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-control" style={{ width: 150 }} value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-control" style={{ width: 140 }} value={stockFilter} onChange={e => { setStockFilter(e.target.value); setPage(1); }}>
          <option value="">All Stock</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <button className="btn btn-secondary" onClick={() => { setSearch(''); setCategory(''); setStockFilter(''); setPage(1); }}>Reset</button>
      </div>

      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Reorder Level</th>
                <th>Purchase Price</th>
                <th>Selling Price</th>
                <th>Stock Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10}><div className="loading-overlay"><div className="loading-spinner"></div></div></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10}>
                  <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    <h3>No inventory items</h3><p>Add your first item</p>
                  </div>
                </td></tr>
              ) : items.map(item => (
                <tr key={item._id} style={{ background: item.status === 'out_of_stock' ? 'rgba(239,68,68,0.03)' : item.status === 'low_stock' ? 'rgba(245,158,11,0.03)' : 'inherit' }}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.description.slice(0, 40)}</div>}
                  </td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.sku}</span></td>
                  <td>{item.category || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{item.quantity}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.unit}</span>
                    </div>
                  </td>
                  <td>{item.reorderLevel}</td>
                  <td>{fmt(item.purchasePrice)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(item.sellingPrice)}</td>
                  <td>{fmt((item.quantity || 0) * (item.purchasePrice || 0))}</td>
                  <td><span className={`tag tag-${statusColor[item.status] || 'secondary'}`}>{statusLabel[item.status] || item.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canEdit() && (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item._id)}>Del</button>
                        </>
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
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(Math.ceil(total / 12), 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page >= Math.ceil(total / 12)} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-md" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Item' : 'Add Inventory Item'}</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
                <style jsx>{`
                  div::-webkit-scrollbar { width: 4px; }
                  div::-webkit-scrollbar-track { background: transparent; }
                  div::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
                  textarea::-webkit-scrollbar { display: none; }
                  textarea { scrollbar-width: none; ms-overflow-style: none; resize: none; }
                  select { cursor: pointer; }
                  select:hover { border-color: var(--primary-light); }
                  select:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(99,102,241,0.1); }
                  input::-webkit-outer-spin-button,
                  input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                  input[type=number] { -moz-appearance: textfield; }
                `}</style>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Item Name *</label>
                    <input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Laptop Dell XPS" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SKU *</label>
                    <input className="form-control" required value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="SKU-001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      <option value="">Select Category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select className="form-control" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                      {['pcs', 'kg', 'litre', 'box', 'set', 'unit', 'meter', 'pack'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input type="number" className="form-control" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reorder Level</label>
                    <input type="number" className="form-control" min="0" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purchase Price (₹)</label>
                    <input type="number" className="form-control" min="0" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price (₹)</label>
                    <input type="number" className="form-control" min="0" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Supplier</label>
                    <select className="form-control" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}>
                      <option value="">Select Vendor</option>
                      {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="loading-spinner"></div> Saving...</> : (editItem ? 'Update Item' : 'Add Item')}
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
