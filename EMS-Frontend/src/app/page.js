'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('ems_token');
    if (token) {
      router.replace('/dashboard');
    }

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [router]);

  const features = [
    { title: 'Attendance Tracking', desc: 'Real-time check-ins with geo-fencing and biometric integration.', icon: '🕒' },
    { title: 'Automated Payroll', desc: 'Single-click payslip generation with tax and leave calculations.', icon: '💰' },
    { title: 'Inventory Control', desc: 'Manage assets, stock levels, and procurement in one unified view.', icon: '📦' },
    { title: 'Employee Lifecycle', desc: 'From onboarding to exit management, handle everything digitally.', icon: '👥' },
    { title: 'ERP & CRM', desc: 'Master client relationships and internal resources seamlessly.', icon: '🚀' },
    { title: 'Business Reporting', desc: 'High-quality charts and insights for data-driven decisions.', icon: '📊' }
  ];

  return (
    <div style={{ backgroundColor: '#ffffff', color: '#0f172a', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Navbar */}
      <nav style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        padding: '20px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'all 0.3s ease',
        backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.05)' : 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', color: 'white' }}>E</div>
          <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em', color: '#0f172a' }}>EMS ERP</span>
        </div>
        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <Link href="/login" style={{ color: '#475569', fontWeight: '600', fontSize: '15px' }}>Sign In</Link>
          <Link href="/register" style={{ 
            backgroundColor: '#4f46e5', color: 'white', padding: '10px 24px', borderRadius: '100px',
            fontSize: '15px', fontWeight: '700', transition: 'all 0.3s ease', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.2)'
          }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ 
        padding: '160px 20px 100px', textAlign: 'center',
        background: 'radial-gradient(circle at 50% 10%, rgba(79, 70, 229, 0.08) 0%, transparent 50%)',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ 
            display: 'inline-block', padding: '6px 16px', background: 'rgba(79, 70, 229, 0.1)', 
            border: '1px solid rgba(79, 70, 229, 0.2)', borderRadius: '100px', 
            fontSize: '13px', fontWeight: '600', color: '#4f46e5', marginBottom: '24px'
          }}>
            New: Multi-Tenant Enterprise Support ✨
          </div>
          <h1 style={{ fontSize: '72px', fontWeight: '900', lineHeight: '1.05', letterSpacing: '-0.04em', marginBottom: '30px', color: '#1e293b' }}>
            Elevate Your Business with <br />
            <span style={{ background: 'linear-gradient(to right, #4f46e5, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Unified Intelligence.</span>
          </h1>
          <p style={{ fontSize: '20px', color: '#64748b', lineHeight: '1.6', maxWidth: '650px', margin: '0 auto 48px' }}>
            The all-in-one ERP platform designed to automate your workforce, payroll, and operations so you can focus on scaling.
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <Link href="/register" style={{ 
              padding: '18px 40px', background: '#4f46e5', color: 'white', borderRadius: '12px',
              fontSize: '18px', fontWeight: '700', boxShadow: '0 20px 25px -5px rgba(79, 70, 229, 0.25)'
            }}>Start Free Trial</Link>
            <Link href="/login" style={{ 
              padding: '18px 40px', background: '#f8fafc', color: '#0f172a', borderRadius: '12px',
              fontSize: '18px', fontWeight: '700', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}>Live Demo</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '40px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fcfcfc' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', alignItems: 'center', opacity: 0.5 }}>
          <span style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>Trusted by Industry Leaders:</span>
          <span style={{ fontWeight: '800', fontSize: '20px', color: '#334155' }}>TECHCORP</span>
          <span style={{ fontWeight: '800', fontSize: '20px', color: '#334155' }}>GLOBALFIN</span>
          <span style={{ fontWeight: '800', fontSize: '20px', color: '#334155' }}>NEXUS LABS</span>
          <span style={{ fontWeight: '800', fontSize: '20px', color: '#334155' }}>VORTEX INC</span>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '120px 60px', backgroundColor: '#f8fafc' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '20px', color: '#0f172a' }}>Everything you need.</h2>
            <p style={{ fontSize: '18px', color: '#64748b' }}>Powerful tools to manage every aspect of your enterprise.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }}>
            {features.map((f, i) => (
              <div key={i} style={{ 
                padding: '40px', borderRadius: '24px', backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0', transition: 'all 0.3s ease',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.02)'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '24px' }}>{f.icon}</div>
                <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '16px', color: '#1e293b' }}>{f.title}</h3>
                <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '15px' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '100px 60px', textAlign: 'center' }}>
        <div style={{ 
          maxWidth: '1000px', margin: '0 auto', padding: '80px', borderRadius: '40px',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white',
          boxShadow: '0 25px 50px -12px rgba(79, 70, 229, 0.3)'
        }}>
          <h2 style={{ fontSize: '42px', fontWeight: '800', marginBottom: '24px' }}>Ready to transform your workflow?</h2>
          <p style={{ fontSize: '18px', marginBottom: '40px', opacity: 0.9 }}>Join hundreds of companies that have already optimized their operations.</p>
          <Link href="/register" style={{ 
            padding: '16px 48px', background: 'white', color: '#4f46e5', borderRadius: '12px',
            fontSize: '18px', fontWeight: '800'
          }}>Create Your Account Now</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '80px 60px', borderTop: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#ffffff' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '32px', height: '32px', background: '#4f46e5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'white' }}>E</div>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>EMS ERP</span>
          </div>
          <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
            <Link href="#">Terms of Service</Link>
            <Link href="#">Privacy Policy</Link>
            <Link href="#">System Status</Link>
            <Link href="#">Support Center</Link>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '12px' }}>
          © 2026 EMS Enterprise Solutions. Designed for global teams.
        </p>
      </footer>

      {/* Mobile Styles */}
      <style jsx global>{`
        @media (max-width: 768px) {
          h1 { fontSize: 42px !important; }
          nav { padding: 15px 20px !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
          div[style*="gridTemplateColumns: repeat(3, 1fr)"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
