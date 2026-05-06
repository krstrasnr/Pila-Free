import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getStatusLabel, AUTO_CANCEL_MINUTES } from '../utils/slotUtils';
import { ClockIcon, UserIcon, CalendarIcon } from './Icons';

export default function AdminView() {
    const {
        doctors, appointments, queue, slots,
        addToQueue, callNext, startConsultation, finishConsultation, markNoShow, now,
    } = useApp();

    // ─── STATE ─────────────────────────────────────────────────
    const [selectedDoctor, setSelectedDoctor] = useState(doctors[0]?.id);
    // showCalendar: toggles the calendar overlay — no nav tabs needed
    const [showCalendar, setShowCalendar] = useState(false);

    // ─── DERIVED DATA ──────────────────────────────────────────
    const doctor = doctors.find(d => d.id === selectedDoctor);
    const doctorQueue = queue.filter(q => q.doctorId === selectedDoctor);

    const waiting    = doctorQueue.filter(q => q.status === 'waiting');
    const called     = doctorQueue.filter(q => q.status === 'called');
    const inProgress = doctorQueue.filter(q => q.status === 'in-progress');
    const done       = doctorQueue.filter(q => q.status === 'done');
    const noShow     = doctorQueue.filter(q => q.status === 'no-show');

    // Active queue = called + in-progress + waiting (display order)
    const activeQueue = [...called, ...inProgress, ...waiting];

    // Pending = booked appointments not yet added to queue
    const pendingBookings = appointments.filter(
        a => a.doctorId === selectedDoctor && a.status === 'booked'
    );

    // ─── RENDER ────────────────────────────────────────────────
    return (
        <div className="page-wrap">

            {/* PAGE HEADER */}
            <div className="page-header">
                <div>
                    <div className="page-eyebrow">Clinic Staff</div>
                    <h1 className="page-title">Queue Dashboard</h1>
                    <p className="page-desc">Manage patient queues, call patients, and track consultation progress.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    {/* View Calendar button — toggles the calendar view */}
                    <button
                        className="btn-ghost"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                        onClick={() => setShowCalendar(true)}
                        title="View Appointment Calendar"
                    >
                        <CalendarIcon size={15} />
                        View Calendar
                    </button>
                    {/* Live clock display */}
                    <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'right', lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                            {now.toLocaleDateString('en-PH', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                            })}
                        </div>
                        <div>
                            {now.toLocaleTimeString('en-PH', {
                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════ */}
            {/* QUEUE DASHBOARD — always the primary view             */}
            {/* Calendar is toggled via the header button above       */}
            {/* ══════════════════════════════════════════════════════ */}
            {!showCalendar && (
                <>
                    {/* Doctor Selector — switch between clinicians */}
                    <div className="doctor-selector">
                        {doctors.map(d => {
                            const active = queue.filter(
                                q => q.doctorId === d.id && ['waiting', 'called', 'in-progress'].includes(q.status)
                            ).length;
                            return (
                                <button
                                    key={d.id}
                                    className={`doctor-card ${selectedDoctor === d.id ? 'active' : ''}`}
                                    onClick={() => setSelectedDoctor(d.id)}
                                >
                                    <div className="doctor-card-name">{d.name}</div>
                                    <div className="doctor-card-role">{d.role} &bull; {d.specialty}</div>
                                    <div className="doctor-card-badge">
                                        {active} Active {active === 1 ? 'Patient' : 'Patients'}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Stats Summary — at-a-glance counts per status */}
                    <div className="stats-grid">
                        <div className="stat-card waiting">
                            <div className="stat-value">{waiting.length}</div>
                            <div className="stat-label">Waiting</div>
                        </div>
                        <div className="stat-card called">
                            <div className="stat-value">{called.length}</div>
                            <div className="stat-label">Called</div>
                        </div>
                        <div className="stat-card in-progress">
                            <div className="stat-value">{inProgress.length}</div>
                            <div className="stat-label">In Progress</div>
                        </div>
                        <div className="stat-card done">
                            <div className="stat-value">{done.length}</div>
                            <div className="stat-label">Completed</div>
                        </div>
                        <div className="stat-card no-show">
                            <div className="stat-value">{noShow.length}</div>
                            <div className="stat-label">No-Shows</div>
                        </div>
                    </div>

                    {/* Active Queue — the live queue for the selected doctor */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <div className="card-title">Active Queue — {doctor?.name}</div>
                                <div className="card-subtitle">
                                    {activeQueue.length > 0
                                        ? `${activeQueue.length} patient${activeQueue.length !== 1 ? 's' : ''} in queue`
                                        : 'Queue is currently empty'}
                                </div>
                            </div>
                            {/* Call Next Patient — disabled when nobody is waiting */}
                            <button
                                className="btn-primary sm"
                                onClick={() => callNext(selectedDoctor)}
                                disabled={waiting.length === 0}
                            >
                                Call Next Patient
                            </button>
                        </div>

                        {activeQueue.length === 0 ? (
                            <div className="empty-state">
                                <UserIcon size={40} />
                                <div style={{ height: 10 }} />
                                <div className="empty-state-title">No patients in queue</div>
                                <div className="empty-state-desc">
                                    Add patients from the pending bookings section below.
                                </div>
                            </div>
                        ) : (
                            <div>
                                {activeQueue.map(entry => (
                                    <AdminEntry
                                        key={entry.id}
                                        entry={entry}
                                        now={now}
                                        onStart={() => startConsultation(entry.id)}
                                        onFinish={() => finishConsultation(entry.id)}
                                        onNoShow={() => markNoShow(entry.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending Bookings — appointments not yet added to the live queue */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <div className="card-title">Pending Bookings</div>
                                <div className="card-subtitle">
                                    Confirmed appointments awaiting queue assignment
                                </div>
                            </div>
                            <span className={`status-pill ${pendingBookings.length > 0 ? 'booked' : 'done'}`}>
                {pendingBookings.length} Pending
              </span>
                        </div>

                        {pendingBookings.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: 14 }}>
                                No pending bookings at this time.
                            </div>
                        ) : (
                            <div className="queue-table-wrap">
                                <table className="queue-table">
                                    <thead>
                                    <tr>
                                        <th>Student Name</th>
                                        <th>Student ID</th>
                                        <th>Year / Section</th>
                                        <th>Time Slot</th>
                                        <th>Reason for Visit</th>
                                        <th></th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {pendingBookings.map(a => {
                                        const slot = slots.find(s => s.id === a.slotId);
                                        return (
                                            <tr key={a.id}>
                                                <td style={{ fontWeight: 600 }}>{a.studentName}</td>
                                                <td style={{ color: 'var(--muted)', fontSize: 13 }}>{a.studentId}</td>
                                                <td style={{ color: 'var(--muted)', fontSize: 13 }}>{a.yearSection || '—'}</td>
                                                <td style={{ fontSize: 13 }}>
                                                    {slot ? `${slot.label} – ${slot.endLabel}` : '—'}
                                                </td>
                                                <td style={{ color: 'var(--text-light)', fontSize: 13 }}>
                                                    {a.concern || '—'}
                                                </td>
                                                <td>
                                                    {/* Staff clicks this to move appointment into the live queue */}
                                                    <button className="btn-action enqueue" onClick={() => addToQueue(a.id)}>
                                                        Add to Queue
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Consultation History — done and no-show entries for today */}
                    {(done.length > 0 || noShow.length > 0) && (
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-title">Today's Consultation History</div>
                                    <div className="card-subtitle">
                                        {done.length} completed, {noShow.length} no-show
                                    </div>
                                </div>
                            </div>
                            <div className="queue-table-wrap">
                                <table className="queue-table">
                                    <thead>
                                    <tr>
                                        <th>No.</th>
                                        <th>Patient</th>
                                        <th>Year / Section</th>
                                        <th>Concern</th>
                                        <th>Status</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {[...done, ...noShow].map(entry => (
                                        <tr key={entry.id}>
                                            <td><span className="queue-num-cell">#{entry.queueNumber}</span></td>
                                            <td style={{ fontWeight: 600 }}>{entry.studentName}</td>
                                            <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                                                {entry.yearSection || '—'}
                                            </td>
                                            <td style={{ color: 'var(--text-light)', fontSize: 13 }}>
                                                {entry.concern || '—'}
                                            </td>
                                            <td>
                          <span className={`status-pill ${entry.status}`}>
                            {getStatusLabel(entry.status)}
                          </span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* CALENDAR VIEW — shown when header button is clicked   */}
            {/* ══════════════════════════════════════════════════════ */}
            {showCalendar && (
                <>
                    {/* Back to Dashboard button */}
                    <div style={{ marginBottom: 20 }}>
                        <button
                            className="btn-ghost"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                            onClick={() => setShowCalendar(false)}
                        >
                            ← Back to Dashboard
                        </button>
                    </div>
                    <AdminCalendarView appointments={appointments} />
                </>
            )}

        </div>
    );
}

// ============================================================
// AdminEntry — A single queue entry row in the active queue
// Shows name, concern, timer (if called), status pill, and action buttons
// ============================================================
function AdminEntry({ entry, now, onStart, onFinish, onNoShow }) {
    // Minutes elapsed since patient was called — used to show urgency timer
    const calledMinutes = entry.calledAt
        ? Math.floor((now - new Date(entry.calledAt)) / 60000)
        : null;

    return (
        <div className={`admin-entry ${entry.status}`}>
            <div className="admin-entry-num">#{entry.queueNumber}</div>
            <div className="admin-entry-info">
                <div className="admin-entry-name">{entry.studentName}</div>
                {entry.yearSection && (
                    <div className="admin-entry-concern">{entry.yearSection}</div>
                )}
                {entry.concern && (
                    <div className="admin-entry-concern">{entry.concern}</div>
                )}
                {/* Timer shown when patient has been called — turns red near AUTO_CANCEL threshold */}
                {entry.status === 'called' && calledMinutes !== null && (
                    <div className={`admin-entry-timer ${calledMinutes >= AUTO_CANCEL_MINUTES - 1 ? 'urgent' : ''}`}>
                        Called {calledMinutes} minute{calledMinutes !== 1 ? 's' : ''} ago
                        {calledMinutes >= AUTO_CANCEL_MINUTES - 1 && ' — approaching no-show threshold'}
                    </div>
                )}
            </div>
            <span className={`status-pill ${entry.status}`} style={{ flexShrink: 0 }}>
        {getStatusLabel(entry.status)}
      </span>
            <div className="admin-entry-actions">
                {/* Called: staff can start consultation or mark no-show */}
                {entry.status === 'called' && (
                    <>
                        <button className="btn-action confirm" onClick={onStart}>Start</button>
                        <button className="btn-action warn" onClick={onNoShow}>No Show</button>
                    </>
                )}
                {/* In-progress: staff marks consultation as complete */}
                {entry.status === 'in-progress' && (
                    <button className="btn-action confirm" onClick={onFinish}>Complete</button>
                )}
                {/* Waiting: staff can remove a patient from the queue */}
                {entry.status === 'waiting' && (
                    <button className="btn-action warn" onClick={onNoShow}>Remove</button>
                )}
            </div>
        </div>
    );
}

// ============================================================
// AdminCalendarView — Monthly calendar for staff to view all
// booked/queued appointments across all doctors.
// Mirrors the CalendarView in StudentView but shows ALL appointments.
// ============================================================
function AdminCalendarView({ appointments }) {
    const { slots, doctors } = useApp();
    const [currentDate, setCurrentDate] = useState(new Date());

    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December',
    ];
    const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today       = new Date();

    // Color palette for appointment chips — keyed by concern keyword
    const tagColors = [
        { bg: '#fde8e8', dot: '#e05555', text: '#b03030' },
        { bg: '#e8eeff', dot: '#5b7fe8', text: '#2d4fb0' },
        { bg: '#f0e8fd', dot: '#9b5be8', text: '#5c2da0' },
        { bg: '#e8fdf0', dot: '#3dba70', text: '#1e7a45' },
        { bg: '#fff4e0', dot: '#e0a030', text: '#9a6010' },
    ];

    // Hash a concern string to a stable color from the palette
    function getConcernColor(concern) {
        const str = concern || 'Check-up';
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        return tagColors[Math.abs(hash) % tagColors.length];
    }

    // Group appointments by calendar day for the current month
    // Uses preferredDate if set, otherwise falls back to bookedAt date
    const grouped = {};
    appointments.forEach(appt => {
        if (appt.status === 'cancelled') return; // skip canceled appointments
        const dateStr = appt.preferredDate || (appt.bookedAt ? appt.bookedAt.split('T')[0] : null);
        if (!dateStr) return;
        const d = new Date(dateStr + 'T00:00:00');
        if (d.getFullYear() === year && d.getMonth() === month) {
            const day = d.getDate();
            grouped[day] = grouped[day] || [];
            grouped[day].push(appt);
        }
    });

    // Build flat array of calendar cells (null = blank leading day)
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const isToday = (d) =>
        d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    return (
        <div style={{
            background: '#1a2744',
            borderRadius: 16,
            padding: '28px 28px 32px',
            maxWidth: 960,
        }}>

            {/* CALENDAR HEADER — month/year title + prev/next navigation */}
            <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 24,
            }}>
                <button
                    onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                    style={{
                        background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
                        color: 'white', fontSize: 18, width: 36, height: 36,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >‹</button>

                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        color: 'white', fontSize: 15, fontWeight: 700,
                        letterSpacing: 3, textTransform: 'uppercase',
                    }}>
                        Appointment Calendar
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 3, letterSpacing: 1 }}>
                        {monthNames[month]} {year}
                    </div>
                </div>

                <button
                    onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                    style={{
                        background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
                        color: 'white', fontSize: 18, width: 36, height: 36,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >›</button>
            </div>

            {/* DAY-OF-WEEK HEADERS */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4,
            }}>
                {dayNames.map(d => (
                    <div key={d} style={{
                        background: '#243160', borderRadius: 4,
                        textAlign: 'center', padding: '8px 0',
                        color: 'rgba(255,255,255,0.6)', fontSize: 11,
                        fontWeight: 700, letterSpacing: 1,
                    }}>{d}</div>
                ))}
            </div>

            {/* CALENDAR GRID — each cell shows appointment chips + day number */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {cells.map((day, i) => (
                    <div key={i} style={{
                        background: day ? '#d4d8e2' : 'transparent',
                        borderRadius: 6,
                        minHeight: 90,
                        padding: day ? '6px 7px 20px' : 0,
                        position: 'relative',
                        border: day && isToday(day)
                            ? '2px solid #b8922a'
                            : '2px solid transparent',
                    }}>
                        {day && (
                            <>
                                {/* Appointment chips for this day */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
                                    {(grouped[day] || []).map((appt, idx) => {
                                        const color = getConcernColor(appt.concern);
                                        const label = appt.concern
                                            ? (appt.concern.length > 14
                                                ? appt.concern.slice(0, 13) + '…'
                                                : appt.concern)
                                            : 'Check-up';
                                        // Show the doctor's abbreviated name below the concern label
                                        const doc = doctors.find(d => d.id === appt.doctorId);
                                        const docLabel = doc ? doc.name.split(' ').pop() : '';
                                        return (
                                            <div key={idx} style={{
                                                background: color.bg, borderRadius: 5,
                                                padding: '3px 7px 3px 5px',
                                                display: 'flex', alignItems: 'center', gap: 5,
                                                fontSize: 11, fontWeight: 600, color: color.text,
                                                whiteSpace: 'nowrap', overflow: 'hidden',
                                            }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: color.dot, flexShrink: 0, display: 'inline-block',
                        }} />
                                                {label}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Day number — bottom right; highlighted gold if today */}
                                <div style={{
                                    position: 'absolute', bottom: 5, right: 8,
                                    fontSize: 12,
                                    fontWeight: isToday(day) ? 800 : 500,
                                    color: isToday(day) ? '#b8922a' : '#555e75',
                                }}>
                                    {day}
                                </div>

                                {/* Appointment count badge — top right if more than 2 appointments */}
                                {(grouped[day] || []).length > 2 && (
                                    <div style={{
                                        position: 'absolute', top: 5, right: 7,
                                        fontSize: 10, fontWeight: 700,
                                        color: '#555e75',
                                    }}>
                                        {grouped[day].length}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* CALENDAR LEGEND */}
            <div style={{
                marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap',
                borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14,
            }}>
        <span style={{
            color: 'rgba(255,255,255,0.4)', fontSize: 11,
            letterSpacing: 1, textTransform: 'uppercase',
        }}>
          Legend:
        </span>
                {tagColors.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: c.dot, display: 'inline-block',
            }} />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              {['Check-up', 'X-ray', 'Dental', 'Counseling', 'Immunization'][i]}
            </span>
                    </div>
                ))}
                {/* Staff-only: today marker legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
              width: 12, height: 12, borderRadius: 2,
              border: '2px solid #b8922a', display: 'inline-block',
          }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Today</span>
                </div>
            </div>

        </div>
    );
}
