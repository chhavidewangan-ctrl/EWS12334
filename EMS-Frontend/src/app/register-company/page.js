'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

function RegisterCompanyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: ''
  });

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.companyName) {
      setError('Please fill all required fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await authAPI.registerCompany(form);
      setSuccess('Organization registered successfully! Welcome aboard.');
      
      if (res.data.token) {
        localStorage.setItem('ems_token', res.data.token);
        localStorage.setItem('ems_user', JSON.stringify(res.data.user));
      }

      setTimeout(() => {
        router.replace('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ alignItems: 'center', padding: '40px 20px' }}>
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">E</div>
          <div>
            <h1>EMS ERP</h1>
            <span>Tsrijanali IT Services</span>
          </div>
        </div>

        <h2>Register Your Company</h2>
        <p>Quickly set up your organization with essential details</p>

        {error && (
          <div style={{ 
            marginBottom: 20, padding: 12, background: 'rgba(239,68,68,0.1)', 
            border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#fca5a5', fontSize: 13 
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            marginBottom: 20, padding: 12, background: 'rgba(16,185,129,0.1)', 
            border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#6ee7b7', fontSize: 13 
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="step-content">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="auth-form-group">
                <label>First Name</label>
                <input type="text" value={form.firstName} onChange={set('firstName')} placeholder="John" required />
              </div>
              <div className="auth-form-group">
                <label>Last Name</label>
                <input type="text" value={form.lastName} onChange={set('lastName')} placeholder="Doe" required />
              </div>
            </div>
            
            <div className="auth-form-group">
              <label>Admin Email Address</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="admin@company.com" required />
            </div>

            <div className="auth-form-group">
              <label>Password</label>
              <input type="password" value={form.password} onChange={set('password')} placeholder="Create a strong password" required />
            </div>

            <div className="auth-form-group">
              <label>Company Name</label>
              <input type="text" value={form.companyName} onChange={set('companyName')} placeholder="Acme Corp" required />
            </div>

            <button type="submit" className="btn-auth" disabled={loading} style={{ marginTop: 12 }}>
              {loading ? 'Processing...' : 'Register & Get Started'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterCompanyPage() {
  return (
    <AuthProvider>
      <RegisterCompanyForm />
    </AuthProvider>
  );
}

