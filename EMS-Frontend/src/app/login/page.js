'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPending, setShowPending] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      router.replace('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials. Please try again.';
      if (msg.toLowerCase().includes('pending') || msg.toLowerCase().includes('approval')) {
        setShowPending(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ padding: '0', minHeight: '100vh', display: 'flex' }}>
      {/* Left side Banner - Professional & Premium */}
      <div className="login-banner" style={{ 
        flex: '1.2', 
        backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.8)), url("https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        color: 'white'
      }}>
        <div className="auth-logo" style={{ marginBottom: 'auto' }}>
          <div className="auth-logo-icon" style={{ backgroundColor: 'white', color: 'var(--primary-dark)' }}>E</div>
          <div>
            <h1 style={{ color: 'white', fontSize: '24px' }}>EMS ERP</h1>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Empowering Business Efficiency</span>
          </div>
        </div>
        
        <div style={{ maxWidth: '500px' }}>
          <h2 style={{ fontSize: '48px', fontWeight: '800', lineHeight: '1.1', marginBottom: '24px' }}>
            Welcome back to your workspace.
          </h2>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6', marginBottom: '32px' }}>
            Manage your workforce, track attendance, and handle payroll with our unified ERP platform designed for modern enterprises.
          </p>
          
          <div style={{ display: 'flex', gap: '40px', marginTop: '20px' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-light)' }}>99.9%</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>System Uptime</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-light)' }}>256-bit</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>AES Encryption</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-light)' }}>24/7</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Support Available</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
          Trusted by over 500+ growing companies worldwide.
        </div>
      </div>

      {/* Right side Form */}
      <div className="login-form-container" style={{ 
        flex: '0.8',
        backgroundColor: '#0f172a',
        padding: '40px 80px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '700', color: 'white' }}>Sign In</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '8px', fontSize: '15px' }}>Access your enterprise dashboard</p>
        </div>

        {error && (
          <div style={{ 
            marginBottom: 24, padding: '14px 18px', background: 'rgba(239,68,68,0.1)', 
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#fca5a5', fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="auth-form-group">
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
            <input
              type="email"
              placeholder="admin@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              style={{ padding: '14px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}
            />
          </div>

          <div className="auth-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 0 }}>Password</label>
              <Link href="/forgot-password" style={{ fontSize: '13px', color: 'var(--primary-light)', fontWeight: '500' }}>
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
              style={{ padding: '14px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-auth" 
            disabled={loading}
            style={{ 
              padding: '16px', 
              borderRadius: '12px',
              marginTop: '10px',
              fontSize: '16px',
              fontWeight: '700',
              transition: 'all 0.3s ease',
              boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
            }}
          >
            {loading ? (
              <>
                <div className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></div>
                Signing in...
              </>
            ) : 'Sign In to Dashboard'}
          </button>
        </form>

        <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '15px', color: 'rgba(255,255,255,0.45)' }}>
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            style={{ color: 'var(--primary-light)', fontWeight: '600', textDecoration: 'none' }}
          >
            Register your company
          </Link>
        </div>
      </div>
      {/* Pending Approval Modal - Ultra Premium Centered */}
      {showPending && (
        <div className="modal-overlay" style={{ 
          position: 'fixed', inset: 0, zIndex: 9999, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(10px)',
          padding: '20px'
        }}>
          <div className="modal" style={{ 
            maxWidth: '450px', 
            textAlign: 'center', 
            padding: '40px', 
            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1)'
          }}>
            <div style={{ 
              width: '80px', height: '80px', background: 'rgba(245,158,11,0.1)', 
              color: '#f59e0b', borderRadius: '24px', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
              fontSize: '40px', border: '1.5px solid rgba(245,158,11,0.3)',
              boxShadow: '0 0 20px rgba(245,158,11,0.1) inset'
            }}>
              ✨
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'white', marginBottom: '16px', letterSpacing: '-0.02em' }}>
              Registration under Review
            </h3>
            <div style={{ 
              color: 'rgba(255,255,255,0.7)', 
              lineHeight: '1.7', 
              marginBottom: '32px', 
              fontSize: '15px' 
            }}>
              Your enterprise profile has been successfully submitted! <br/><br/>
              To ensure data security, our administrators verify every new workspace. Your account will be activated within <strong style={{ color: 'var(--primary-light)' }}>1 to 2 business days</strong>.
            </div>
            <button 
              className="btn-auth" 
              onClick={() => setShowPending(false)}
              style={{ 
                padding: '16px', 
                fontSize: '16px', 
                fontWeight: '700',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPageContainer() {
  return <LoginPage />;
}
