export const AUTO_CANCEL_MINUTES = 5;
export const AVG_CONSULT_MINS = 8;

export function generateSlots() {
  const slots = [];
  for (let h = 8; h < 17; h++) {
    if (h === 12) continue;
    for (const m of [0, 30]) {
      const id = `slot-${h}-${m}`;
      const endH = m === 30 ? h + 1 : h;
      const endM = m === 30 ? 0 : 30;
      slots.push({
        id,
        label: formatTime(h, m),
        endLabel: formatTime(endH, endM),
        hour: h,
        minute: m,
      });
    }
  }
  return slots;
}

function formatTime(h, m) {
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m === 0 ? '00' : m} ${ampm}`;
}

export function getStatusLabel(status) {
  const map = {
    waiting: 'Waiting',
    'in-progress': 'In Progress',
    done: 'Completed',
    'no-show': 'No Show',
    cancelled: 'Cancelled',
    booked: 'Booked',
    queued: 'Queued',
  };
  return map[status] || status;
}
