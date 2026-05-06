import React, { useEffect, useState } from 'react';
import { AppProvider } from './context/AppContext';
import StudentView from './components/StudentView';
import AdminView from './components/AdminView';
import StaffAuth from './components/StaffAuth';
import StudentAuth from './components/StudentAuth';   // new
import { ChevronRightIcon } from './components/Icons';
import './App.css';
import healthServicesLogo from '../hs-logo.png';
import pcuMainImage from '../PCU-main.jpg';

const APP_SESSION_KEY = 'pila-free-session';

function readStoredSession() {
  if (typeof window === 'undefined') {
    return {
      role: null,
      staffAuthed: false,
      studentAuthed: false,
      studentEmail: '',
    };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(APP_SESSION_KEY) || '{}');

    return {
      role: parsed.role === 'student' || parsed.role === 'admin' ? parsed.role : null,
      staffAuthed: Boolean(parsed.staffAuthed),
      studentAuthed: Boolean(parsed.studentAuthed),
      studentEmail: typeof parsed.studentEmail === 'string' ? parsed.studentEmail : '',
    };
  } catch {
    return {
      role: null,
      staffAuthed: false,
      studentAuthed: false,
      studentEmail: '',
    };
  }
}

function AppLogo() {
  return (
    <img
      src={healthServicesLogo}
      alt="PCU Health Services Logo"
      className="app-logo-img"
    />
  );
}

export default function App() {
  const storedSession = readStoredSession();
  const [role, setRole] = useState(storedSession.role);
  const [staffAuthed, setStaffAuthed] = useState(storedSession.staffAuthed);
  const [studentAuthed, setStudentAuthed] = useState(storedSession.studentAuthed);
  const [studentEmail, setStudentEmail] = useState(storedSession.studentEmail);

  useEffect(() => {
    window.localStorage.setItem(APP_SESSION_KEY, JSON.stringify({
      role,
      staffAuthed,
      studentAuthed,
      studentEmail,
    }));
  }, [role, staffAuthed, studentAuthed, studentEmail]);

  // reset everything on logout / back to landing
  const handleReturnToLanding = () => {
    setRole(null);
    setStaffAuthed(false);
    setStudentAuthed(false);
    setStudentEmail('');
  };

  // ─── LANDING PAGE ─────────────────────────────────
  if (!role) {
    return (
      <AppProvider>
        <div className="landing">
          {/* LEFT PANEL – unchanged */}
          <div
            className="landing-left"
            style={{
              backgroundImage: `url(${pcuMainImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(10,22,40,0.88) 0%, rgba(10,22,40,0.70) 60%, rgba(10,22,40,0.55) 100%)', zIndex: 0 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(184,146,42,0.10) 0%, transparent 50%)', zIndex: 0 }} />
            <div className="landing-brand" style={{ position: 'relative', zIndex: 1 }}>
              <div className="brand-seal"><AppLogo /></div>
              <div className="brand-institution">PCU Health Services</div>
              <div className="brand-name">Pila<span>Free</span></div>
              <div className="brand-tagline">Clinic Visits Made Easy.</div>
              <div className="brand-divider" />
              <p className="brand-desc">
                Pila-Free keeps your clinic visits fast, organized,
                and stress-free through smart appointment booking
                and real-time queue tracking. <br/>
                Skip the long wait~ Instead of waiting outside the clinic,
                You can stay in your classroom and only go when it’s almost your turn.
              </p>
            </div>
          </div>

          {/* RIGHT PANEL – role selection */}
          <div className="landing-right">
            <div className="landing-right-inner">
              <div className="landing-heading">Clinic Access</div>
              <h2 className="landing-title">Welcome, Dolfriends and PCU Clinic Staff! </h2>
              <p className="landing-sub">
                Kindly select your role to access the appropriate system interface.
              </p>
              <div className="role-section-label">Continue as</div>
              <div className="role-cards">
                {/* Student card – now requires auth */}
                <button className="role-card" onClick={() => { setRole('student'); setStudentAuthed(false); }}>
                  <div className="role-card-content">
                    <div className="role-card-label">Student</div>
                    <div className="role-card-title">Student Portal</div>
                    <div className="role-card-desc">Book appointments and check your queue status</div>
                  </div>
                  <div className="role-card-arrow"><ChevronRightIcon size={18} /></div>
                </button>

                {/* Staff card */}
                <button className="role-card" onClick={() => { setRole('admin'); setStaffAuthed(false); }}>
                  <div className="role-card-content">
                    <div className="role-card-label">Clinic Staff</div>
                    <div className="role-card-title">Staff Dashboard</div>
                    <div className="role-card-desc">Manage queues, appointments, and consultations</div>
                  </div>
                  <div className="role-card-arrow"><ChevronRightIcon size={18} /></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppProvider>
    );
  }

  // ─── STUDENT AUTH GATE ────────────────────────────
  if (role === 'student' && !studentAuthed) {
    return (
      <AppProvider>
        <StudentAuth
          onAuthSuccess={(email) => {
            setStudentAuthed(true);
            setStudentEmail(email);          // remember the student
          }}
          onBack={handleReturnToLanding}
        />
      </AppProvider>
    );
  }

  // ─── STAFF AUTH GATE ─────────────────────────────
  if (role === 'admin' && !staffAuthed) {
    return (
      <AppProvider>
        <StaffAuth
          onAuthSuccess={() => setStaffAuthed(true)}
          onBack={handleReturnToLanding}
        />
      </AppProvider>
    );
  }

  // ─── APP SHELL ────────────────────────────────────
  return (
    <AppProvider studentEmail={studentEmail}>
      <div className="app-shell">
        <header className="app-header">
          <div className="header-brand">
            <div className="header-seal"><AppLogo /></div>
            <div>
              <div className="header-name">Pila<span>Free</span></div>
              <div className="header-sub">PCU Clinic System</div>
            </div>
          </div>
          <div className="header-right">
            <div className="header-role-pill">
              {role === 'student' ? 'Student Portal' : 'Staff Dashboard'}
            </div>
            <button className="header-switch" onClick={handleReturnToLanding}>
              Log Out
            </button>
          </div>
        </header>
        {role === 'student' ? <StudentView /> : <AdminView />}
      </div>
    </AppProvider>
  );
}
