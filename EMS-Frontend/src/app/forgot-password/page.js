'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '../../services/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: Reset
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email: email.trim().toLowerCase() });
      setMessage('OTP has been sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email: email.trim().toLowerCase(), otp, password });
      setMessage('Password reset successful! Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please check your OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">E</div>
          <div>
            <h1>EMS ERP</h1>
            <span>Tsrijanali IT Services</span>
          </div>
        </div>

        <h2>Reset Password</h2>
        <p>{step === 1 ? 'Enter your email to receive an OTP' : 'Enter the OTP and your new password'}</p>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 13 }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#6ee7b7', fontSize: 13 }}>
            {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOTP}>
            <div className="auth-form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="auth-form-group">
              <label>OTP Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            <div className="auth-form-group">
              <label>New Password</label>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="auth-form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              onClick={() => setStep(1)}
            >
              Back
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          Remembered your password?{' '}
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
