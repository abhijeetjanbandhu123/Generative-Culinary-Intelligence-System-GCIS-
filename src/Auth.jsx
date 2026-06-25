import React, { useState } from 'react';

// ─── Auth Page ────────────────────────────────────────────────────────────────
export default function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validate = () => {
    const errs = {};
    if (mode === 'signup' && !form.name.trim()) errs.name = 'Name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 6) errs.password = 'Must be at least 6 characters.';
    if (mode === 'signup' && form.password !== form.confirm) errs.confirm = 'Passwords do not match.';
    return errs;
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);

    // Simulate auth — replace with real API call
    await new Promise(r => setTimeout(r, 1400));

    if (mode === 'signup') {
      // Store minimal user info
      const user = { name: form.name, email: form.email, createdAt: new Date().toISOString() };
      localStorage.setItem('gcis_user', JSON.stringify(user));
      showToast(`Welcome aboard, ${form.name}! 🎉`);
      setTimeout(() => onAuthSuccess(user), 800);
    } else {
      const stored = localStorage.getItem('gcis_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user.email === form.email) {
          showToast(`Welcome back, ${user.name}! 👋`);
          setTimeout(() => onAuthSuccess(user), 800);
        } else {
          setErrors({ email: 'No account found with this email.' });
          setLoading(false);
          return;
        }
      } else {
        setErrors({ email: 'No account found. Please sign up first.' });
        setLoading(false);
        return;
      }
    }

    setLoading(false);
  };

  const switchMode = (m) => {
    setMode(m);
    setForm({ name: '', email: '', password: '', confirm: '' });
    setErrors({});
  };

  const passwordStrength = (pw) => {
    if (!pw) return null;
    if (pw.length < 6) return { label: 'Too short', color: '#ef4444', width: '20%' };
    if (pw.length < 8 || !/[A-Z]/.test(pw)) return { label: 'Weak', color: '#f97316', width: '40%' };
    if (!/[0-9]/.test(pw) || !/[^a-zA-Z0-9]/.test(pw)) return { label: 'Fair', color: '#eab308', width: '65%' };
    return { label: 'Strong', color: '#10b981', width: '100%' };
  };

  const strength = mode === 'signup' ? passwordStrength(form.password) : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      backgroundImage: `
        radial-gradient(at 10% 10%, rgba(16, 124, 91, 0.05) 0px, transparent 50%),
        radial-gradient(at 90% 20%, rgba(60, 80, 224, 0.04) 0px, transparent 50%),
        radial-gradient(at 50% 90%, rgba(109, 40, 217, 0.03) 0px, transparent 50%)
      `,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
      padding: '1.5rem',
      position: 'relative',
    }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? 'rgba(16,124,91,0.95)' : 'rgba(190,18,60,0.95)',
          color: '#fff', padding: '12px 24px', borderRadius: '12px',
          fontWeight: 600, fontSize: '0.9rem', zIndex: 999,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)', whiteSpace: 'nowrap',
          backdropFilter: 'blur(10px)',
          animation: 'slideDown 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '460px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '12px',
            background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(15,23,42,0.08)', borderRadius: '20px',
            padding: '12px 20px', boxShadow: '0 4px 20px rgba(15,23,42,0.05)'
          }}>
            <span style={{
              fontSize: '1.8rem',
              background: 'linear-gradient(135deg, #107C5B, #3C50E0)',
              padding: '8px', borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(16,124,91,0.2)'
            }}>🍳</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '1.4rem', fontWeight: 800,
                background: 'linear-gradient(135deg, #0F172A, #3C50E0)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.5px'
              }}>GCIS</div>
              <div style={{ fontSize: '0.62rem', color: '#475569', fontWeight: 400, lineHeight: 1.3 }}>
                Generative Culinary<br />Intelligence System
              </div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(15,23,42,0.08)',
          borderRadius: '20px',
          boxShadow: '0 10px 40px -10px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.03)',
          overflow: 'hidden',
        }}>

          {/* Tab switcher */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(15,23,42,0.06)',
            background: 'rgba(15,23,42,0.01)',
          }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => switchMode(m)} style={{
                flex: 1, padding: '1.1rem',
                background: 'transparent', border: 'none',
                fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 600,
                cursor: 'pointer', position: 'relative',
                color: mode === m ? '#107C5B' : '#475569',
                transition: 'color 0.2s',
              }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
                {mode === m && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: '15%', right: '15%',
                    height: '2px', background: 'linear-gradient(90deg, #107C5B, #3C50E0)',
                    borderRadius: '2px 2px 0 0',
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{
                fontSize: '1.45rem', fontWeight: 700,
                color: '#0F172A', letterSpacing: '-0.3px', marginBottom: '4px'
              }}>
                {mode === 'login' ? 'Welcome back' : 'Get started for free'}
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#475569' }}>
                {mode === 'login'
                  ? 'Sign in to access your pantry and recipes.'
                  : 'Create your account to start tracking your pantry.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Name (signup only) */}
              {mode === 'signup' && (
                <Field label="Full Name" error={errors.name}>
                  <input
                    name="name" type="text" placeholder="Arjun Sharma"
                    value={form.name} onChange={handleChange}
                    style={inputStyle(errors.name)}
                    autoComplete="name"
                  />
                </Field>
              )}

              {/* Email */}
              <Field label="Email Address" error={errors.email}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>✉️</span>
                  <input
                    name="email" type="email" placeholder="you@example.com"
                    value={form.email} onChange={handleChange}
                    style={{ ...inputStyle(errors.email), paddingLeft: '40px' }}
                    autoComplete="email"
                  />
                </div>
              </Field>

              {/* Password */}
              <Field label="Password" error={errors.password}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>🔒</span>
                  <input
                    name="password" type={showPass ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
                    value={form.password} onChange={handleChange}
                    style={{ ...inputStyle(errors.password), paddingLeft: '40px', paddingRight: '44px' }}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem',
                    color: '#475569', padding: '4px',
                  }}>
                    {showPass ? '🛡️' : '👁️'}
                  </button>
                </div>
                {/* Password strength bar */}
                {strength && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ height: '4px', borderRadius: '4px', background: 'rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: strength.width,
                        background: strength.color, borderRadius: '4px',
                        transition: 'width 0.4s ease, background 0.3s',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 600, marginTop: '3px', display: 'block' }}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </Field>

              {/* Confirm password (signup only) */}
              {mode === 'signup' && (
                <Field label="Confirm Password" error={errors.confirm}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>🔑</span>
                    <input
                      name="confirm" type={showPass ? 'text' : 'password'}
                      placeholder="Repeat your password"
                      value={form.confirm} onChange={handleChange}
                      style={{ ...inputStyle(errors.confirm), paddingLeft: '40px' }}
                      autoComplete="new-password"
                    />
                  </div>
                </Field>
              )}

              {/* Forgot password link */}
              {mode === 'login' && (
                <div style={{ textAlign: 'right', marginTop: '-4px' }}>
                  <button type="button" style={{
                    background: 'none', border: 'none', color: '#107C5B',
                    fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', padding: 0,
                    fontFamily: 'inherit',
                  }}>
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} style={{
                marginTop: '0.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px 24px', borderRadius: '12px',
                background: loading ? 'rgba(16,124,91,0.6)' : 'linear-gradient(135deg, #107C5B, #0D6349)',
                border: 'none', color: '#fff', fontFamily: 'inherit',
                fontWeight: 700, fontSize: '0.98rem', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(16,124,91,0.2)',
                letterSpacing: '0.1px',
              }}>
                {loading ? (
                  <>
                    <div style={{
                      width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                  </>
                ) : (
                  mode === 'login' ? '→ Sign In' : '✓ Create Account'
                )}
              </button>

              {/* Divider + Google placeholder */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0.25rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(15,23,42,0.07)' }} />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(15,23,42,0.07)' }} />
              </div>

              <button type="button" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                padding: '12px 20px', borderRadius: '12px',
                background: 'rgba(15,23,42,0.01)', border: '1px solid rgba(15,23,42,0.09)',
                fontFamily: 'inherit', fontWeight: 600, fontSize: '0.92rem',
                color: '#0F172A', cursor: 'pointer', transition: 'all 0.2s',
              }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(15,23,42,0.03)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(15,23,42,0.01)'}
              >
                <GoogleIcon />
                Continue with Google
              </button>

            </form>

            {/* Switch mode */}
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#475569', marginTop: '1.5rem' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} style={{
                background: 'none', border: 'none', color: '#107C5B', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0,
              }}>
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.5rem' }}>
          By continuing, you agree to our{' '}
          <span style={{ color: '#107C5B', cursor: 'pointer', fontWeight: 600 }}>Terms</span>
          {' '}and{' '}
          <span style={{ color: '#107C5B', cursor: 'pointer', fontWeight: 600 }}>Privacy Policy</span>.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        input::placeholder { color: #94a3b8; }
        input:focus { outline: none; }
      `}</style>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#374151' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: '0.77rem', color: '#ef4444', fontWeight: 500 }}>⚠ {error}</span>}
    </div>
  );
}

// ─── Shared input style ───────────────────────────────────────────────────────
function inputStyle(hasError) {
  return {
    width: '100%', padding: '12px 14px',
    borderRadius: '10px',
    background: hasError ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${hasError ? 'rgba(239,68,68,0.4)' : 'rgba(15,23,42,0.09)'}`,
    color: '#0F172A', fontFamily: 'inherit', fontSize: '0.93rem',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  };
}

// ─── Google SVG icon ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}