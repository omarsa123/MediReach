import { useEffect, useRef, useState } from 'react';
import { Building2, Stethoscope, Upload, CheckCircle2, X } from 'lucide-react';
import { registerAccountByAdmin } from '../../services/adminService';
import { useAddressSuggestions } from '../../hooks/useAddressSuggestions';
import { isValidEmail, isValidUsername } from '../../utils/validators';

const UNFINISHED_EMAILS_KEY = 'medreach_admin_unfinished_emails';

function loadUnfinishedEmails() {
  try {
    const parsed = JSON.parse(localStorage.getItem(UNFINISHED_EMAILS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistUnfinishedEmails(items) {
  try {
    localStorage.setItem(UNFINISHED_EMAILS_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

const INITIAL_FORM = {
  name: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  address: '',
  // Organization
  organizationName: '',
  organizerType: 'Clinic',
  description: '',
  licenseDocumentUrl: '',
  specialization: '',
  offersAmbulanceService: false,
  offersHomeSampleCollection: false,
  offersHomeService: false,
  // Provider
  providerType: 'Doctor',
  licenseNumber: '',
  qualification: '',
  experienceYears: '0',
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export default function RegisterAccount({ onChanged }) {
  const [role, setRole] = useState('organization');
  const [form, setForm] = useState(INITIAL_FORM);
  const [licenseFile, setLicenseFile] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [unfinishedEmails, setUnfinishedEmails] = useState(() => loadUnfinishedEmails());
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [approveImmediately, setApproveImmediately] = useState(true);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const latestDraftRef = useRef({ email: '', role: 'organization' });

  const { suggestions: addressSuggestions, isSearching: isSearchingAddress } =
    useAddressSuggestions(form.address, { enabled: showAddressSuggestions });

  const saveUnfinishedEmail = (emailValue, accountRole) => {
    const normalized = String(emailValue || '').trim().toLowerCase();
    if (!isValidEmail(normalized)) return;
    setUnfinishedEmails((prev) => {
      const filtered = prev.filter((item) => item.email.toLowerCase() !== normalized);
      const next = [{ email: String(emailValue).trim(), role: accountRole }, ...filtered].slice(0, 8);
      persistUnfinishedEmails(next);
      return next;
    });
  };

  const removeUnfinishedEmail = (emailValue) => {
    const normalized = String(emailValue || '').trim().toLowerCase();
    setUnfinishedEmails((prev) => {
      const next = prev.filter((item) => item.email.toLowerCase() !== normalized);
      persistUnfinishedEmails(next);
      return next;
    });
  };

  useEffect(() => {
    latestDraftRef.current = { email: form.email, role };
  }, [form.email, role]);

  useEffect(() => {
    return () => {
      const { email: pendingEmail, role: pendingRole } = latestDraftRef.current;
      const normalized = String(pendingEmail || '').trim().toLowerCase();
      if (!isValidEmail(normalized)) return;
      const current = loadUnfinishedEmails().filter(
        (item) => item.email.toLowerCase() !== normalized
      );
      persistUnfinishedEmails(
        [{ email: String(pendingEmail).trim(), role: pendingRole }, ...current].slice(0, 8)
      );
    };
  }, []);

  const filteredEmailSuggestions = unfinishedEmails.filter((item) => {
    const query = form.email.trim().toLowerCase();
    return !query || item.email.toLowerCase().includes(query);
  });

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    setAlert({ type: '', message: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    if (!form.name.trim()) {
      setAlert({ type: 'error', message: 'Full / contact name is required.' });
      return;
    }

    if (form.username.trim() && !isValidUsername(form.username)) {
      setAlert({
        type: 'error',
        message: 'Username must be 3-20 characters (letters, numbers, underscores).',
      });
      return;
    }

    if (!isValidEmail(form.email)) {
      setAlert({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    if (!form.phone.trim() || form.phone.trim().length < 8) {
      setAlert({ type: 'error', message: 'Please enter a valid phone number.' });
      return;
    }

    if (!form.password || form.password.length < 6) {
      setAlert({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    let payload = {
      role,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
      ...(form.username.trim() ? { username: form.username.trim() } : {}),
      ...(form.address.trim() ? { address: form.address.trim() } : {}),
    };

    if (role === 'organization') {
      if (!form.organizationName.trim()) {
        setAlert({ type: 'error', message: 'Organization name is required.' });
        return;
      }

      if (!licenseFile && !form.licenseDocumentUrl.trim()) {
        setAlert({
          type: 'error',
          message: 'Please upload a license document (PDF/JPG/PNG) or enter a license document URL.',
        });
        return;
      }

      let licenseDocumentBase64;
      if (licenseFile) {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowed.includes(licenseFile.type) || licenseFile.size > 8 * 1024 * 1024) {
          setAlert({
            type: 'error',
            message: 'License document must be PDF, JPG, or PNG and smaller than 8 MB.',
          });
          return;
        }
        licenseDocumentBase64 = await fileToDataUrl(licenseFile);
      }

      payload = {
        ...payload,
        organizationName: form.organizationName.trim(),
        organizerType: form.organizerType,
        description: form.description.trim() || undefined,
        ...(licenseDocumentBase64
          ? { licenseDocumentBase64 }
          : { licenseDocumentUrl: form.licenseDocumentUrl.trim() }),
        specialization: form.organizerType === 'Clinic' ? form.specialization.trim() || undefined : undefined,
        offersAmbulanceService:
          form.organizerType === 'Hospital' ? form.offersAmbulanceService : false,
        offersHomeSampleCollection:
          form.organizerType === 'Lab' ? form.offersHomeSampleCollection : false,
        offersHomeService:
          form.organizerType === 'PhysiotherapyCenter' ? form.offersHomeService : false,
      };
    } else {
      if (!form.licenseNumber.trim()) {
        setAlert({ type: 'error', message: 'Provider license number is required.' });
        return;
      }

      if (!profilePhoto) {
        setAlert({ type: 'error', message: 'A profile photo is required for provider accounts.' });
        return;
      }

      const allowedImg = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedImg.includes(profilePhoto.type) || profilePhoto.size > 5 * 1024 * 1024) {
        setAlert({
          type: 'error',
          message: 'Profile photo must be JPG, PNG, or WEBP and smaller than 5 MB.',
        });
        return;
      }

      const profileImageBase64 = await fileToDataUrl(profilePhoto);
      payload = {
        ...payload,
        providerType: form.providerType,
        specialization: form.specialization.trim() || 'Other',
        licenseNumber: form.licenseNumber.trim(),
        qualification: form.qualification.trim() || undefined,
        experienceYears: Number(form.experienceYears) || 0,
        profileImageBase64,
      };
    }

    setLoading(true);
    try {
      const result = await registerAccountByAdmin(payload, { approveImmediately });
      const label = role === 'organization' ? 'Organization' : 'Provider';

      if (result.autoApproved) {
        setAlert({
          type: 'success',
          message: `${label} registered and activated immediately (${result.email}).`,
        });
      } else if (result.approvalError) {
        setAlert({
          type: 'error',
          message: `${label} created, but auto-approval failed: ${result.approvalError}`,
        });
      } else {
        setAlert({
          type: 'success',
          message: `${label} registered as Pending (${result.email}). Ready for approval in requests.`,
        });
      }

      removeUnfinishedEmail(payload.email);
      latestDraftRef.current = { email: '', role };
      setForm(INITIAL_FORM);
      setLicenseFile(null);
      setProfilePhoto(null);
      setFileInputKey((k) => k + 1);
      onChanged?.();
    } catch (error) {
      saveUnfinishedEmail(payload.email, role);
      setAlert({ type: 'error', message: error.message || 'Registration failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="header-titles">
          <h1>Register Organization or Provider</h1>
          <p>Create a new healthcare organization or provider account directly from the admin portal.</p>
        </div>
      </div>

      <div className="chart-card admin-register-card">
        <div className="admin-role-tabs" role="tablist" aria-label="Account type">
          <button
            type="button"
            role="tab"
            aria-selected={role === 'organization'}
            className={`admin-role-tab ${role === 'organization' ? 'active' : ''}`}
            onClick={() => handleRoleChange('organization')}
          >
            <Building2 size={17} /> Organization
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === 'provider'}
            className={`admin-role-tab ${role === 'provider' ? 'active' : ''}`}
            onClick={() => handleRoleChange('provider')}
          >
            <Stethoscope size={17} /> Provider
          </button>
        </div>

        {alert.message && (
          <div className={`admin-alert ${alert.type === 'success' ? 'success' : 'error'}`}>
            {alert.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-register-form" autoComplete="off">
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>{role === 'organization' ? 'Contact / Manager Name *' : 'Full Name *'}</span>
              <input
                type="text"
                name="admin_reg_contact_name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder={role === 'organization' ? 'e.g., Dr. Ahmed Hassan' : 'e.g., Dr. Sara Ali'}
                autoComplete="off"
                required
              />
            </label>

            <label className="admin-field">
              <span>Username (optional)</span>
              <input
                type="text"
                name="admin_reg_username"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder="Auto-generated if left blank"
                autoComplete="off"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
              />
            </label>

            <label className="admin-field admin-address-field">
              <span>Email Address *</span>
              <input
                type="email"
                name="admin_reg_email"
                value={form.email}
                onChange={(e) => {
                  updateField('email', e.target.value);
                  if (unfinishedEmails.length > 0) setShowEmailSuggestions(true);
                }}
                placeholder="account@example.com"
                autoComplete="off"
                readOnly
                onFocus={(e) => {
                  e.target.removeAttribute('readonly');
                  if (unfinishedEmails.length > 0) setShowEmailSuggestions(true);
                }}
                onBlur={() => {
                  saveUnfinishedEmail(form.email, role);
                  setTimeout(() => setShowEmailSuggestions(false), 200);
                }}
                required
              />
              {showEmailSuggestions && filteredEmailSuggestions.length > 0 && (
                <ul className="admin-address-suggestions">
                  <li className="admin-email-suggest-header">
                    Unfinished registrations
                  </li>
                  {filteredEmailSuggestions.map((item) => (
                    <li
                      key={item.email}
                      className="admin-address-item admin-email-suggest-item"
                      onMouseDown={() => {
                        updateField('email', item.email);
                        if (item.role && item.role !== role) {
                          setRole(item.role);
                        }
                        setShowEmailSuggestions(false);
                      }}
                    >
                      <span>{item.email}</span>
                      <span className="admin-email-suggest-meta">
                        <span className="admin-email-role-tag">{item.role}</span>
                        <button
                          type="button"
                          className="admin-email-remove-btn"
                          aria-label={`Remove ${item.email}`}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            removeUnfinishedEmail(item.email);
                          }}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </label>

            <label className="admin-field">
              <span>Phone Number *</span>
              <input
                type="tel"
                name="admin_reg_phone"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="01012345678"
                autoComplete="off"
                required
              />
            </label>

            <label className="admin-field">
              <span>Password *</span>
              <input
                type="password"
                name="admin_reg_password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                required
              />
            </label>

            <label className="admin-field admin-address-field">
              <span>Address</span>
              <input
                type="text"
                value={form.address}
                onChange={(e) => {
                  const val = e.target.value;
                  updateField('address', val);
                  setShowAddressSuggestions(val.trim().length >= 2);
                }}
                onFocus={() => {
                  if (form.address.trim().length >= 2) setShowAddressSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 250)}
                placeholder="Full Address (e.g., Nasr City, Cairo)"
                autoComplete="off"
              />
              {showAddressSuggestions && form.address.trim().length >= 2 && (
                <ul className="admin-address-suggestions">
                  {isSearchingAddress ? (
                    <li className="admin-address-status">Searching...</li>
                  ) : addressSuggestions.length > 0 ? (
                    addressSuggestions.map((place) => (
                      <li
                        key={place.place_id}
                        className="admin-address-item"
                        onMouseDown={() => {
                          updateField('address', place.display_name);
                          setShowAddressSuggestions(false);
                        }}
                      >
                        {place.display_name}
                      </li>
                    ))
                  ) : (
                    <li className="admin-address-empty">No results found</li>
                  )}
                </ul>
              )}
            </label>

            {role === 'organization' ? (
              <>
                <label className="admin-field">
                  <span>Organization Name *</span>
                  <input
                    type="text"
                    value={form.organizationName}
                    onChange={(e) => updateField('organizationName', e.target.value)}
                    placeholder="e.g., Al-Noor Medical Center"
                    required
                  />
                </label>

                <label className="admin-field">
                  <span>Organization Type *</span>
                  <select
                    value={form.organizerType}
                    onChange={(e) => updateField('organizerType', e.target.value)}
                  >
                    <option value="Clinic">Clinic</option>
                    <option value="Hospital">Hospital</option>
                    <option value="Lab">Lab</option>
                    <option value="PhysiotherapyCenter">Physiotherapy Center</option>
                  </select>
                </label>

                {form.organizerType === 'Clinic' && (
                  <label className="admin-field admin-field-full">
                    <span>Clinic Specialization</span>
                    <input
                      type="text"
                      value={form.specialization}
                      onChange={(e) => updateField('specialization', e.target.value)}
                      placeholder="e.g., Cardiology, Dermatology"
                    />
                  </label>
                )}

                {form.organizerType === 'Hospital' && (
                  <label className="admin-checkbox admin-field-full">
                    <input
                      type="checkbox"
                      checked={form.offersAmbulanceService}
                      onChange={(e) => updateField('offersAmbulanceService', e.target.checked)}
                    />
                    <span>Offers Ambulance Service</span>
                  </label>
                )}

                {form.organizerType === 'Lab' && (
                  <label className="admin-checkbox admin-field-full">
                    <input
                      type="checkbox"
                      checked={form.offersHomeSampleCollection}
                      onChange={(e) => updateField('offersHomeSampleCollection', e.target.checked)}
                    />
                    <span>Offers Home Sample Collection</span>
                  </label>
                )}

                {form.organizerType === 'PhysiotherapyCenter' && (
                  <label className="admin-checkbox admin-field-full">
                    <input
                      type="checkbox"
                      checked={form.offersHomeService}
                      onChange={(e) => updateField('offersHomeService', e.target.checked)}
                    />
                    <span>Offers Home Physiotherapy Service</span>
                  </label>
                )}

                <label className="admin-field admin-field-full">
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Brief description of services and facilities"
                  />
                </label>

                <label className="admin-field">
                  <span>License Document (PDF/JPG/PNG, max 8 MB) *</span>
                  <span className="admin-file-input">
                    <Upload size={16} />
                    <span>{licenseFile ? licenseFile.name : 'Choose license file...'}</span>
                    <input
                      key={`license-${fileInputKey}`}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                    />
                  </span>
                </label>

                <label className="admin-field">
                  <span>Or License Document URL</span>
                  <input
                    type="url"
                    value={form.licenseDocumentUrl}
                    onChange={(e) => updateField('licenseDocumentUrl', e.target.value)}
                    placeholder="https://..."
                  />
                </label>
              </>
            ) : (
              <>
                <label className="admin-field">
                  <span>Provider Type *</span>
                  <select
                    value={form.providerType}
                    onChange={(e) => updateField('providerType', e.target.value)}
                  >
                    <option value="Doctor">Doctor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Physiotherapist">Physiotherapist</option>
                    <option value="LabSpecialist">Lab Specialist</option>
                  </select>
                </label>

                <label className="admin-field">
                  <span>Specialization</span>
                  <input
                    type="text"
                    value={form.specialization}
                    onChange={(e) => updateField('specialization', e.target.value)}
                    placeholder="e.g., Internal Medicine"
                  />
                </label>

                <label className="admin-field">
                  <span>License Number *</span>
                  <input
                    type="text"
                    value={form.licenseNumber}
                    onChange={(e) => updateField('licenseNumber', e.target.value)}
                    placeholder="e.g., LIC-2026-1042"
                    required
                  />
                </label>

                <label className="admin-field">
                  <span>Qualification</span>
                  <input
                    type="text"
                    value={form.qualification}
                    onChange={(e) => updateField('qualification', e.target.value)}
                    placeholder="e.g., MBBCh, MD"
                  />
                </label>

                <label className="admin-field">
                  <span>Years of Experience</span>
                  <input
                    type="number"
                    min="0"
                    max="70"
                    value={form.experienceYears}
                    onChange={(e) => updateField('experienceYears', e.target.value)}
                  />
                </label>

                <label className="admin-field">
                  <span>Profile Photo (JPG/PNG/WEBP, max 5 MB) *</span>
                  <span className="admin-file-input">
                    <Upload size={16} />
                    <span>{profilePhoto ? profilePhoto.name : 'Choose profile photo...'}</span>
                    <input
                      key={`photo-${fileInputKey}`}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
                    />
                  </span>
                </label>
              </>
            )}
          </div>

          <div className="admin-register-footer">
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={approveImmediately}
                onChange={(e) => setApproveImmediately(e.target.checked)}
              />
              <span>Approve &amp; activate account immediately (skip pending queue)</span>
            </label>

            <button type="submit" className="admin-submit-btn" disabled={loading}>
              <CheckCircle2 size={17} />
              <span>
                {loading
                  ? 'Registering...'
                  : role === 'organization'
                    ? 'Register Organization'
                    : 'Register Provider'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
