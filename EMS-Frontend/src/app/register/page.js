'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '../../services/api';

const cityMapping = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Kakinada", "Rajahmundry", "Tirupati", "Anantapur", "Kadapa", "Eluru", "Ongole", "Nandyal", "Machilipatnam", "Adoni"],
  "Arunachal Pradesh": ["Itanagar", "Tawang", "Ziro", "Pasighat", "Roing", "Tezu", "Naharlagun", "Bomdila"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon", "Tinsukia", "Bongaigaon", "Tezpur", "Karimganj", "Diphu", "Dhubri", "North Lakhimpur"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Arrah", "Begusarai", "Katihar", "Munger", "Chhapra", "Saharsa", "Sasaram", "Hajipur"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon", "Jagdalpur", "Ambikapur", "Dhamtari", "Raigarh"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Bicholim"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Nadiad", "Morbi", "Surendranagar", "Bharuch", "Vapi", "Navsari", "Mehsana", "Veraval"],
  "Haryana": ["Faridabad", "Gurgaon", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula", "Sirsa", "Bhiwani", "Bahadurgarh"],
  "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala", "Solan", "Mandi", "Baddi", "Nahan", "Hamirpur", "Paonta Sahib", "Kullu"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City", "Deoghar", "Phusro", "Hazaribagh", "Giridih", "Ramgarh", "Medininagar", "Sahibganj"],
  "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum", "Davanagere", "Bellary", "Gulbarga", "Shimoga", "Tumkur", "Bijapur", "Raichur", "Bidar", "Hospet", "Hassan", "Gadag", "Udupi"],
  "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode", "Kollam", "Thrissur", "Alappuzha", "Palakkad", "Kottayam", "Malappuram", "Kannur", "Manjeri", "Thalassery"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa", "Murwara (Katni)", "Singrauli", "Burhanpur", "Khandwa", "Bhind", "Guna", "Shivpuri"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Pimpri-Chinchwad", "Kalyan-Dombivli", "Vasai-Virar", "Aurangabad", "Navi Mumbai", "Solapur", "Mira-Bhayandar", "Bhiwandi", "Amravati", "Nanded", "Kolhapur", "Akola", "Ulhasnagar", "Sangli-Miraj-Kupwad", "Malegaon", "Jalgaon", "Latur", "Dhule", "Ahmednagar", "Chandrapur", "Parbhani", "Ichalkaranji", "Jalna", "Ambarnath", "Panvel"],
  "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur"],
  "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongpoh"],
  "Mizoram": ["Aizawl", "Lunglei", "Saiha", "Champhai"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur", "Berhampur", "Puri", "Balasore", "Bhadrak", "Baripada", "Jharsuguda"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Hoshiarpur", "Mohali", "Batala", "Pathankot", "Moga", "Abohar", "Malerkotla", "Khanna", "Phagwara"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Bhilwara", "Alwar", "Bharatpur", "Sikar", "Pali", "Sri Ganganagar", "Beawar", "Tonk", "Hanumangarh", "Kishangarh"],
  "Sikkim": ["Gangtok", "Namchi", "Gyalshing", "Mangan"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Nagercoil", "Thanjavur", "Dindigul", "Vellore", "Kanchipuram", "Cuddalore", "Tiruvannamalai", "Kumbakonam"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Ramagundam", "Khammam", "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet"],
  "Tripura": ["Agartala", "Udaipur", "Dharmanagar", "Kailasahar", "Ambassa"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Meerut", "Varanasi", "Prayagraj", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Noida", "Firozabad", "Jhansi", "Muzaffarnagar", "Mathura", "Ayodhya", "Rampur", "Shahjahanpur", "Farrukhabad", "Hapur", "Etawah", "Mirzapur"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh", "Pithoragarh"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol", "Maheshtala", "Rajpur Sonarpur", "Gopalpur", "Bally", "Panihati", "Kamarhati", "Bardhaman", "Kulti", "Baharampur", "Malda", "Habra", "Kharagpur", "Shantipur", "Dankuni", "Basirhat", "Haldia"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Silvassa", "Diu"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "West Delhi", "East Delhi"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Udhampur", "Kathua", "Sopore"],
  "Ladakh": ["Leh", "Kargil"],
  "Lakshadweep": ["Kavaratti", "Agatti", "Minicoy"],
  "Puducherry": ["Puducherry", "Karaikal", "Ozhukarai", "Mahe", "Yanam"]
};

