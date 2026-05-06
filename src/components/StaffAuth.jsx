import React, { useState } from 'react';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import healthServicesLogo from '../../hs-logo.png';

// ─── EMAIL VALIDATOR ─────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── FIREBASE ERROR HANDLER ─────────────────────────────────
function mapFirebaseError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-email':
    case 'auth/wrong-password':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Authentication failed. Please try again.';
  }
}

export default function StaffAuth({ onAuthSuccess, onBack }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '', email: '', password: '', confirm: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ─── HANDLERS ─────────────────────────────────────────────
  const handleLoginChange = e => {
    setLoginForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };
  const handleSignupChange = e => {
    setSignupForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  // ─── LOGIN ────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    const email = loginForm.email.trim().toLowerCase();
    const password = loginForm.password;

    if (!email) return setError('Please enter your email address.');
    if (!password) return setError('Please enter your password.');
    if (!isValidEmail(email)) return setError('Please enter a valid email address.');

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Pass email as identifier (or user.displayName if set)
      onAuthSuccess(email);
    } catch (err) {
      setError(mapFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  // ─── SIGNUP ───────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    const name = signupForm.name.trim();
    const email = signupForm.email.trim().toLowerCase();
    const password = signupForm.password;
    const confirm = signupForm.confirm;

    if (!name) return setError('Please enter your full name.');
    if (!email) return setError('Please enter your institutional email.');
    if (!password) return setError('Please create a password.');
    if (!isValidEmail(email)) return setError('Please enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // You can update the profile with the name later if needed:
      // await updateProfile(userCredential.user, { displayName: name });
      onAuthSuccess(email);  // or name
    } catch (err) {
      setError(mapFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <div className="auth-page">

      {/* LEFT PANEL – Branding */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <img
              src={healthServicesLogo}
              alt="PCU Health Services Logo"
              width={68} height={80}
              style={{ objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="auth-brand-name">University <span>Clinic</span></div>
          <div className="auth-brand-sub">PCU Health Services</div>
          <div className="auth-brand-divider" />
          <div className="auth-brand-desc">
            Welcome! This is the Staff-only Portal.<br />
            Log in or Sign up to manage patient queues,<br />
            consultations, and appointments.
          </div>
          <div className="auth-features">
            <div className="auth-feature-item">
              <span className="auth-feature-dot" />
              We serve with compassion and competence — wherever they're needed.
            </div>
            <div className="auth-feature-item">
              <span className="auth-feature-dot" />
              We provide care you trust and service you deserve.
            </div>
            <div className="auth-feature-item">
              <span className="auth-feature-dot" />
              Patient call, Faster Queue &amp; Better Care.
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL – Auth Form */}
      <div className="auth-right">
        <div className="auth-card">
          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
              type="button"
            >
              Log In
            </button>
            <button
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
              type="button"
            >
              Register
            </button>
          </div>

          {/* Login Form */}
          {isLogin && (
            <form className="auth-form" onSubmit={handleLogin} noValidate>
              <div className="auth-form-header">
                <h2 className="auth-form-title">Staff Login</h2>
                <p className="auth-form-subtitle">Log in to access the Clinic Dashboard</p>
              </div>
              <div className="auth-field">
                <label>PCU Institutional Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="admin@pcu.edu.ph"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  autoComplete="email"
                />
              </div>
              <div className="auth-field">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  autoComplete="current-password"
                />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button className="auth-submit-btn" type="submit" disabled={loading}>
                {loading ? 'Logging in…' : 'Log In to Clinic Dashboard'}
              </button>
              <p className="auth-switch-hint">
                Don't have an account?{' '}
                <button type="button" className="auth-text-btn" onClick={() => setIsLogin(false)}>
                  Create one here
                </button>
              </p>
            </form>
          )}

          {/* Signup Form */}
          {!isLogin && (
            <form className="auth-form" onSubmit={handleSignup} noValidate>
              <div className="auth-form-header">
                <h2 className="auth-form-title">Staff Registration</h2>
                <p className="auth-form-subtitle">Create a new Clinic Dashboard account</p>
              </div>
              <div className="auth-field">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Maria Cruz"
                  value={signupForm.name}
                  onChange={handleSignupChange}
                  autoComplete="name"
                />
              </div>
              <div className="auth-field">
                <label>Institutional Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="admin@pcu.edu.ph"
                  value={signupForm.email}
                  onChange={handleSignupChange}
                  autoComplete="email"
                />
              </div>
              <div className="auth-field">
                <label>
                  Password{' '}
                  <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    (min. 6 characters)
                  </span>
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Create a strong password"
                  value={signupForm.password}
                  onChange={handleSignupChange}
                  autoComplete="new-password"
                />
              </div>
              <div className="auth-field">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirm"
                  placeholder="Re-enter your password"
                  value={signupForm.confirm}
                  onChange={handleSignupChange}
                  autoComplete="new-password"
                />
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button className="auth-submit-btn" type="submit" disabled={loading}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
              <p className="auth-switch-hint">
                Already have an account?{' '}
                <button type="button" className="auth-text-btn" onClick={() => setIsLogin(true)}>
                  Log in here
                </button>
              </p>
            </form>
          )}

          <button className="auth-back-link" onClick={onBack} type="button">
            ← Back to Home page
          </button>
        </div>
      </div>
    </div>
  );
}
