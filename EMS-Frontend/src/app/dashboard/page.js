'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { systemAPI } from '../../services/api';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

function StatCard({ icon, label, value, change, changeType, iconBg, iconColor }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {change !== undefined && (
          <div className={`stat-change ${changeType}`}>
            {changeType === 'up' ? '↑' : '↓'} {change}
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeDashboard({ d }) {
  const formatTime = (date) => date ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
  
  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="avatar" style={{ width: 56, height: 56, background: 'var(--primary)', color: 'white', fontSize: 24, borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {d.employee?.user?.firstName?.[0]}{d.employee?.user?.lastName?.[0]}
            </div>
            <div>
              <h1 style={{ marginBottom: 4 }}>Hello, {d.employee?.user?.firstName}! 👋</h1>
              <p style={{ color: 'var(--text-muted)' }}>{d.employee?.designation} • {d.employee?.employeeId}</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/leaves" className="btn btn-primary btn-sm" style={{ padding: '8px 16px', height: 'fit-content' }}>
            Apply Leave
          </Link>
          <Link href="/attendance" className="btn btn-secondary btn-sm" style={{ padding: '8px 16px', height: 'fit-content' }}>
            Punch In/Out
          </Link>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 24 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: d.attendanceToday ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: d.attendanceToday ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Today's Status</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {d.attendanceToday ? d.attendanceToday.status.toUpperCase() : 'Not Checked In'}
              {d.attendanceToday && <span style={{ fontSize: 11, marginLeft: 6, fontWeight: 400, color: 'var(--text-muted)' }}>({formatTime(d.attendanceToday.checkIn)})</span>}
            </div>
          </div>
        </div>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Leave Balance</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{(d.leaveBalance?.casual || 0) + (d.leaveBalance?.sick || 0)} Days</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
              <div>{d.leaveBalance?.casual} Casual</div>
              <div>{d.leaveBalance?.sick} Sick</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>My Tasks</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{d.tasks?.length || 0} Pending</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pending Tasks</span>
            <Link href="/tasks" style={{ fontSize: 12, color: 'var(--primary)' }}>View all</Link>
          </div>
          <div className="card-body" style={{ padding: '12px 0' }}>
            {(d.tasks || []).length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 14 }}>No pending tasks! Enjoy your day. ✨</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Project</th>
                      <th>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.tasks.map(t => (
                      <tr key={t._id}>
                        <td style={{ fontWeight: 500 }}>{t.title}</td>
                        <td>{t.project?.name}</td>
                        <td>{new Date(t.deadline).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Leaves</span>
            <Link href="/leaves" style={{ fontSize: 12, color: 'var(--primary)' }}>History</Link>
          </div>
          <div className="card-body" style={{ padding: '12px 0' }}>
            {(d.leaves || []).length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 14 }}>No recent leave requests.</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Days</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.leaves.map(l => (
                      <tr key={l._id}>
                        <td style={{ textTransform: 'capitalize' }}>{l.leaveType}</td>
                        <td>{l.totalDays}</td>
                        <td>
                          <span className={`tag tag-${l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'}`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <span className="card-title">Company Announcements</span>
          <Link href="/announcements" style={{ fontSize: 12, color: 'var(--primary)' }}>View all</Link>
        </div>
        <div className="card-body">
          {(d.announcements || []).length === 0 ? (
            <p style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No recent announcements.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {d.announcements.map(a => (
                <div key={a._id} style={{ borderLeft: '3px solid var(--primary)', padding: '4px 12px', background: 'var(--bg-card)', borderRadius: '0 8px 8px 0' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(a.createdAt).toLocaleDateString('en-IN')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    systemAPI.getDashboard()
      .then(res => setData(res.data.dashboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" style={{ width: 36, height: 36, borderWidth: 3 }}></div>
      </div>
    );
  }

  const d = data || {};
  if (d.role === 'employee') {
    return <EmployeeDashboard d={d} />;
  }
  const revenueData = MONTHS.map((month, i) => ({
    month,
    revenue: d.charts?.monthlyRevenue?.find(r => r.month === i + 1)?.amount || 0,
    expense: d.charts?.monthlyExpenses?.find(r => r.month === i + 1)?.amount || 0,
  }));

  const attendanceTrend = (d.charts?.attendanceTrend || []).map(t => ({
    date: t.date?.slice(5),
    present: t.present,
  }));

  const deptData = (d.charts?.departmentDistribution || []).map(dept => ({
    name: dept.department || 'Unknown',
    value: dept.count,
  }));

  const formatCurrency = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Welcome back! Here's what's happening today.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/attendance" className="btn btn-secondary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            Attendance
          </Link>
          <Link href="/reports" className="btn btn-primary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Reports
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0"
          label="Total Employees" value={d.employees?.total || 0}
          change={d.employees?.new > 0 ? `${d.employees.new} new this month` : undefined} changeType="up"
          iconBg="rgba(99,102,241,0.1)" iconColor="#6366f1"
        />
        <StatCard
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          label="Present Today" value={d.attendance?.present || 0}
          change={d.attendance?.late > 0 ? `${d.attendance.late} late` : undefined} changeType="down"
          iconBg="rgba(16,185,129,0.1)" iconColor="#10b981"
        />
        <StatCard
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          label="Pending Leaves" value={d.leaves?.pending || 0}
          iconBg="rgba(245,158,11,0.1)" iconColor="#f59e0b"
        />
        <StatCard
          icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          label="Monthly Payroll" value={formatCurrency(d.payroll?.totalSalary)}
          iconBg="rgba(14,165,233,0.1)" iconColor="#0ea5e9"
        />
        <StatCard
          icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          label="Total Sales (YTD)" value={formatCurrency(d.financial?.totalSales)}
          iconBg="rgba(16,185,129,0.1)" iconColor="#10b981"
        />
        <StatCard
          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          label="Total Expenses (YTD)" value={formatCurrency(d.financial?.totalExpenses)}
          iconBg="rgba(239,68,68,0.1)" iconColor="#ef4444"
        />
        <StatCard
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          label="Net Profit (YTD)" value={formatCurrency(d.financial?.profit)}
          changeType={d.financial?.profit >= 0 ? 'up' : 'down'}
          iconBg="rgba(139,92,246,0.1)" iconColor="#8b5cf6"
        />
        <StatCard
          icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          label="Active Projects" value={d.projects?.active || 0}
          change={d.projects?.pendingTasks > 0 ? `${d.projects.pendingTasks} tasks pending` : undefined} changeType="down"
          iconBg="rgba(236,72,153,0.1)" iconColor="#ec4899"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="dashboard-grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Revenue vs Expenses</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>This Year</span>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, '']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" fill="url(#colorRevenue)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fill="url(#colorExpense)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Dept. Distribution</span>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deptData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Attendance Trend (Last 7 Days)</span>
          </div>
          <div className="card-body">
            <div className="chart-container" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="present" name="Present" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Quick Stats</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Absent Today', value: d.attendance?.absent || 0, color: 'var(--danger)' },
              { label: 'On Leave Today', value: d.attendance?.onLeave || 0, color: 'var(--warning)' },
              { label: 'Late Today', value: d.attendance?.late || 0, color: 'var(--info)' },
              { label: 'Pending Invoices', value: d.invoices?.pending || 0, color: 'var(--primary)' },
              { label: 'Overdue Invoices', value: d.invoices?.overdue || 0, color: 'var(--danger)' },
              { label: 'Completed Tasks', value: d.projects?.completedTasks || 0, color: 'var(--success)' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontWeight: 700, color: item.color, fontSize: 16 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Leave Requests</span>
            <Link href="/leaves" style={{ fontSize: 12, color: 'var(--primary)' }}>View all</Link>
          </div>
          <div className="card-body" style={{ padding: '12px 0 0' }}>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.recentActivities?.recentLeaves || []).length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No recent leaves</td></tr>
                  ) : (d.recentActivities?.recentLeaves || []).map(l => (
                    <tr key={l._id}>
                      <td>{l.employee?.user?.firstName} {l.employee?.user?.lastName}</td>
                      <td style={{ textTransform: 'capitalize' }}>{l.leaveType}</td>
                      <td>{l.totalDays}</td>
                      <td>
                        <span className={`tag tag-${l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Tasks</span>
            <Link href="/tasks" style={{ fontSize: 12, color: 'var(--primary)' }}>View all</Link>
          </div>
          <div className="card-body" style={{ padding: '12px 0 0' }}>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Assigned</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.recentActivities?.recentTasks || []).length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No tasks</td></tr>
                  ) : (d.recentActivities?.recentTasks || []).map(t => (
                    <tr key={t._id}>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                      <td>{t.assignedTo?.user?.firstName || 'Unassigned'}</td>
                      <td>
                        <span className={`tag tag-${t.status === 'completed' ? 'success' : t.status === 'in_progress' ? 'info' : 'secondary'}`}>
                          {t.status?.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
