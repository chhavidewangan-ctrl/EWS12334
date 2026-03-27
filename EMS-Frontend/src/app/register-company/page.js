'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Education', 'Retail', 'Real Estate', 'Other'
];

function RegisterCompanyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    // Personal Admin Info
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    // Company Info
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyWebsite: '',
    industry: 'Technology',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'India',
      pincode: ''
    },
    gstNumber: '',
    panNumber: ''
  });

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setAddr = (field) => (e) => setForm({ 
    ...form, 
    address: { ...form.address, [field]: e.target.value } 
  });

  const nextStep = () => {
    if (step === 1) {
      if (!form.firstName || !form.lastName || !form.email || !form.password) {
        setError('Please fill all required personal details.');
        return;
      }
      if (form.password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }
    setError('');
    setStep(step + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authAPI.registerCompany(form);
      setSuccess('Organization registered successfully! Welcome aboard.');
      
      // Auto-login or redirect
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
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 60, paddingBottom: 60 }}>
      <div className="auth-card" style={{ maxWidth: 640 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">E</div>
          <div>
            <h1>EMS ERP</h1>
            <span>Tsrijanali IT Services</span>
          </div>
        </div>

        <h2>Register Your Company</h2>
        <p>Get your organization started with our ERP system</p>

        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, marginTop: 12 }}>
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              style={{ 
                flex: 1, height: 6, borderRadius: 3, 
                background: i <= step ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s'
              }} 
            />
          ))}
        </div>

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
          {step === 1 && (
            <div className="step-content animate-in">
              <h3 style={{ color: 'white', fontSize: 16, marginBottom: 16, borderLeft: '3px solid var(--primary)', paddingLeft: 12 }}>
                1. Administrator Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="auth-form-group">
                  <label>First Name *</label>
                  <input type="text" value={form.firstName} onChange={set('firstName')} placeholder="John" required />
                </div>
                <div className="auth-form-group">
                  <label>Last Name *</label>
                  <input type="text" value={form.lastName} onChange={set('lastName')} placeholder="Doe" required />
                </div>
              </div>
              <div className="auth-form-group">
                <label>Admin Email Address *</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="admin@company.com" required />
              </div>
              <div className="auth-form-group">
                <label>Password *</label>
                <input type="password" value={form.password} onChange={set('password')} placeholder="Create a strong password" required />
              </div>
              <div className="auth-form-group">
                <label>Phone Number</label>
                <input type="text" value={form.phone} onChange={set('phone')} placeholder="+91 1234567890" />
              </div>
              
              <button type="button" onClick={nextStep} className="btn-auth" style={{ marginTop: 12 }}>
                Continue to Company Details
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="step-content animate-in">
              <h3 style={{ color: 'white', fontSize: 16, marginBottom: 16, borderLeft: '3px solid var(--primary)', paddingLeft: 12 }}>
                2. Company Details
              </h3>
              <div className="auth-form-group">
                <label>Company Name *</label>
                <input type="text" value={form.companyName} onChange={set('companyName')} placeholder="Acme Corp" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="auth-form-group">
                  <label>Company Email</label>
                  <input type="email" value={form.companyEmail} onChange={set('companyEmail')} placeholder="hello@acme.com" />
                </div>
                <div className="auth-form-group">
                  <label>Company Phone</label>
                  <input type="text" value={form.companyPhone} onChange={set('companyPhone')} placeholder="022-1234567" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="auth-form-group">
                  <label>Industry</label>
                  <select 
                    value={form.industry} 
                    onChange={set('industry')}
                    style={{ 
                      width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.07)', 
                      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'white' 
                    }}
                  >
                    {INDUSTRIES.map(i => <option key={i} value={i} style={{ background: '#1e293b' }}>{i}</option>)}
                  </select>
                </div>
                <div className="auth-form-group">
                  <label>Website</label>
                  <input type="url" value={form.companyWebsite} onChange={set('companyWebsite')} placeholder="https://acme.com" />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="button" onClick={prevStep} className="btn-auth" style={{ background: 'rgba(255,255,255,0.1)', flex: 1 }}>
                  Back
                </button>
                <button type="button" onClick={nextStep} className="btn-auth" style={{ flex: 2 }}>
                  Next: Address & Legal
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-content animate-in">
              <h3 style={{ color: 'white', fontSize: 16, marginBottom: 16, borderLeft: '3px solid var(--primary)', paddingLeft: 12 }}>
                3. Address & Legal
              </h3>
              <div className="auth-form-group">
                <label>Street Address</label>
                <input type="text" value={form.address.street} onChange={setAddr('street')} placeholder="123 Business Park" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="auth-form-group">
                  <label>City</label>
                  <input type="text" value={form.address.city} onChange={setAddr('city')} placeholder="Mumbai" />
                </div>
                <div className="auth-form-group">
                  <label>State</label>
                  <input type="text" value={form.address.state} onChange={setAddr('state')} placeholder="Maharashtra" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="auth-form-group">
                  <label>Pincode</label>
                  <input type="text" value={form.address.pincode} onChange={setAddr('pincode')} placeholder="400001" />
                </div>
                <div className="auth-form-group">
                  <label>Country</label>
                  <input type="text" value={form.address.country} onChange={setAddr('country')} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="auth-form-group">
                  <label>GST Number</label>
                  <input type="text" value={form.gstNumber} onChange={set('gstNumber')} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div className="auth-form-group">
                  <label>PAN Number</label>
                  <input type="text" value={form.panNumber} onChange={set('panNumber')} placeholder="ABCDE1234F" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="button" onClick={prevStep} className="btn-auth" style={{ background: 'rgba(255,255,255,0.1)', flex: 1 }}>
                  Back
                </button>
                <button type="submit" className="btn-auth" disabled={loading} style={{ flex: 2 }}>
                  {loading ? 'Registering...' : 'Register Organization'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          By registering, you agree to our Terms of Service.
          <br /><br />
          Already have an account? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Sign In</Link>
        </div>
      </div>

      <style jsx>{`
        .animate-in {
          animation: slideIn 0.4s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
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
