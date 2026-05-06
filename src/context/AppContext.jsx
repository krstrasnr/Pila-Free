// ============================================================
// AppContext.jsx — Global State & Business Logic (Firestore)
// Provides: doctors, slots, appointments, queue, actions
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { generateSlots, AUTO_CANCEL_MINUTES, AVG_CONSULT_MINS } from '../utils/slotUtils';

const AppContext = createContext(null);

// ─── DOCTORS DATA ─────────────────────────────────────────────
const DOCTORS = [
  { id: 'doc1', name: 'Dr. Maria C. Santos', role: 'School Physician', specialty: 'General Medicine', capacity: 3 },
  { id: 'doc2', name: 'Dr. Jose R. Reyes', role: 'School Dentist', specialty: 'Dental Care', capacity: 2 },
];

const APPOINTMENTS_COL = 'appointments';
const QUEUE_COL = 'queue';
const COUNTERS_COL = 'counters';

export function AppProvider({ children, studentEmail = '' }) {
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [slots] = useState(generateSlots);
  const [doctors] = useState(DOCTORS);
  const [now, setNow] = useState(new Date());

  // ─── REAL‑TIME CLOCK ─────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ─── FIRESTORE LISTENERS ─────────────────────────────────
  useEffect(() => {
    const unsubAppts = onSnapshot(
      collection(db, APPOINTMENTS_COL),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAppointments(data);
      },
      (err) => console.error('Appointments listener error:', err)
    );

    const unsubQueue = onSnapshot(
      collection(db, QUEUE_COL),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setQueue(data);
      },
      (err) => console.error('Queue listener error:', err)
    );

    return () => {
      unsubAppts();
      unsubQueue();
    };
  }, []);

  // ─── AUTO NO‑SHOW LOGIC ─────────────────────────────────
  const markNoShow = useCallback(async (queueId) => {
    await updateDoc(doc(db, QUEUE_COL, queueId), { status: 'no-show' });
  }, []);

  useEffect(() => {
    queue.forEach(entry => {
      if (entry.status === 'called' && entry.calledAt) {
        const calledAt = entry.calledAt.toDate ? entry.calledAt.toDate() : new Date(entry.calledAt);
        const mins = (now - calledAt) / 60000;
        if (mins > AUTO_CANCEL_MINUTES) {
          markNoShow(entry.id);
        }
      }
    });
  }, [queue, now, markNoShow]);

  // ─── ACTION: BOOK APPOINTMENT ───────────────────────────
  const bookAppointment = useCallback(async ({
    studentName, studentId, yearSection,
    doctorId, preferredDate, slotId, concern,
  }) => {
    const doctor = doctors.find(d => d.id === doctorId);
    if (!doctor) return { ok: false, reason: 'Doctor not found.' };

    const counterRef = doc(db, COUNTERS_COL, `${doctorId}_${slotId}`);
    const apptRef = doc(collection(db, APPOINTMENTS_COL));

    // ✅ Include the student's email so we can link the appointment to them
    const apptData = {
      studentName,
      studentId,
      yearSection: yearSection || '',
      doctorId,
      preferredDate,
      slotId,
      concern: concern || '',
      status: 'booked',
      bookedAt: Timestamp.now(),
      queueNumber: null,
      studentEmail: studentEmail || '',
    };

    try {
      const result = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        const currentCount = counterDoc.exists() ? counterDoc.data().count : 0;

        if (currentCount >= doctor.capacity) {
          return { ok: false, reason: 'This time slot is fully booked.' };
        }

        transaction.set(counterRef, { count: currentCount + 1 }, { merge: true });
        transaction.set(apptRef, apptData);

        return { ok: true, appointmentId: apptRef.id, data: apptData };
      });

      if (result.ok) {
        const newAppt = { id: result.appointmentId, ...result.data };
        setAppointments(prev => [...prev, newAppt]);
        return { ok: true, appointment: newAppt };
      } else {
        return result;
      }
    } catch (error) {
      console.error('bookAppointment error:', error);
      return { ok: false, reason: 'An error occurred while booking.' };
    }
  }, [doctors, studentEmail]);

  // ─── ACTION: CANCEL APPOINTMENT ─────────────────────────
  const cancelAppointment = useCallback(async (apptId) => {
    const apptRef = doc(db, APPOINTMENTS_COL, apptId);
    try {
      await updateDoc(apptRef, { status: 'cancelled' });
      const linked = queue.find(q => q.appointmentId === apptId);
      if (linked) {
        await deleteDoc(doc(db, QUEUE_COL, linked.id));
      }
    } catch (err) {
      console.error('cancelAppointment error:', err);
    }
  }, [queue]);

  // ─── ACTION: ADD TO QUEUE (staff) ───────────────────────
  const addToQueue = useCallback(async (apptId) => {
    const appt = appointments.find(a => a.id === apptId);
    if (!appt || appt.status !== 'booked') return;

    const queueCounterRef = doc(db, COUNTERS_COL, `queue_${appt.doctorId}`);
    const apptRef = doc(db, APPOINTMENTS_COL, apptId);
    const queueRef = doc(collection(db, QUEUE_COL));

    try {
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(queueCounterRef);
        let nextNum = counterDoc.exists() ? counterDoc.data().count + 1 : 1;

        const queueData = {
          appointmentId: apptId,
          studentName: appt.studentName,
          studentId: appt.studentId,
          yearSection: appt.yearSection || '',
          doctorId: appt.doctorId,
          concern: appt.concern || '',
          queueNumber: nextNum,
          status: 'waiting',
          addedAt: Timestamp.now(),
          calledAt: null,
          startedAt: null,
          doneAt: null,
        };

        transaction.set(queueRef, queueData);
        transaction.update(apptRef, { status: 'queued', queueNumber: nextNum });
        transaction.set(queueCounterRef, { count: nextNum }, { merge: true });
      });
    } catch (err) {
      console.error('addToQueue error:', err);
    }
  }, [appointments]);

  // ─── ACTION: CALL NEXT PATIENT ──────────────────────────
  const callNext = useCallback(async (doctorId) => {
    const waiting = queue
      .filter(q => q.doctorId === doctorId && q.status === 'waiting')
      .sort((a, b) => a.queueNumber - b.queueNumber);
    if (!waiting.length) return;

    await updateDoc(doc(db, QUEUE_COL, waiting[0].id), {
      status: 'called',
      calledAt: Timestamp.now(),
    });
  }, [queue]);

  // ─── ACTION: START CONSULTATION ─────────────────────────
  const startConsultation = useCallback(async (queueId) => {
    await updateDoc(doc(db, QUEUE_COL, queueId), {
      status: 'in-progress',
      startedAt: Timestamp.now(),
    });
  }, []);

  // ─── ACTION: FINISH CONSULTATION ────────────────────────
  const finishConsultation = useCallback(async (queueId) => {
    await updateDoc(doc(db, QUEUE_COL, queueId), {
      status: 'done',
      doneAt: Timestamp.now(),
    });
  }, []);

  // ─── UTILITY: WAIT ESTIMATE ─────────────────────────────
  const getWaitEstimate = useCallback((doctorId, queueNumber) => {
    const ahead = queue.filter(q =>
      q.doctorId === doctorId &&
      q.queueNumber < queueNumber &&
      ['waiting', 'called', 'in-progress'].includes(q.status)
    ).length;
    return ahead * AVG_CONSULT_MINS;
  }, [queue]);

  // ─── UTILITY: SLOT COUNT ────────────────────────────────
  const getSlotCount = useCallback((slotId, doctorId) => {
    return appointments.filter(a =>
      a.slotId === slotId &&
      a.doctorId === doctorId &&
      a.status !== 'cancelled' &&
      a.status !== 'no-show'
    ).length;
  }, [appointments]);

  // ─── PROVIDE EVERYTHING ─────────────────────────────────
  return (
    <AppContext.Provider value={{
      doctors, slots, appointments, queue, now,
      bookAppointment, cancelAppointment,
      addToQueue, callNext, startConsultation, finishConsultation, markNoShow,
      getWaitEstimate, getSlotCount,
      studentEmail,   // ✅ exposed for StudentView
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);