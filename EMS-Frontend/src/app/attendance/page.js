'use client';
import { useState, useEffect, useCallback } from 'react';
import { attendanceAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AttendancePage() {
  const { user, isAdmin } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState(null);
  const [myToday, setMyToday] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const today = new Date().toISOString().split('T')[0];

  const LocationDisplay = ({ loc, label, device }) => {
    const [name, setName] = useState(loc?.address || '');
    
    useEffect(() => {
      if (!name && loc?.latitude && loc?.longitude) {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${loc.latitude}&lon=${loc.longitude}`)
          .then(res => res.json())
          .then(data => {
            const addr = data.display_name.split(',')[0] + ', ' + (data.address.city || data.address.town || 'Unknown');
            setName(addr);
          })
          .catch(() => setName(`${loc.latitude.toFixed(3)}, ${loc.longitude.toFixed(3)}`));
      } else if (!loc?.latitude) {
        setName('No Loc');
      }
    }, [loc, name]);

    return (
      <div title={device || 'No device info'} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span>📍 {label}:</span>
        <span style={{ color: name === 'No Loc' ? 'var(--text-muted)' : 'inherit' }}>{name || 'Loading...'}</span>
      </div>
    );
  };

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceAPI.getAll({ page, limit: 15, startDate, endDate, status: statusFilter });
      setAttendance(res.data.attendance);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, startDate, endDate, statusFilter]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  useEffect(() => {
    attendanceAPI.getMyToday().then(res => setMyToday(res.data.attendance)).catch(() => {});
    if (isAdmin()) {
      attendanceAPI.getToday().then(res => setTodayStats(res.data.stats)).catch(() => {});
    }
  }, [isAdmin]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      let location = null;
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        
        let address = 'Unknown Location';
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const geoData = await geoRes.json();
          address = geoData.display_name.split(',')[0] + ', ' + (geoData.address.city || geoData.address.town || geoData.address.suburb || '');
        } catch (e) { console.warn('Reverse geocoding failed', e); }

        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, address };
      } catch (e) { 
        console.warn('Geolocation failed', e);
        alert('Location access is required for attendance.');
      }

      const deviceInfo = `${window.navigator.platform} | ${window.navigator.vendor || 'Unknown Browser'}`;
      const res = await attendanceAPI.checkIn({ location, deviceInfo });
      setMyToday(res.data.attendance);
      showToast('Checked in successfully!');
      fetchAttendance();
    } catch (err) { showToast(err.response?.data?.message || 'Check-in failed', 'danger'); }
    finally { setCheckingIn(false); }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      let location = null;
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        
        let address = 'Unknown Location';
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const geoData = await geoRes.json();
          address = geoData.display_name.split(',')[0] + ', ' + (geoData.address.city || geoData.address.town || geoData.address.suburb || '');
        } catch (e) { console.warn('Reverse geocoding failed', e); }

        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, address };
      } catch (e) { 
        console.warn('Geolocation failed', e);
        alert('Location access is required for attendance.');
      }

      const deviceInfo = `${window.navigator.platform} | ${window.navigator.vendor || 'Unknown Browser'}`;
      const res = await attendanceAPI.checkOut({ location, deviceInfo });
      setMyToday(res.data.attendance);
      showToast('Checked out successfully!');
      fetchAttendance();
    } catch (err) { showToast(err.response?.data?.message || 'Check-out failed', 'danger'); }
    finally { setCheckingOut(false); }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${cleanPath}`.replace(/([^:]\/)\/+/g, "$1");
  };

  const statusColor = (s) => ({ present: 'success', absent: 'danger', late: 'warning', half_day: 'info', on_leave: 'primary', holiday: 'secondary', weekend: 'secondary' }[s] || 'secondary');

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Attendance</h1>
          <p>Track and manage employee attendance</p>
        </div>
      </div>

      {/* My Today's Attendance Card */}
      <div className="card" style={{ marginBottom: 20, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
            <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              <span>Check-in: <strong>{formatTime(myToday?.checkIn)}</strong></span>
              <span>Check-out: <strong>{formatTime(myToday?.checkOut)}</strong></span>
              <span>Hours: <strong>{myToday?.workingHours?.toFixed(1) || '0.0'}h</strong></span>
              {myToday?.status && <span className={`tag tag-${statusColor(myToday.status)}`}>{myToday.status}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {!myToday?.checkIn ? (
              <button className="btn btn-success" onClick={handleCheckIn} disabled={checkingIn}>
                {checkingIn ? <><div className="loading-spinner" style={{ borderTopColor: 'white' }}></div> Checking in...</> :
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>Check In</>}
              </button>
            ) : !myToday?.checkOut ? (
              <button className="btn btn-danger" onClick={handleCheckOut} disabled={checkingOut}>
                {checkingOut ? <><div className="loading-spinner" style={{ borderTopColor: 'white' }}></div> Checking out...</> :
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Check Out</>}
              </button>
            ) : (
              <span className="tag tag-success" style={{ padding: '8px 16px', fontSize: 13 }}>✓ Done for today</span>
            )}
          </div>
        </div>
      </div>



      {/* Filters */}
      <div className="filter-bar">
        <div style={{ flex: '1 1 120px' }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>From</label>
          <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 120px' }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>To</label>
          <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div style={{ flex: '1 1 140px', alignSelf: 'flex-end' }}>
          <select className="form-control" style={{ width: '100%' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {['present','absent','late','half_day','on_leave','holiday','weekend'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-end', flex: '1 1 160px' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setPage(1); fetchAttendance(); }}>Apply</button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter(''); setPage(1); }}>Reset</button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Details (In/Out)</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><div className="loading-overlay"><div className="loading-spinner"></div></div></td></tr>
              ) : attendance.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  <h3>No records found</h3><p>Try adjusting filters</p>
                </div></td></tr>
              ) : attendance.map(a => (
                <tr key={a._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, background: 'var(--primary-light)', color: 'var(--primary)', flexShrink: 0, border: '1px solid var(--border-color)' }}>
                         {getImageUrl(a.employee?.user?.avatar || a.employee?.profilePhoto) ? (
                          <img src={getImageUrl(a.employee?.user?.avatar || a.employee?.profilePhoto)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                        ) : (
                          <>{a.employee?.user?.firstName?.[0]}{a.employee?.user?.lastName?.[0]}</>
                        )}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column' }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{a.employee?.user?.firstName} {a.employee?.user?.lastName}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.employee?.employeeId}</span>
                      </div>
                    </div>
                  </td>
                  <td>{new Date(a.date).toLocaleDateString('en-IN')}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatTime(a.checkIn)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{formatTime(a.checkOut)}</td>
                  <td>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      <LocationDisplay loc={a.checkInLocation} label="In" device={a.checkInDevice} />
                      <LocationDisplay loc={a.checkOutLocation} label="Out" device={a.checkOutDevice} />
                    </div>
                  </td>
                  <td>{a.workingHours?.toFixed(1) || '-'}h</td>
                  <td><span className={`tag tag-${statusColor(a.status)}`}>{a.status?.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '0 16px' }}>
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>
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
    </div>
  );
}
