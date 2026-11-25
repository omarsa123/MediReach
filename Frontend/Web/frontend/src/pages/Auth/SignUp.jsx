import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, User, Mail, Phone, Lock, 
  Stethoscope, MapPin, Eye, EyeOff, FileUp 
} from 'lucide-react';
import medreachLogo from '../../assets/medreach.png';
import { signUpOrganization } from '../../services/authService';
import './Auth.css';

export default function SignUp() {
  const navigate = useNavigate();

  const [organizationName, setOrganizationName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [organizerType, setOrganizerType] = useState('Clinic');
  
  const [address, setAddress] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const searchTimeoutRef = useRef(null);

  const [specialization, setSpecialization] = useState('');
  const [offersAmbulanceService, setOffersAmbulanceService] = useState(false);
  const [offersHomeSampleCollection, setOffersHomeSampleCollection] = useState(false);
  const [offersHomeService, setOffersHomeService] = useState(false);
  const [licenseFile, setLicenseFile] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchAddressSuggestions = (query) => {
    setAddress(query); 
    if (query.trim().length < 2) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setIsSearchingAddress(false);
      return;
    }

    setShowSuggestions(true);
    setIsSearchingAddress(true);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchQuery = encodeURIComponent(query.trim() + ' مصر');
        const response = await fetch(`https://photon.komoot.io/api/?q=${searchQuery}&limit=5`);
        const data = await response.json();
        
        if (data && data.features && data.features.length > 0) {
          const suggestions = data.features.map(feature => {
            const props = feature.properties;
            const addressParts = [props.name, props.district, props.city || props.town, props.state].filter(Boolean);
            const uniqueParts = [...new Set(addressParts)];
            return {
              place_id: props.osm_id || Math.random(),
              display_name: uniqueParts.join('، ') + '، مصر'
            };
          });
          setAddressSuggestions(suggestions);
        } else {
          setAddressSuggestions([]);
        }
      } catch (error) {
        setAddressSuggestions([]);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 600); 
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username.trim())) {
      setAlert({ type: 'error', message: 'Username must be 3-20 characters (letters, numbers, underscores).' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setAlert({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(phone.trim())) {
      setAlert({ type: 'error', message: 'Please enter a valid Egyptian phone number (e.g., 01012345678).' });
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{6,}$/;
    if (!passwordRegex.test(password)) {
      setAlert({ type: 'error', message: 'Password must be at least 6 characters, include upper/lower case and special character.' });
      return;
    }

    if (!licenseFile) {
      setAlert({ type: 'error', message: 'Please upload the official license document.' });
      return;
    }

    setLoading(true);

    try {
      await signUpOrganization({
        name: organizationName.trim(),
        organizationName: organizationName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role: "organization",
        organizerType,
        address: address.trim(),
        description: '',
        licenseDocumentUrl: "pending_upload_url", // مؤقتاً لحين إضافة رفع الملفات
        specialization: organizerType === 'Clinic' ? specialization : null,
        offersAmbulanceService: organizerType === 'Hospital' ? offersAmbulanceService : false,
        offersHomeSampleCollection: organizerType === 'Lab' ? offersHomeSampleCollection : false,
        offersHomeService: organizerType === 'PhysiotherapyCenter' ? offersHomeService : false,
      });

      setAlert({ type: 'success', message: 'Organization registered successfully! Check your email for the OTP.' });
      setTimeout(() => navigate('/verify-otp', { state: { email: email.trim() } }), 2000);

    } catch (error) {
      let errorMessage = error.message || 'Failed to register. Please try again.';
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper signup-wrapper">
      <div className="auth-card signup-card">
        <div className="brand-panel">
          <div className="brand-overlay" />
          <div className="brand-content">
            <div className="logo-wrapper">
              <img src={medreachLogo} alt="MedReach Logo" className="brand-logo" />
            </div>
            <h1 className="brand-name">MedReach</h1>
          </div>
          <svg className="brand-wave" viewBox="0 0 500 120" preserveAspectRatio="none">
            <path d="M0,40 C150,120 350,0 500,80 L500,120 L0,120 Z" fill="rgba(19, 108, 114, 0.25)" />
            <path d="M0,70 C180,20 320,110 500,50 L500,120 L0,120 Z" fill="rgba(19, 108, 114, 0.4)" />
          </svg>
        </div>

        <div className="form-panel">
          <div className="form-header">
            <h2>Register Organization</h2>
            <p>Create your healthcare provider portal on MedReach</p>
          </div>

          {alert.message && <div className={`alert ${alert.type}`}>{alert.message}</div>}

          <form onSubmit={handleSignUpSubmit} autoComplete="off">
            <div className="form-grid">
              
              <div className="input-group">
                <span className="input-icon"><Building2 size={17} /></span>
                <input type="text" placeholder="Organization Name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required />
              </div>

              <div className="input-group">
  <span className="input-icon"><User size={17} /></span>
  <input 
    type="text" 
    placeholder="Username" 
    value={username} 
    onChange={(e) => setUsername(e.target.value)} 
    autoComplete="off"
    readOnly
    onFocus={(e) => e.target.removeAttribute('readonly')}
    required 
  />
</div>

              <div className="input-group">
                <span className="input-icon"><Mail size={17} /></span>
                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="input-group">
                <span className="input-icon"><Phone size={17} /></span>
                <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>

              <div className="input-group">
                <span className="input-icon"><Stethoscope size={17} /></span>
                <select value={organizerType} onChange={(e) => setOrganizerType(e.target.value)} required>
                  <option value="Clinic">Clinic</option>
                  <option value="Hospital">Hospital</option>
                  <option value="Lab">Lab</option>
                  <option value="PhysiotherapyCenter">Physiotherapy Center</option>
                </select>
              </div>

              <div className="input-group">
  <span className="input-icon"><Lock size={17} /></span>
  <input 
    type={showPassword ? 'text' : 'password'} 
    placeholder="Password" 
    value={password} 
    onChange={(e) => setPassword(e.target.value)} 
    autoComplete="new-password"
    readOnly
    onFocus={(e) => e.target.removeAttribute('readonly')}
    required 
  />
  <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
    {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
  </button>
</div>

              <div className="input-group full-width" style={{ position: 'relative' }}>
                <span className="input-icon"><MapPin size={17} /></span>
                <input
                  type="text"
                  placeholder="Full Address (e.g., Nasr City, Cairo)"
                  value={address}
                  onChange={(e) => fetchAddressSuggestions(e.target.value)}
                  onFocus={() => { if (address.length >= 2) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                  required
                />
                
                {showSuggestions && (address.length >= 2) && (
                  <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                    {isSearchingAddress ? (
                      <li style={{ padding: '12px 16px', color: '#64748b' }}>Searching...</li>
                    ) : addressSuggestions.length > 0 ? (
                      addressSuggestions.map(place => (
                        <li key={place.place_id} onMouseDown={() => { setAddress(place.display_name); setShowSuggestions(false); }} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                          {place.display_name}
                        </li>
                      ))
                    ) : (
                      <li style={{ padding: '12px 16px', color: '#ec727c' }}>No results found</li>
                    )}
                  </ul>
                )}
              </div>

              {organizerType === 'Clinic' && (
                <div className="input-group full-width">
                  <span className="input-icon"><Stethoscope size={17} /></span>
                  <input type="text" placeholder="Clinic Specialization" value={specialization} onChange={(e) => setSpecialization(e.target.value)} required />
                </div>
              )}

              {organizerType === 'Hospital' && (
                <div className="full-width"><label className="checkbox-row"><input type="checkbox" checked={offersAmbulanceService} onChange={(e) => setOffersAmbulanceService(e.target.checked)} /><span>Offers Ambulance Service</span></label></div>
              )}
              {organizerType === 'Lab' && (
                <div className="full-width"><label className="checkbox-row"><input type="checkbox" checked={offersHomeSampleCollection} onChange={(e) => setOffersHomeSampleCollection(e.target.checked)} /><span>Offers Home Sample Collection</span></label></div>
              )}
              {organizerType === 'PhysiotherapyCenter' && (
                <div className="full-width"><label className="checkbox-row"><input type="checkbox" checked={offersHomeService} onChange={(e) => setOffersHomeService(e.target.checked)} /><span>Offers Home Physiotherapy Service</span></label></div>
              )}

              <div className="full-width">
                <label className="file-upload-label">
                  <FileUp size={18} />
                  <span>{licenseFile ? licenseFile.name : 'Upload Official License Document (PDF/JPG/PNG)*'}</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setLicenseFile(e.target.files[0])} />
                </label>
              </div>
            </div>

            <button type="submit" className="primary-btn" disabled={loading} style={{marginTop: '20px'}}>
              <span>{loading ? 'Creating Account...' : 'Register Organization'}</span>
            </button>
          </form>

          <div className="register-footer">
            <p>Already have an account? <Link to="/login" className="register-link-btn">Log In</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}