function RegisterForm() {
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
    
    // Core Required Fields
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.companyName || !form.phone) {
      setError('Please fill in all required fields.');
      return;
    }

    // Email Format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid corporate email address.');
      return;
    }

    // Phone Format (India 10 digits)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.phone)) {
      setError('Please enter a valid 10-digit Indian phone number (starting with 6-9).');
      return;
    }

    // Password Strength
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // PIN Code (India 6 digits)
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      setError('Please enter a valid 6-digit PIN code.');
      return;
    }

    // GSTIN (Optional 15 chars)
    if (form.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstNumber)) {
      setError('Please enter a valid 15-character GSTIN format.');
      return;
    }

    // PAN (Optional 10 chars)
    if (form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNumber)) {
      setError('Please enter a valid 10-character PAN format.');
      return;
    }

    setLoading(true);

    try {
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
          country: 'India'
        }
      };

      await authAPI.registerCompany(payload);
      setSuccess('Request submitted! Wait for approval.');
      setForm({
        firstName: '', lastName: '', email: '', password: '', phone: '',
        companyName: '', companyWebsite: '', industry: '', gstNumber: '', panNumber: '',
        street: '', city: '', state: '', pincode: ''
      });
      setTimeout(() => router.replace('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ padding: '0', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      {/* Left side Banner - High Impact, Zero Scroll */}
      <div className="register-banner" style={{ 
        flex: '1', 
        backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.75)), url("https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px',
        color: 'white',
        height: '100%'
      }}>
        <div className="auth-logo" style={{ marginBottom: '40px' }}>
          <div className="auth-logo-icon" style={{ width: '40px', height: '40px', fontSize: '18px' }}>E</div>
          <div>
            <h1 style={{ fontSize: '20px' }}>EMS ERP</h1>
            <span style={{ fontSize: '11px' }}>Enterprise Management</span>
          </div>
        </div>
        
        <div style={{ maxWidth: '400px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.2', marginBottom: '20px' }}>
            Unified Platform for Modern Business.
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', marginBottom: '24px' }}>
            Manage everything from payroll to attendance in one place. Secure, scalable, and intuitive.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-light)' }}></div>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>Multi-Tenant Data Encryption</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-light)' }}></div>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>Real-time Audit Logs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side Form - Optimized to fit 100vh */}
      <div className="register-form-container" style={{ 
        width: '750px', 
        backgroundColor: '#0f172a',
        padding: '30px 50px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'hidden' // Enforce no scroll
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'white' }}>Create Workspace</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Configure your administrator account and company profile</p>
        </div>

        {error && <div style={{ marginBottom: 15, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#fca5a5', fontSize: '12px' }}>{error}</div>}
        {success && <div style={{ marginBottom: 15, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, color: '#6ee7b7', fontSize: '12px' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {/* Admin Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary-light)', fontWeight: '700' }}>Admin Account</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="auth-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', marginBottom: '4px' }}>First Name</label>
                  <input type="text" value={form.firstName} onChange={set('firstName')} placeholder="John" required style={{ padding: '10px', fontSize: '13px' }} />
                </div>
                <div className="auth-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', marginBottom: '4px' }}>Last Name</label>
                  <input type="text" value={form.lastName} onChange={set('lastName')} placeholder="Doe" required style={{ padding: '10px', fontSize: '13px' }} />
                </div>
              </div>
              <div className="auth-form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '11px', marginBottom: '4px' }}>Email Address</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="admin@domain.com" required style={{ padding: '10px', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="auth-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', marginBottom: '4px' }}>Password</label>
                  <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required style={{ padding: '10px', fontSize: '13px' }} />
                </div>
                <div className="auth-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', marginBottom: '4px' }}>Phone</label>
                  <input type="text" value={form.phone} onChange={set('phone')} placeholder="+91 ..." required style={{ padding: '10px', fontSize: '13px' }} />
                </div>
              </div>
            </div>

            {/* Company Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary-light)', fontWeight: '700' }}>Organization</h3>
              <div className="auth-form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '11px', marginBottom: '4px' }}>Company Name</label>
                <input type="text" value={form.companyName} onChange={set('companyName')} placeholder="Acme Corp" required style={{ padding: '10px', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="auth-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', marginBottom: '4px' }}>Website (Optional)</label>
                  <input type="url" value={form.companyWebsite} onChange={set('companyWebsite')} placeholder="https://... (Optional)" style={{ padding: '10px', fontSize: '13px' }} />
                </div>
                <div className="auth-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', marginBottom: '4px' }}>Industry</label>
                  <select 
                    value={form.industry} 
                    onChange={set('industry')} 
                    style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'white', fontSize: '13px' }}
                  >
                    <option value="" style={{ background: '#1e293b' }}>Select</option>
                    <option value="IT" style={{ background: '#1e293b' }}>IT & Software</option>
                    <option value="Finance" style={{ background: '#1e293b' }}>Finance</option>
                    <option value="Healthcare" style={{ background: '#1e293b' }}>Healthcare</option>
                    <option value="Other" style={{ background: '#1e293b' }}>Other</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="auth-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', marginBottom: '4px' }}>GSTIN (Optional)</label>
                  <input type="text" value={form.gstNumber} onChange={set('gstNumber')} placeholder="00XXXX0000X0Z0" style={{ padding: '10px', fontSize: '13px' }} />
                </div>
                <div className="auth-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', marginBottom: '4px' }}>PAN (Optional)</label>
                  <input type="text" value={form.panNumber} onChange={set('panNumber')} placeholder="ABCDE0000F" style={{ padding: '10px', fontSize: '13px' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary-light)', fontWeight: '700' }}>HQ Address</h3>
            <div className="auth-form-group" style={{ marginBottom: 0 }}>
              <input type="text" value={form.street} onChange={set('street')} placeholder="Street, Building, Area" style={{ padding: '10px', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <select 
                value={form.state} 
                onChange={set('state')} 
                style={{ 
                  padding: '10px', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', width: '100%' 
                }}
              >
                <option value="" style={{ backgroundColor: '#1e293b', color: 'rgba(255,255,255,0.5)' }}>State</option>
                <option value="Andhra Pradesh" style={{ background: '#1e293b' }}>Andhra Pradesh</option>
                <option value="Arunachal Pradesh" style={{ background: '#1e293b' }}>Arunachal Pradesh</option>
                <option value="Assam" style={{ background: '#1e293b' }}>Assam</option>
                <option value="Bihar" style={{ background: '#1e293b' }}>Bihar</option>
                <option value="Chhattisgarh" style={{ background: '#1e293b' }}>Chhattisgarh</option>
                <option value="Goa" style={{ background: '#1e293b' }}>Goa</option>
                <option value="Gujarat" style={{ background: '#1e293b' }}>Gujarat</option>
                <option value="Haryana" style={{ background: '#1e293b' }}>Haryana</option>
                <option value="Himachal Pradesh" style={{ background: '#1e293b' }}>Himachal Pradesh</option>
                <option value="Jharkhand" style={{ background: '#1e293b' }}>Jharkhand</option>
                <option value="Karnataka" style={{ background: '#1e293b' }}>Karnataka</option>
                <option value="Kerala" style={{ background: '#1e293b' }}>Kerala</option>
                <option value="Madhya Pradesh" style={{ background: '#1e293b' }}>Madhya Pradesh</option>
                <option value="Maharashtra" style={{ background: '#1e293b' }}>Maharashtra</option>
                <option value="Manipur" style={{ background: '#1e293b' }}>Manipur</option>
                <option value="Meghalaya" style={{ background: '#1e293b' }}>Meghalaya</option>
                <option value="Mizoram" style={{ background: '#1e293b' }}>Mizoram</option>
                <option value="Nagaland" style={{ background: '#1e293b' }}>Nagaland</option>
                <option value="Odisha" style={{ background: '#1e293b' }}>Odisha</option>
                <option value="Punjab" style={{ background: '#1e293b' }}>Punjab</option>
                <option value="Rajasthan" style={{ background: '#1e293b' }}>Rajasthan</option>
                <option value="Sikkim" style={{ background: '#1e293b' }}>Sikkim</option>
                <option value="Tamil Nadu" style={{ background: '#1e293b' }}>Tamil Nadu</option>
                <option value="Telangana" style={{ background: '#1e293b' }}>Telangana</option>
                <option value="Tripura" style={{ background: '#1e293b' }}>Tripura</option>
                <option value="Uttar Pradesh" style={{ background: '#1e293b' }}>Uttar Pradesh</option>
                <option value="Uttarakhand" style={{ background: '#1e293b' }}>Uttarakhand</option>
                <option value="West Bengal" style={{ background: '#1e293b' }}>West Bengal</option>
                <option value="Andaman and Nicobar Islands" style={{ background: '#1e293b' }}>Andaman and Nicobar</option>
                <option value="Chandigarh" style={{ background: '#1e293b' }}>Chandigarh</option>
                <option value="Dadra and Nagar Haveli and Daman and Diu" style={{ background: '#1e293b' }}>DNHDD</option>
                <option value="Delhi" style={{ background: '#1e293b' }}>Delhi</option>
                <option value="Jammu and Kashmir" style={{ background: '#1e293b' }}>Jammu & Kashmir</option>
                <option value="Ladakh" style={{ background: '#1e293b' }}>Ladakh</option>
                <option value="Lakshadweep" style={{ background: '#1e293b' }}>Lakshadweep</option>
                <option value="Puducherry" style={{ background: '#1e293b' }}>Puducherry</option>
              </select>
              <select 
                value={form.city} 
                onChange={set('city')} 
                style={{ 
                  padding: '10px', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', width: '100%' 
                }}
              >
                <option value="" style={{ backgroundColor: '#1e293b', color: 'rgba(255,255,255,0.5)' }}>City</option>
                {form.state && cityMapping[form.state] ? (
                  cityMapping[form.state].map(city => (
                    <option key={city} value={city} style={{ background: '#1e293b' }}>{city}</option>
                  ))
                ) : (
                  <option disabled style={{ background: '#1e293b' }}>Select State First</option>
                )}
              </select>
              <input type="text" value={form.pincode} onChange={set('pincode')} placeholder="PIN" style={{ padding: '10px', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button type="submit" className="btn-auth" disabled={loading} style={{ padding: '14px', borderRadius: '12px', fontSize: '15px' }}>
              {loading ? 'Processing...' : 'Complete Registration & Launch'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--primary-light)', fontWeight: '600' }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <RegisterForm />;
}
