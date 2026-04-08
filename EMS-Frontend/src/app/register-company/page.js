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
    phone: '',
    companyName: '',
    companyWebsite: '',
    industry: '',
    gstNumber: '',
    panNumber: '',
    street: '',
    city: '',
    state: '',
    pincode: ''
  });

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.companyName || !form.phone) {
      setError('Please fill all required personal and company details.');
      return;
    }

    setLoading(true);

    try {
      // Prepare payload with nested address as expected by backend
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        companyName: form.companyName,
        companyWebsite: form.companyWebsite,
        industry: form.industry,
        gstNumber: form.gstNumber,
        panNumber: form.panNumber,
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          country: 'India' // Default
        }
      };

      const res = await authAPI.registerCompany(payload);
      setSuccess('Registration request submitted! Please wait for Superadmin approval before you can log in.');
      
      // Token will not be available until approved
      setForm({ // Reset form
        firstName: '', lastName: '', email: '', password: '', phone: '',
        companyName: '', companyWebsite: '', industry: '', gstNumber: '', panNumber: '',
        street: '', city: '', state: '', pincode: ''
      });

      setTimeout(() => {
        router.replace('/login');
      }, 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ alignItems: 'center', padding: '40px 20px' }}>
      <div className="auth-card" style={{ maxWidth: 600 }}> {/* Increased width for more fields */}
        <div className="auth-logo">
          <div className="auth-logo-icon">E</div>
          <div>
            <h1>EMS ERP</h1>
            <span>Tsrijanali IT Services</span>
          </div>
        </div>

        <h2>Register Your Company</h2>
        <p>Complete your organization profile to get started</p>

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
            <h3 style={{ fontSize: 14, color: 'var(--primary-light)', marginBottom: 15, fontWeight: 600 }}>Admin Details</h3>
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
              <div className="auth-form-group">
                <label>Email Address</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="admin@company.com" required />
              </div>
              <div className="auth-form-group">
                <label>Phone Number</label>
                <input type="text" value={form.phone} onChange={set('phone')} placeholder="+91 ..." required />
              </div>
            </div>

            <div className="auth-form-group">
              <label>Password</label>
              <input type="password" value={form.password} onChange={set('password')} placeholder="Minimum 6 characters" required />
            </div>

            <div style={{ height: 1.5, background: 'rgba(255,255,255,0.1)', margin: '20px 0' }}></div>

            <h3 style={{ fontSize: 14, color: 'var(--primary-light)', marginBottom: 15, fontWeight: 600 }}>Company Details</h3>
            <div className="auth-form-group">
              <label>Company Name</label>
              <input type="text" value={form.companyName} onChange={set('companyName')} placeholder="Acme Corp" required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="auth-form-group">
                <label>Company Website</label>
                <input type="url" value={form.companyWebsite} onChange={set('companyWebsite')} placeholder="https://..." />
              </div>
              <div className="auth-form-group">
                <label>Industry</label>
                <select 
                  value={form.industry} 
                  onChange={set('industry')} 
                  style={{ 
                    width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.07)', 
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'white', fontSize: 14 
                  }}
                >
                  <option value="" style={{ background: '#1e293b' }}>Select Industry</option>
                  <option value="IT" style={{ background: '#1e293b' }}>IT & Software</option>
                  <option value="Healthcare" style={{ background: '#1e293b' }}>Healthcare</option>
                  <option value="Finance" style={{ background: '#1e293b' }}>Finance</option>
                  <option value="Manufacturing" style={{ background: '#1e293b' }}>Manufacturing</option>
                  <option value="Education" style={{ background: '#1e293b' }}>Education</option>
                  <option value="Other" style={{ background: '#1e293b' }}>Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="auth-form-group">
                <label>GST Number (Optional)</label>
                <input type="text" value={form.gstNumber} onChange={set('gstNumber')} placeholder="GSTIN-00XXXX0000X0Z0" />
              </div>
              <div className="auth-form-group">
                <label>PAN Number (Optional)</label>
                <input type="text" value={form.panNumber} onChange={set('panNumber')} placeholder="ABCDE1234F" />
              </div>
            </div>

            <div className="auth-form-group">
              <label>Office Address</label>
              <input type="text" value={form.street} onChange={set('street')} placeholder="Street, Building, Area" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div className="auth-form-group">
                <label>City</label>
                <input type="text" value={form.city} onChange={set('city')} placeholder="City" />
              </div>
              <div className="auth-form-group">
                <label>State</label>
                <input type="text" value={form.state} onChange={set('state')} placeholder="State" />
              </div>
              <div className="auth-form-group">
                <label>PIN Code</label>
                <input type="text" value={form.pincode} onChange={set('pincode')} placeholder="000000" />
              </div>
            </div>

            <button type="submit" className="btn-auth" disabled={loading} style={{ marginTop: 20 }}>
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

