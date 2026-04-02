'use client';
import { useState, useEffect, useCallback } from 'react';
import { systemAPI } from '../../services/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const REPORT_TYPES = [
  { id:'employee', label:'Employee Report' },
  { id:'attendance', label:'Attendance Report' },
  { id:'salary', label:'Salary Report' },
  { id:'sales', label:'Sales Report' },
  { id:'expense', label:'Expense Report' },
  { id:'profit_loss', label:'Profit & Loss' },
  { id:'activity', label:'System Activity' },
];

const COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ReportsPage() {
  const [type, setType] = useState('employee');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await systemAPI.getReport(type, { year, month });
      setData(res.data.report);
    } catch {} finally { setLoading(false); }
  }, [type, year, month]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const fmt = (n) => `₹${(n||0).toLocaleString('en-IN')}`;

  const renderChart = () => {
    if (!data) return null;

    if (type === 'employee') {
      const statusData = Array.isArray(data.statusWise) ? data.statusWise.map(d => ({ name: d._id, value: d.count })) : [];
      const deptData = Array.isArray(data.departmentWise) ? data.departmentWise.map(d => ({ name: d._id, value: d.count })) : [];
      return (
        <div className="dashboard-grid">
          <div className="card">
            <div className="card-header"><span className="card-title">Employee Status</span></div>
            <div className="card-body">
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
                      {statusData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">By Department</span></div>
            <div className="card-body">
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} layout="vertical" margin={{ left:80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                    <Bar dataKey="value" name="Employees" fill="#6366f1" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'attendance') {
      const chartData = Array.isArray(data) ? data.map(d => ({ name: d._id?.toUpperCase().replace('_',' '), value: d.count })) : [];
      const total = chartData.reduce((s,d)=>s+d.value,0);
      
      return (
        <div className="dashboard-grid">
          <div className="card">
            <div className="card-header"><span className="card-title">Status Distribution</span></div>
            <div className="card-body">
              <div className="chart-container" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={chartData} 
                      cx="50%" cy="50%" 
                      innerRadius={60} 
                      outerRadius={100} 
                      paddingAngle={5} 
                      dataKey="value"
                    >
                      {chartData.map((d,i)=><Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                      formatter={(val) => [`${val} Employees`, 'Count']}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
                Total Records: <strong>{total}</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Engagement Overview</span></div>
            <div className="card-body">
              <div className="chart-container" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: 'var(--bg-hover)'}}
                      contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                    />
                    <Bar dataKey="value" name="Total" radius={[6, 6, 0, 0]}>
                      {chartData.map((d,i)=><Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'salary') {
      const s = Array.isArray(data) ? data[0] : null;
      if (!s) return <div className="empty-state"><h3>No salary data for selected period</h3></div>;
      return (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16 }}>
          {[
            { label:'Gross Salary', value:fmt(s.totalGross), color:'var(--success)' },
            { label:'Net Salary', value:fmt(s.totalNet), color:'var(--primary)' },
            { label:'Total Deductions', value:fmt(s.totalDeductions), color:'var(--danger)' },
            { label:'Total PF', value:fmt(s.totalPF), color:'var(--info)' },
            { label:'Total ESI', value:fmt(s.totalESI), color:'var(--warning)' },
            { label:'Employees Paid', value:s.count, color:'var(--text-primary)' },
          ].map(item => (
            <div key={item.label} className="card" style={{ padding:20, textAlign:'center' }}>
              <div style={{ fontSize:24, fontWeight:800, color:item.color }}>{item.value}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{item.label}</div>
            </div>
          ))}
        </div>
      );
    }

    if (type === 'sales' || type === 'expense') {
      const expenses = (Array.isArray(data)?data:[]).map(d=>({ name:d._id||'Other', total:d.total }));
      const totalSpending = expenses.reduce((s,d)=>s+d.total,0);
      const topCategory = expenses.length > 0 ? expenses.sort((a,b)=>b.total-a.total)[0] : null;

      return (
        <div>
          {type === 'expense' && (
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
              <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger)' }}>{fmt(totalSpending)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Total Spending</div>
              </div>
              <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', textTransform: 'capitalize' }}>{topCategory?.name || '-'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Highest Category</div>
              </div>
              <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{expenses.length}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Categories Active</div>
              </div>
            </div>
          )}

          <div className="dashboard-grid">
            <div className="card">
              <div className="card-header"><span className="card-title">{type === 'sales' ? 'Profitability Analysis' : 'Breakdown by Category'}</span></div>
              <div className="card-body">
                <div className="chart-container" style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={expenses} 
                        cx="50%" cy="50%" 
                        innerRadius={70} 
                        outerRadius={100} 
                        paddingAngle={4} 
                        dataKey="total"
                      >
                        {expenses.map((d,i)=><Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v=>fmt(v)} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                      <Legend verticalAlign="bottom" align="center" iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Expense Trend Analysis</span></div>
              <div className="card-body">
                <div className="chart-container" style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {type === 'sales' ? (
                      <LineChart data={expenses}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={v=>fmt(v)} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                        <Line type="monotone" dataKey="total" name="Sales" stroke="#10b981" strokeWidth={3} dot={{ fill:'#10b981' }} />
                      </LineChart>
                    ) : (
                      <BarChart data={expenses}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={v=>fmt(v)} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                        <Bar 
                          dataKey="total" 
                          name="Spending" 
                          radius={[6, 6, 0, 0]}
                        >
                           {expenses.map((d,i)=><Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.8} />)}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'profit_loss') {
      const rev = data?.revenue||[];
      const exp = data?.expenses||[];
      const sal = data?.salaries||[];
      const months = Array.from({length:12},(_,i)=>({
        month: MONTHS[i],
        revenue: rev.find(r=>r._id===i+1)?.revenue || 0,
        expense: exp.find(e=>e._id===i+1)?.expense || 0,
        salary: sal.find(s=>s._id===i+1)?.salary || 0,
      })).map(m=>({ ...m, profit: m.revenue - m.expense - m.salary }));

      const totalRevenue = months.reduce((s,m)=>s+m.revenue,0);
      const totalExpense = months.reduce((s,m)=>s+m.expense,0);
      const totalSalary = months.reduce((s,m)=>s+m.salary,0);
      const totalProfit = totalRevenue - totalExpense - totalSalary;

      return (
        <div>
          <div className="stats-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:20 }}>
            {[
              { label:'Total Revenue', value:fmt(totalRevenue), color:'var(--success)' },
              { label:'Total Expenses', value:fmt(totalExpense), color:'var(--danger)' },
              { label:'Total Salaries', value:fmt(totalSalary), color:'var(--warning)' },
              { label:'Net Profit', value:fmt(totalProfit), color: totalProfit>=0?'var(--primary)':'var(--danger)' },
            ].map(s=>(
              <div key={s.label} className="card" style={{ padding:20, textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Monthly Profit & Loss — {data.year}</span></div>
            <div className="card-body">
              <div className="chart-container" style={{ height:320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={months}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize:11, fill:'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={v=>`₹${v.toLocaleString('en-IN')}`} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4,4,0,0]} />
                    <Bar dataKey="profit" name="Profit" fill="#6366f1" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Reports</h1>
          <p>Analytics and business insights</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select className="form-control" value={month} onChange={e=>setMonth(Number(e.target.value))}>
            {MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
          </select>
          <select className="form-control" value={year} onChange={e=>setYear(Number(e.target.value))}>
            {[2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={fetchReport}>Refresh</button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom:24 }}>
        {REPORT_TYPES.map(r=>(
          <button key={r.id} className={`tab ${type===r.id?'active':''}`} onClick={()=>setType(r.id)}>
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" style={{ width:36, height:36 }}></div></div>
      ) : renderChart()}
    </div>
  );
}
