'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Public registration for individual staff is disabled for security.
    // Only administrators can create new staff accounts from the dashboard.
    // New companies should use the /register-company route.
    router.replace('/register-company');
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="loading-spinner" style={{ width: 40, height: 40 }}></div>
    </div>
  );
}
