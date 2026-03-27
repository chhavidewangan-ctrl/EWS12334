'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

const ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'hr', label: 'HR' },
  { value: 'manager', label: 'Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Super Admin' },
];

function PasswordStrength({ password }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              background: i <= score ? colors[score] : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: score > 0 ? colors[score] : 'rgba(255,255,255,0.3)' }}>
          {labels[score]}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {checks.map((c) => (
            <span
              key={c.label}
              title={c.label}
              style={{ fontSize: 10, color: c.ok ? '#10b981' : 'rgba(255,255,255,0.25)' }}
            >
              {c.ok ? '✓' : '○'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EyeIcon({ show }) {
  return show ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const validate = () => {
    if (!form.firstName.trim()) return 'First name is required.';
    if (!form.lastName.trim()) return 'Last name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await authAPI.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      });
      setSuccess('Account created successfully! Redirecting to login…');
      setTimeout(() => router.replace('/login'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 40, paddingBottom: 40 }}>
      {/* Decorative blobs */}
      <div style={{
        position: 'absolute', width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        bottom: -100, left: -100, pointerEvents: 'none',
      }} />

      <div className="auth-card" style={{ maxWidth: 520 }}>
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">E</div>
          <div>
            <h1>EMS ERP</h1>
            <span>Tsrijanali IT Services</span>
          </div>
        </div>

        <h2>Create Account</h2>
        <p>Fill in your details to get started</p>

        {/* Error alert */}
        {error && (
          <div style={{
            marginBottom: 16, padding: '10px 14px',
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, color: '#fca5a5', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <span style={{ flexShrink: 0 }}>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success alert */}
        {success && (
          <div style={{
            marginBottom: 16, padding: '10px 14px',
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 10, color: '#6ee7b7', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="auth-form-group" style={{ marginBottom: 0 }}>
              <label>First Name</label>
              <input
                id="reg-firstName"
                type="text"
                placeholder="John"
                value={form.firstName}
                onChange={set('firstName')}
                required
                autoComplete="given-name"
                autoFocus
              />
            </div>
            <div className="auth-form-group" style={{ marginBottom: 0 }}>
              <label>Last Name</label>
              <input
                id="reg-lastName"
                type="text"
                placeholder="Doe"
                value={form.lastName}
                onChange={set('lastName')}
                required
                autoComplete="family-name"
              />
            </div>
          </div>

          {/* Email */}
          <div className="auth-form-group">
            <label>Email Address</label>
            <input
              id="reg-email"
              type="email"
              placeholder="john.doe@tsrijanali.com"
              value={form.email}
              onChange={set('email')}
              required
              autoComplete="email"
            />
          </div>

          {/* Role */}
          <div className="auth-form-group">
            <label>Role</label>
            <select
              id="reg-role"
              value={form.role}
              onChange={set('role')}
              style={{
                width: '100%', padding: '12px 14px',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, color: 'white', fontSize: 14,
                transition: 'border-color 0.2s', cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
              }}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value} style={{ background: '#1e293b', color: 'white' }}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div className="auth-form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={set('password')}
                required
                autoComplete="new-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon show={showPassword} />
              </button>
            </div>
            <PasswordStrength password={form.password} />
          </div>

          {/* Confirm Password */}
          <div className="auth-form-group">
            <label>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                required
                autoComplete="new-password"
                style={{
                  paddingRight: 44,
                  borderColor: form.confirmPassword && form.confirmPassword !== form.password
                    ? 'rgba(239,68,68,0.6)'
                    : form.confirmPassword && form.confirmPassword === form.password
                    ? 'rgba(16,185,129,0.6)'
                    : undefined,
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
                }}
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                <EyeIcon show={showConfirm} />
              </button>
            </div>
            {form.confirmPassword && form.confirmPassword !== form.password && (
              <p style={{ fontSize: 11, color: '#fca5a5', marginTop: 4 }}>Passwords do not match</p>
            )}
            {form.confirmPassword && form.confirmPassword === form.password && (
              <p style={{ fontSize: 11, color: '#6ee7b7', marginTop: 4 }}>Passwords match ✓</p>
            )}
          </div>

          {/* Submit */}
          <button
            id="reg-submit"
            type="submit"
            className="btn-auth"
            disabled={loading || !!success}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <>
                <div className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: 16, height: 16 }} />
                Creating account…
              </>
            ) : 'Create Account'}
          </button>
        </form>

        {/* Footer link */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          Already have an account?{' '}
          <Link
            href="/login"
            style={{ color: 'rgba(129,140,248,0.9)', fontWeight: 600, textDecoration: 'none' }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <AuthProvider>
      <RegisterForm />
    </AuthProvider>
  );
}
