// ============================================================
// StudentView.jsx — Student Portal (Firestore, with email recovery)
// Tabs: Book Appointment | Queue Status | Appointment Calendar
// ============================================================

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getStatusLabel } from '../utils/slotUtils';
import { CalendarIcon, ClipboardIcon, ClockIcon, BellIcon } from './Icons';

export default function StudentView() {
  const {
    doctors, slots, bookAppointment, cancelAppointment,
    appointments, queue, getWaitEstimate, getSlotCount,
    studentEmail,   // ✅ from context
  } = useApp();

  // ─── STATE ─────────────────────────────────────────────────
  const [tab, setTab] = useState('book');
  const [form, setForm] = useState({
    studentName: '',
    studentId: '',
    yearSection: '',
    doctorId: '',
    preferredDate: '',
    slotId: '',
    concern: '',
  });
  const [error, setError] = useState('');
  const [myApptId, setMyApptId] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // ─── DERIVED DATA ──────────────────────────────────────────
  const myAppt = myApptId ? appointments.find(a => a.id === myApptId) : null;
  const myQueue = myAppt ? queue.find(q => q.appointmentId === myApptId) : null;
  const waitMins = myQueue ? getWaitEstimate(myQueue.doctorId, myQueue.queueNumber) : null;
  const selectedDoctor = doctors.find(d => d.id === form.doctorId);

  const todayStr = new Date().toISOString().split('T')[0];

  // ✅ Auto‑restore the student’s appointment after login
  useEffect(() => {
    if (!studentEmail) return;
    if (myApptId) return;   // already loaded

    // Find the latest active appointment belonging to this student
    const activeAppt = [...appointments]
      .filter(a => a.studentEmail === studentEmail &&
                  a.status !== 'cancelled' &&
                  a.status !== 'done' &&
                  a.status !== 'no-show')
      .sort((a, b) => new Date(b.bookedAt.toDate?.() || b.bookedAt) -
                     new Date(a.bookedAt.toDate?.() || a.bookedAt))[0];

    if (activeAppt) {
      setMyApptId(activeAppt.id);
      setSubmitted(true);
      setTab('status');
    }
  }, [studentEmail, appointments, myApptId]);

  // ─── HANDLERS ─────────────────────────────────────────────
  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }

  function handleSlotSelect(slotId) {
    setForm(f => ({ ...f, slotId }));
    setError('');
  }

  async function handleSubmit() {
    if (!form.studentName.trim()) return setError('Please enter your full name.');
    if (!form.studentId.trim()) return setError('Please enter your Student ID.');
    if (!form.doctorId) return setError('Please select a clinician.');
    if (!form.preferredDate) return setError('Please select a preferred date.');
    if (!form.slotId) return setError('Please select a time slot.');

    const res = await bookAppointment(form);
    if (!res.ok) return setError(res.reason);

    setMyApptId(res.appointment.id);
    setSubmitted(true);
    setTab('status');
  }

  function handleCancel() {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    cancelAppointment(myAppt.id);
    setMyApptId(null);
    setSubmitted(false);
    setTab('book');
    setForm({
      studentName: '', studentId: '', yearSection: '',
      doctorId: '', preferredDate: '', slotId: '', concern: '',
    });
  }

  const doctorSlots = slots.map(s => ({
    ...s,
    count: form.doctorId ? getSlotCount(s.id, form.doctorId) : 0,
    full: form.doctorId ? getSlotCount(s.id, form.doctorId) >= (selectedDoctor?.capacity || 0) : false,
  }));

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <div className="page-wrap">
      {/* PAGE HEADER unchanged */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">PCU Health Services</div>
          <h1 className="page-title">Student's Clinic Appointment</h1>
          <p className="page-desc">Book your appointment and check your queue status.</p>
        </div>
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }} onClick={() => setTab('calendar')} title="View Appointment Calendar">
          <CalendarIcon size={18} />
          View Calendar
        </button>
      </div>

      {/* TAB NAVIGATION unchanged */}
      <div className="nav-tabs">
        <button className={`nav-tab ${tab === 'book' ? 'active' : ''}`} onClick={() => setTab('book')}>Book Appointment</button>
        <button className={`nav-tab ${tab === 'status' ? 'active' : ''}`} onClick={() => setTab('status')}>
          Queue Status
          {myQueue && (myQueue.status === 'waiting' || myQueue.status === 'called') && (
            <span style={{ marginLeft: 8, background: '#b8922a', color: 'white', fontSize: 10, padding: '1px 7px', borderRadius: 2, fontWeight: 700, letterSpacing: 1 }}>LIVE</span>
          )}
        </button>
        <button className={`nav-tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => setTab('calendar')}>Appointment Calendar</button>
      </div>

      {/* BOOK TAB (unchanged) */}
      {tab === 'book' && (
        <div className="card" style={{ maxWidth: 740 }}>
          {/* ... exact same booking form as before ... */}
          <div className="card-header">
            <div>
              <div className="card-title">New Appointment Request</div>
              <div className="card-subtitle">All fields marked with an asterisk (*) are required.</div>
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }} onClick={() => setTab('calendar')} title="View Calendar"><CalendarIcon size={22} /></button>
          </div>

          <div className="form-section-title">Patient Information</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name *</label>
              <input name="studentName" value={form.studentName} onChange={handleChange} placeholder="e.g. Juan Dela Cruz" />
            </div>
            <div className="form-group">
              <label>Student ID Number *</label>
              <input name="studentId" value={form.studentId} onChange={handleChange} placeholder="e.g. 2025001234" />
            </div>
            <div className="form-group span-2">
              <label>Year Level &amp; Section</label>
              <input name="yearSection" value={form.yearSection} onChange={handleChange} placeholder="e.g. 3rd Year, BSCS-A" />
            </div>
          </div>

          <div className="form-section-title" style={{ marginTop: 28 }}>Appointment Details</div>
          <div className="form-grid">
            <div className="form-group span-2">
              <label>Clinician *</label>
              <select name="doctorId" value={form.doctorId} onChange={handleChange}>
                <option value="">Select a clinician...</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — {d.role}</option>
                ))}
              </select>
            </div>
            <div className="form-group span-2">
              <label>Preferred Date *</label>
              <input type="date" name="preferredDate" value={form.preferredDate} onChange={handleChange} min={todayStr} style={{ cursor: 'pointer', width: '200px' }} />
              {form.preferredDate && (
                <div className="form-hint">
                  {new Date(form.preferredDate + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              )}
            </div>
          </div>

          {form.doctorId && (
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-light)', display: 'block', marginBottom: 12 }}>
                Preferred Time Slot *{' '}
                <span style={{ color: 'var(--muted)', fontWeight: 400, letterSpacing: 0 }}>
                  — {selectedDoctor?.capacity} patients per slot
                </span>
              </label>
              <div className="slot-grid">
                {doctorSlots.map(s => (
                  <button key={s.id} className={`slot-option ${s.full ? 'disabled' : ''} ${form.slotId === s.id ? 'selected' : ''}`} onClick={() => !s.full && handleSlotSelect(s.id)} disabled={s.full}>
                    <span className="slot-time">{s.label}</span>
                    <span className="slot-avail">{s.full ? 'Full' : `${selectedDoctor.capacity - s.count} available`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-grid" style={{ marginTop: 20 }}>
            <div className="form-group span-2">
              <label>Reason for Visit</label>
              <textarea name="concern" value={form.concern} onChange={handleChange} placeholder="Briefly describe your concern or symptoms..." />
            </div>
          </div>

          {error && <div className="alert error" style={{ marginTop: 16 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--smoke)' }}>
            <button className="btn-secondary" onClick={() => setForm({ studentName: '', studentId: '', yearSection: '', doctorId: '', preferredDate: '', slotId: '', concern: '' })}>Clear Form</button>
            <button className="btn-primary" onClick={handleSubmit}>Confirm Appointment</button>
          </div>
        </div>
      )}

      {/* STATUS TAB (Enhanced) */}
      {tab === 'status' && (
        <div style={{ maxWidth: 740 }}>
          {!myAppt ? (
            <div className="card">
              <div className="empty-state">
                <ClipboardIcon size={48} />
                <div style={{ height: 12 }} />
                <div className="empty-state-title">No Active Appointment</div>
                <div className="empty-state-desc">You have not booked an appointment for today.</div>
                <div style={{ marginTop: 20 }}>
                  <button className="btn-primary" onClick={() => setTab('book')}>Book an Appointment</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* QUEUE HERO (same as before) */}
              <div className="queue-hero-section">
                <div className={`queue-hero status-${myQueue?.status || 'booked'}`}>
                  <div className="queue-number-block">
                    <div className="queue-number-label">Queue No.</div>
                    <div className="queue-number-value">{myQueue?.queueNumber ?? '—'}</div>
                  </div>
                  <div className="queue-hero-info">
                    <div className={`queue-status-tag ${myQueue?.status || 'booked'}`}>{getStatusLabel(myQueue?.status || 'booked')}</div>
                    <div className="queue-hero-name">{myAppt.studentName}</div>
                    <div className="queue-hero-detail">
                      {doctors.find(d => d.id === myAppt.doctorId)?.name} &bull;&nbsp;
                      {(() => { const s = slots.find(x => x.id === myAppt.slotId); return s ? `${s.label} – ${s.endLabel}` : ''; })()}
                      {myAppt.preferredDate && (
                        <span style={{ marginLeft: 6 }}>
                          &bull;&nbsp;{new Date(myAppt.preferredDate + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* PENDING QUEUE ASSIGNMENT BANNER (only if booked, not yet queued) */}
              {myAppt.status === 'booked' && !myQueue && (
                <div style={{ background: '#f0f3f8', borderLeft: '4px solid var(--silver)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <BellIcon size={22} color="var(--silver-light)" />
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--navy)' }}>Awaiting Queue Assignment</h4>
                    <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-light)', lineHeight: 1.6 }}>
                      Your appointment has been booked successfully, but is <strong>not yet placed in the live queue</strong>.<br />
                      A clinic staff member will add you to the queue shortly. Once assigned, your queue number will appear above, and you will see your estimated wait time. This page updates automatically.
                    </p>
                  </div>
                </div>
              )}

              {/* STATUS TIMELINE */}
              <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>Appointment Progress</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                  {[
                    { step: 'booked', label: 'Booked' },
                    { step: 'queued', label: 'In Queue' },
                    { step: 'called', label: 'Called' },
                    { step: 'in-progress', label: 'In Progress' },
                    { step: 'done', label: 'Completed' },
                  ].map((s, idx) => {
                    let isActive = false;
                    if (myQueue) {
                      const statuses = ['waiting', 'called', 'in-progress', 'done'];
                      const mapped = s.step === 'queued' ? 'waiting' : s.step;
                      const currentIdx = statuses.indexOf(myQueue.status);
                      const stepIdx = statuses.indexOf(mapped);
                      isActive = stepIdx <= currentIdx;
                    } else if (myAppt.status === 'booked' && s.step === 'booked') {
                      isActive = true;
                    }
                    return (
                      <div key={s.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', zIndex: 1 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: isActive ? 'var(--navy)' : 'var(--smoke)', border: '2px solid ' + (isActive ? 'var(--navy)' : 'var(--border)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: isActive ? 'white' : 'var(--muted)', transition: 'all 0.3s' }}>{isActive ? '✓' : idx + 1}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? 'var(--navy)' : 'var(--muted)', marginTop: 6, textAlign: 'center', maxWidth: 70 }}>{s.label}</div>
                        {idx < 4 && (
                          <div style={{ position: 'absolute', top: 11, left: 'calc(50% + 14px)', width: 'calc(100% - 28px)', height: 2, background: isActive ? 'var(--navy)' : 'var(--smoke)', zIndex: -1, transition: 'background 0.3s' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* WAIT TIME / CALL BOXES */}
              {myQueue?.status === 'waiting' && (
                <div className="wait-box">
                  <div className="wait-indicator" />
                  <div className="wait-box-content">
                    <strong>Estimated Wait Time</strong>
                    <p>{waitMins === 0 ? 'You are next in line. Please be ready to proceed to the clinic.' : `Approximately ${waitMins} minute${waitMins !== 1 ? 's' : ''} remaining. You may remain in your classroom until called.`}</p>
                  </div>
                </div>
              )}
              {myQueue?.status === 'called' && (
                <div className="wait-box urgent">
                  <div className="wait-indicator pulse" />
                  <div className="wait-box-content">
                    <strong>Please Proceed to the Clinic Now</strong>
                    <p>You have been called for your appointment. Please proceed to the clinic within 5 minutes. Failure to appear will result in a no-show mark.</p>
                  </div>
                </div>
              )}
              {myQueue?.status === 'no-show' && (
                <div className="alert error">You were marked as a no-show. Please visit the clinic in person or submit a new appointment request.</div>
              )}

              {/* DETAILS CARD */}
              <div className="confirmation-card">
                <div className="confirmation-header">
                  <div className="confirmation-header-title">Appointment Details</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 1 }}>REF: {myAppt.id.toUpperCase().slice(-8)}</div>
                </div>
                <div className="confirmation-body">
                  <div className="detail-row"><span className="detail-label">Patient Name</span><span className="detail-value">{myAppt.studentName}</span></div>
                  <div className="detail-row"><span className="detail-label">Student ID</span><span className="detail-value">{myAppt.studentId}</span></div>
                  {myAppt.yearSection && <div className="detail-row"><span className="detail-label">Year &amp; Section</span><span className="detail-value">{myAppt.yearSection}</span></div>}
                  <div className="detail-row"><span className="detail-label">Clinician</span><span className="detail-value">{doctors.find(d => d.id === myAppt.doctorId)?.name}</span></div>
                  {myAppt.preferredDate && <div className="detail-row"><span className="detail-label">Preferred Date</span><span className="detail-value">{new Date(myAppt.preferredDate + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>}
                  <div className="detail-row"><span className="detail-label">Time Slot</span><span className="detail-value">{(() => { const s = slots.find(x => x.id === myAppt.slotId); return s ? `${s.label} – ${s.endLabel}` : '—'; })()}</span></div>
                  <div className="detail-row"><span className="detail-label">Reason for Visit</span><span className="detail-value">{myAppt.concern || 'Not specified'}</span></div>
                </div>
              </div>

              {/* LIVE QUEUE BOARD */}
              <LiveQueueBoard doctorId={myAppt.doctorId} myQueueId={myQueue?.id} />

              {/* CANCEL */}
              {myAppt.status !== 'cancelled' && myAppt.status !== 'queued' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn-danger" onClick={handleCancel}>Cancel Appointment</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* CALENDAR TAB (unchanged) */}
      {tab === 'calendar' && <CalendarView appointments={appointments} />}
    </div>
  );
}

// LiveQueueBoard unchanged
function LiveQueueBoard({ doctorId, myQueueId }) {
  const { queue, doctors } = useApp();
  const doctor = doctors.find(d => d.id === doctorId);
  const active = queue.filter(q => q.doctorId === doctorId && q.status !== 'done' && q.status !== 'no-show' && q.status !== 'cancelled');

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Live Queue — {doctor?.name}</div>
          <div className="card-subtitle">{active.length} patient{active.length !== 1 ? 's' : ''} currently in queue</div>
        </div>
        <ClockIcon size={20} color="var(--muted)" />
      </div>
      {active.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: 14 }}>The queue is currently empty.</div>
      ) : (
        <div className="queue-table-wrap">
          <table className="queue-table">
            <thead>
              <tr><th>No.</th><th>Patient</th><th>Year / Section</th><th>Status</th></tr>
            </thead>
            <tbody>
              {active.map(entry => (
                <tr key={entry.id} className={entry.id === myQueueId ? 'highlight' : ''}>
                  <td><span className="queue-num-cell">#{entry.queueNumber}</span></td>
                  <td style={{ fontWeight: entry.id === myQueueId ? 700 : 400 }}>
                    {entry.studentName}
                    {entry.id === myQueueId && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--gold)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>You</span>}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{entry.yearSection || '—'}</td>
                  <td><span className={`status-pill ${entry.status}`}>{getStatusLabel(entry.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CalendarView — Monthly calendar with appointment markers
// ============================================================
function CalendarView({ appointments }) {
  const { doctors } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const tagColors = [
    { bg: '#fde8e8', dot: '#e05555', text: '#b03030' },
    { bg: '#e8eeff', dot: '#5b7fe8', text: '#2d4fb0' },
    { bg: '#f0e8fd', dot: '#9b5be8', text: '#5c2da0' },
    { bg: '#e8fdf0', dot: '#3dba70', text: '#1e7a45' },
    { bg: '#fff4e0', dot: '#e0a030', text: '#9a6010' },
  ];

  function getConcernColor(concern) {
    const str = concern || 'Check-up';
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return tagColors[Math.abs(hash) % tagColors.length];
  }

  const grouped = {};
  appointments.forEach(appt => {
    const dateStr = appt.preferredDate || (appt.bookedAt ? appt.bookedAt.split('T')[0] : null);
    if (!dateStr) return;
    const d = new Date(dateStr + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      grouped[day] = grouped[day] || [];
      grouped[day].push(appt);
    }
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div style={{ background: '#1a2744', borderRadius: 16, padding: '28px 28px 32px', maxWidth: 960 }}>
      {/* Calendar Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: 'white', fontSize: 18, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'white', fontSize: 15, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>Appointment Calendar</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 3, letterSpacing: 1 }}>{monthNames[month]} {year}</div>
        </div>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: 'white', fontSize: 18, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      </div>

      {/* Day of Week Headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {dayNames.map(d => (
          <div key={d} style={{ background: '#243160', borderRadius: 4, textAlign: 'center', padding: '8px 0', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, i) => (
          <div key={i} style={{
            background: day ? '#d4d8e2' : 'transparent',
            borderRadius: 6, minHeight: 90,
            padding: day ? '6px 7px 20px' : 0,
            position: 'relative',
            border: day && isToday(day) ? '2px solid #b8922a' : '2px solid transparent',
          }}>
            {day && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
                  {(grouped[day] || []).map((appt, idx) => {
                    const color = getConcernColor(appt.concern);
                    const label = appt.concern
                      ? (appt.concern.length > 14 ? appt.concern.slice(0, 13) + '…' : appt.concern)
                      : 'Check-up';
                    return (
                      <div key={idx} style={{
                        background: color.bg, borderRadius: 5,
                        padding: '3px 7px 3px 5px',
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 11, fontWeight: 600, color: color.text,
                        whiteSpace: 'nowrap', overflow: 'hidden',
                      }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.dot, flexShrink: 0, display: 'inline-block' }} />
                        {label}
                      </div>
                    );
                  })}
                </div>
                <div style={{ position: 'absolute', bottom: 5, right: 8, fontSize: 12, fontWeight: isToday(day) ? 800 : 500, color: isToday(day) ? '#b8922a' : '#555e75' }}>{day}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>Legend:</span>
        {tagColors.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{['Check-up','X-ray','Dental','Counseling','Immunization'][i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}