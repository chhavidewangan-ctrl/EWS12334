"use client";
import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { projectAPI, employeeAPI } from '../../services/api';

const STATUS_COLS = [
  { id: 'todo', label: 'To Do', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { id: 'in_review', label: 'In Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { id: 'completed', label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
];

const PRIORITY_C = { low: 'secondary', medium: 'info', high: 'warning', critical: 'danger' };

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${baseUrl}${cleanPath}`.replace(/([^:]\/)\/+/g, "$1");
};

function Icon({ path, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);
  const [completionNote, setCompletionNote] = useState('');
  const [view, setView] = useState('list');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', project: '', assignedTo: '', priority: 'medium', status: 'todo', dueDate: '', estimatedHours: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [confirm, setConfirm] = useState({ show: false, msg: '', onConfirm: null, id: null });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterProject) params.project = filterProject;
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      const res = await projectAPI.getAllTasks(params);
      setTasks(res.data.tasks || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterProject, filterStatus, filterPriority]);

  useEffect(() => {
    setMounted(true);
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    projectAPI.getAll({ limit: 100 }).then(r => setProjects(r.data.projects || [])).catch(() => {});
    employeeAPI.getAll({ limit: 100 }).then(r => setEmployees(r.data.employees || [])).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditTask(null);
    setForm({ title: '', description: '', project: '', assignedTo: '', priority: 'medium', status: 'todo', dueDate: '', estimatedHours: '' });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditTask(task);
    setForm({
      title: task.title || '',
      description: task.description || '',
      project: task.project?._id || task.project || '',
      assignedTo: task.assignedTo?._id || task.assignedTo || '',
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      estimatedHours: task.estimatedHours || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTask) {
        if (editTask.status === 'completed' && form.status !== 'completed') {
          showToast('Completed tasks cannot be moved back to progress.', 'warning');
          setSaving(false);
          return;
        }
        await projectAPI.updateTask(editTask._id, form);
        showToast('Task updated!');
      } else {
        await projectAPI.createTask(form);
        showToast('Task created!');
      }
      setShowModal(false);
      fetchTasks();
    } catch (err) { showToast(err.response?.data?.message || 'Failed', 'danger'); }
    finally { setSaving(false); }
  };

  const askDelete = (id) => {
    setConfirm({
      show: true,
      msg: 'Are you sure you want to delete this task?',
      onConfirm: async () => {
        try {
          await projectAPI.deleteTask(id);
          fetchTasks();
          showToast('Task deleted');
        } catch { showToast('Delete failed', 'danger'); }
      }
    });
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const task = tasks.find(t => t._id === draggableId);
    const newStatus = destination.droppableId;

    if (task?.status === 'completed' && newStatus !== 'completed') {
      showToast('Completed tasks cannot be moved back to progress.', 'warning');
      return;
    }

    if (newStatus === 'completed') {
      setTaskToComplete(task);
      setShowCompleteModal(true);
      return;
    }

    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t._id === draggableId ? { ...t, status: newStatus } : t));
      await projectAPI.updateTask(draggableId, { status: newStatus });
    } catch {
      // Revert if failed
      fetchTasks();
      showToast('Failed to update task status', 'danger');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const task = tasks.find(t => t._id === id);
    if (task?.status === 'completed' && newStatus !== 'completed') {
      showToast('Completed tasks cannot be moved back to progress.', 'warning');
      return;
    }

    if (newStatus === 'completed') {
      setTaskToComplete(task);
      setShowCompleteModal(true);
      return;
    }

    try {
      await projectAPI.updateTask(id, { status: newStatus });
      setTasks(prev => prev.map(t => t._id === id ? { ...t, status: newStatus } : t));
    } catch { 
      showToast('Status update failed', 'danger');
    }
  };

  const confirmCompletion = async () => {
    if (!taskToComplete) return;
    try {
      setTasks(prev => prev.map(t => t._id === taskToComplete._id ? { ...t, status: 'completed', completionNote } : t));
      await projectAPI.updateTask(taskToComplete._id, { 
        status: 'completed', 
        completionNote,
        completedDate: new Date()
      });
      showToast('Task marked as completed!');
      setShowCompleteModal(false);
      setCompletionNote('');
      setTaskToComplete(null);
    } catch (err) {
      fetchTasks();
      showToast('Failed to complete task', 'danger');
    }
  };

  const tasksByStatus = (status) => tasks.filter(t => t.status === status);

  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date();

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Tasks</h1>
          <p>{tasks.length} total tasks</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {['board', 'list'].map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, background: view === v ? 'var(--primary)' : 'transparent', color: view === v ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon path={v === 'board' ? 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18' : 'M4 6h16M4 10h16M4 14h16M4 18h16'} />
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <Icon path="M12 5v14M5 12h14" />
            New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select className="form-control" style={{ width: 160 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select className="form-control" style={{ width: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {STATUS_COLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select className="form-control" style={{ width: 120 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priority</option>
          {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p} style={{ textTransform: 'capitalize' }}>{p}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={() => { setFilterProject(''); setFilterStatus(''); setFilterPriority(''); }}>Reset</button>
      </div>

      {loading || !mounted ? (
        <div className="loading-overlay"><div className="loading-spinner" style={{ width: 36, height: 36 }}></div></div>
      ) : view === 'board' ? (
        /* ---- KANBAN BOARD ---- */
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
            {STATUS_COLS.map(col => (
              <div key={col.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }}></div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{col.label}</span>
                  <span style={{ marginLeft: 'auto', background: col.bg, color: col.color, borderRadius: 99, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                    {tasksByStatus(col.id).length}
                  </span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 8, 
                        minHeight: 150,
                        background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.03)' : 'transparent',
                        borderRadius: 8,
                        transition: 'background 0.2s'
                      }}
                    >
                      {tasksByStatus(col.id).map((task, index) => (
                        <Draggable 
                          key={task._id} 
                          draggableId={task._id} 
                          index={index}
                          isDragDisabled={task.status === 'completed'}
                        >
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`card ${snapshot.isDragging ? 'dragging' : ''}`} 
                              style={{ 
                                padding: 14, 
                                cursor: task.status === 'completed' ? 'default' : 'grab',
                                border: snapshot.isDragging ? '1px solid var(--primary)' : '1px solid var(--border)',
                                boxShadow: snapshot.isDragging ? '0 8px 20px rgba(0,0,0,0.3)' : 'none',
                                opacity: task.status === 'completed' ? 0.8 : 1,
                                ...provided.draggableProps.style
                              }}
                              onClick={() => openEdit(task)}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span className={`tag tag-${PRIORITY_C[task.priority]}`}>{task.priority}</span>
                                {isOverdue(task.dueDate) && task.status !== 'completed' && (
                                  <span className="tag tag-danger">Overdue</span>
                                )}
                              </div>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, lineHeight: 1.4 }}>{task.title}</div>
                              {task.description && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
                                  {task.description.slice(0, 60)}{task.description.length > 60 ? '...' : ''}
                                </div>
                              )}
                              {task.project?.name && (
                                <div style={{ fontSize: 11, color: 'var(--primary)', marginBottom: 8 }}>📁 {task.project.name}</div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                {task.assignedTo?.user ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                                    <div className="avatar" style={{ width: 22, height: 22, fontSize: 9, overflow:'hidden', border:'1px solid var(--border)' }}>
                                      {getImageUrl(task.assignedTo?.user?.avatar || task.assignedTo?.profilePhoto) ? (
                                        <img src={getImageUrl(task.assignedTo?.user?.avatar || task.assignedTo?.profilePhoto)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                      ) : (
                                        <>{task.assignedTo.user.firstName?.[0]}{task.assignedTo.user.lastName?.[0]}</>
                                      )}
                                    </div>
                                    {task.assignedTo.user.firstName}
                                  </div>
                                ) : <span></span>}
                                {task.dueDate && (
                                  <span style={{ fontSize: 10, color: isOverdue(task.dueDate) ? 'var(--danger)' : 'var(--text-muted)' }}>
                                    {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                              </div>
                              {/* Quick status change - Hidden during drag or for completed */}
                              {task.status !== 'completed' && !snapshot.isDragging && (
                                <div style={{ display: 'flex', gap: 3, marginTop: 8 }} onClick={e => e.stopPropagation()}>
                                  {STATUS_COLS.filter(s => s.id !== col.id).map(s => (
                                    <button 
                                      key={s.id} 
                                      onClick={() => handleStatusChange(task._id, s.id)}
                                      style={{ 
                                        flex: 1, 
                                        padding: '3px 0', 
                                        fontSize: 9, 
                                        border: '1px solid var(--border)', 
                                        borderRadius: 4, 
                                        background: 'transparent', 
                                        cursor: 'pointer', 
                                        color: 'var(--text-muted)' 
                                      }}
                                    >
                                      → {s.label.split(' ')[0]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      <button onClick={openCreate} style={{ width: '100%', padding: '8px', border: '1px dashed var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Icon path="M12 5v14M5 12h14" size={12} /> Add task
                      </button>
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      ) : (
        /* ---- LIST VIEW ---- */
        <div className="card">
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                      <h3>No tasks found</h3><p>Create your first task</p>
                    </div>
                  </td></tr>
                ) : tasks.map(task => (
                  <tr key={task._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{task.title}</div>
                      {task.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.description.slice(0, 50)}{task.description.length > 50 ? '...' : ''}</div>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--primary)' }}>{task.project?.name || '-'}</td>
                    <td>
                      {task.assignedTo?.user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: 10, overflow:'hidden', border:'1px solid var(--border)' }}>
                            {getImageUrl(task.assignedTo?.user?.avatar || task.assignedTo?.profilePhoto) ? (
                              <img src={getImageUrl(task.assignedTo?.user?.avatar || task.assignedTo?.profilePhoto)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            ) : (
                              <>{task.assignedTo.user.firstName?.[0]}{task.assignedTo.user.lastName?.[0]}</>
                            )}
                          </div>
                          {task.assignedTo.user.firstName} {task.assignedTo.user.lastName}
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
                    </td>
                    <td><span className={`tag tag-${PRIORITY_C[task.priority]}`}>{task.priority}</span></td>
                    <td style={{ fontSize: 12, color: isOverdue(task.dueDate) && task.status !== 'completed' ? 'var(--danger)' : 'inherit' }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : '-'}
                      {isOverdue(task.dueDate) && task.status !== 'completed' && ' ⚠️'}
                    </td>
                    <td>{task.estimatedHours ? `${task.estimatedHours}h` : '-'}</td>
                    <td>
                      <select 
                        value={task.status} 
                        onChange={e => handleStatusChange(task._id, e.target.value)}
                        disabled={task.status === 'completed'}
                        style={{ 
                          border: '1px solid var(--border)', 
                          borderRadius: 6, 
                          padding: '3px 6px', 
                          fontSize: 12, 
                          background: 'var(--bg-card)', 
                          color: 'var(--text-primary)', 
                          cursor: task.status === 'completed' ? 'not-allowed' : 'pointer',
                          opacity: task.status === 'completed' ? 0.7 : 1
                        }}
                      >
                        {STATUS_COLS.map(s => <option key={s.id} value={s.id} disabled={task.status === 'completed' && s.id !== 'completed'}>{s.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(task)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => askDelete(task._id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-md" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>{editTask ? 'Edit Task' : 'Create New Task'}</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <Icon path="M6 18L18 6M6 6l12 12" />
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
                  input::-webkit-outer-spin-button,
                  input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                  input[type=number] { -moz-appearance: textfield; }
                `}</style>
                <div className="form-group">
                  <label className="form-label">Task Title *</label>
                  <input className="form-control" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Enter task title" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Task details..." />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Project</label>
                    <select className="form-control" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })}>
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign To</label>
                    <select className="form-control" value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
                      <option value="">Unassigned</option>
                      {employees.map(e => <option key={e._id} value={e._id}>{e.user?.firstName} {e.user?.lastName}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-control" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p} style={{ textTransform: 'capitalize' }}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select 
                      className="form-control" 
                      value={form.status} 
                      onChange={e => setForm({ ...form, status: e.target.value })}
                      disabled={editTask?.status === 'completed'}
                    >
                      {STATUS_COLS.map(s => (
                        <option 
                          key={s.id} 
                          value={s.id} 
                          disabled={editTask?.status === 'completed' && s.id !== 'completed'}
                        >
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="date" className="form-control" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimated Hours</label>
                    <input type="number" className="form-control" placeholder="e.g. 8" value={form.estimatedHours} onChange={e => setForm({ ...form, estimatedHours: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="loading-spinner"></div> Saving...</> : (editTask ? 'Update Task' : 'Create Task')}
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
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
      {/* Completion Note Modal */}
      {showCompleteModal && (
        <div className="modal-overlay" style={{ zIndex: 10002 }}>
          <div className="modal modal-sm" style={{ textAlign: 'left' }}>
            <div className="modal-header">
              <h2>Complete Task</h2>
              <button className="icon-btn" onClick={() => setShowCompleteModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                Please provide a summary or note about the work done to complete this task.
              </p>
              <div className="form-group">
                <label className="form-label">Completion Note *</label>
                <textarea 
                  className="form-control" 
                  rows={4}
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="What was achieved? Any final remarks?"
                  required
                  autoFocus
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCompleteModal(false)}>Cancel</button>
              <button className="btn btn-success" onClick={confirmCompletion}>Mark as Completed</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
