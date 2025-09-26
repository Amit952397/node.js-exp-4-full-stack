// concurrent-ticket-booking-system.js
// Node.js + Express app implementing seat locking and confirmation
// Run: npm install express
// Start server: node concurrent-ticket-booking-system.js
// Run with simulated concurrent test: node concurrent-ticket-booking-system.js --test

const express = require('express');
const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3000;
const LOCK_DURATION_MS = 60_000; // 1 minute lock

// In-memory seat store
// seatId -> { state: 'available' | 'locked' | 'booked', owner: userId|null, expiresAt: timestamp|null, _timer: Timeout|null }
const seats = new Map();
const TOTAL_SEATS = 20;
for (let i = 1; i <= TOTAL_SEATS; i++) {
  seats.set(String(i), { state: 'available', owner: null, expiresAt: null, _timer: null });
}

// Helper: get safe representation for JSON responses (remove internal timer)
function serializeSeats() {
  const out = {};
  for (const [id, s] of seats.entries()) {
    out[id] = {
      state: s.state,
      owner: s.owner,
      expiresAt: s.expiresAt ? new Date(s.expiresAt).toISOString() : null
    };
  }
  return out;
}

// Internal function to release lock (called when lock expires or explicit unlock)
function releaseLockInternal(seatId) {
  const seat = seats.get(seatId);
  if (!seat) return;
  if (seat._timer) {
    clearTimeout(seat._timer);
    seat._timer = null;
  }
  if (seat.state === 'locked') {
    seat.state = 'available';
    seat.owner = null;
    seat.expiresAt = null;
  }
}

// Acquire a lock synchronously (no awaits between checks and set to avoid race conditions)
function tryLockSeat(seatId, userId) {
  const seat = seats.get(seatId);
  if (!seat) return { success: false, code: 404, message: 'Seat not found' };

  // If currently booked -> cannot lock
  if (seat.state === 'booked') {
    return { success: false, code: 409, message: 'Seat already booked' };
  }

  // If locked and not expired -> cannot lock
  if (seat.state === 'locked') {
    // Double-check expiry timestamp in case timer hasn't fired yet
    const now = Date.now();
    if (seat.expiresAt && seat.expiresAt > now) {
      return { success: false, code: 409, message: 'Seat is currently locked by another user', owner: seat.owner, expiresAt: new Date(seat.expiresAt).toISOString() };
    } else {
      // Lock expired logically but release was not processed yet: clean up and continue to lock
      releaseLockInternal(seatId);
    }
  }

  // At this point seat is available
  const expiresAt = Date.now() + LOCK_DURATION_MS;
  seat.state = 'locked';
  seat.owner = userId;
  seat.expiresAt = expiresAt;

  // clear any previous timer if present
  if (seat._timer) clearTimeout(seat._timer);

  // set timer to auto-release lock
  seat._timer = setTimeout(() => {
    // When timeout triggers, ensure we only release if still locked and the owner hasn't booked
    const s = seats.get(seatId);
    if (!s) return;
    if (s.state === 'locked' && s.expiresAt && s.expiresAt <= Date.now()) {
      s._timer = null;
      s.state = 'available';
      s.owner = null;
      s.expiresAt = null;
      console.log(`Lock expired and released for seat ${seatId}`);
    }
  }, LOCK_DURATION_MS + 10); // small cushion

  return { success: true, code: 200, message: 'Seat locked', seat: { id: seatId, owner: userId, expiresAt: new Date(expiresAt).toISOString() } };
}

// Confirm a booking (must hold the lock)
function confirmSeat(seatId, userId) {
  const seat = seats.get(seatId);
  if (!seat) return { success: false, code: 404, message: 'Seat not found' };

  if (seat.state === 'booked') {
    return { success: false, code: 409, message: 'Seat already booked' };
  }

  if (seat.state !== 'locked') {
    return { success: false, code: 400, message: 'Seat is not locked. You must lock before confirming.' };
  }

  // Check owner
  if (seat.owner !== userId) {
    return { success: false, code: 403, message: 'You do not own the lock for this seat' };
  }

  // Check expiration
  if (seat.expiresAt && seat.expiresAt <= Date.now()) {
    // lock expired
    releaseLockInternal(seatId);
    return { success: false, code: 410, message: 'Lock has expired' };
  }

  // Confirm booking: clear timer, set state booked
  if (seat._timer) {
    clearTimeout(seat._timer);
    seat._timer = null;
  }
  seat.state = 'booked';
  seat.expiresAt = null;

  return { success: true, code: 200, message: 'Seat successfully booked', seat: { id: seatId, owner: userId } };
}

// API Endpoints

// Get all seats
app.get('/seats', (req, res) => {
  res.json({ seats: serializeSeats() });
});

// Lock a seat: POST /lock { seatId, userId }
app.post('/lock', (req, res) => {
  const { seatId, userId } = req.body || {};
  if (!seatId || !userId) return res.status(400).json({ message: 'seatId and userId are required' });

  const result = tryLockSeat(String(seatId), String(userId));
  res.status(result.code).json(result);
});

// Confirm booking: POST /confirm { seatId, userId }
app.post('/confirm', (req, res) => {
  const { seatId, userId } = req.body || {};
  if (!seatId || !userId) return res.status(400).json({ message: 'seatId and userId are required' });

  const result = confirmSeat(String(seatId), String(userId));
  res.status(result.code).json(result);
});

// Optional: release a lock early (admin/user)
app.post('/unlock', (req, res) => {
  const { seatId, userId } = req.body || {};
  if (!seatId) return res.status(400).json({ message: 'seatId is required' });
  const seat = seats.get(String(seatId));
  if (!seat) return res.status(404).json({ message: 'Seat not found' });

  // allow unlock only by owner or admin (if userId === 'admin')
  if (seat.owner && seat.owner !== userId && userId !== 'admin') {
    return res.status(403).json({ message: 'Only owner or admin can unlock this seat' });
  }

  releaseLockInternal(String(seatId));
  res.json({ message: 'Lock released (if it existed) for seat ' + seatId });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Ticket booking server running on http://localhost:${PORT}`);
  if (process.argv.includes('--test')) {
    runConcurrentTest().catch(err => console.error(err));
  }
});

// ---------- Simulation code (runs when server started with --test) ----------
// This simulation sends concurrent lock requests to the server (using fetch) to demonstrate
// that only one user can lock a seat at a time.

async function runConcurrentTest() {
  // Wait a moment to ensure server is listening
  await new Promise(r => setTimeout(r, 200));
  console.log('\nRunning concurrent lock simulation...');

  const seatId = '1';
  const users = ['alice', 'bob', 'carol', 'dave'];
  const fetch = globalThis.fetch || (await import('node-fetch')).default;

  // Fire lock requests in parallel
  const promises = users.map(u =>
    fetch(`http://localhost:${PORT}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId, userId: u })
    }).then(r => r.json()).then(data => ({ user: u, data }))
  );

  const results = await Promise.all(promises);
  console.log('Results of concurrent lock attempts:');
  for (const r of results) console.log(r.user, JSON.stringify(r.data));

  // Attempt to confirm with the user who holds the lock (if any)
  const lockedBy = Object.values(serializeSeats())[seatId].owner;
  if (lockedBy) {
    console.log(`\nAttempting to confirm seat ${seatId} by its lock owner (${lockedBy})`);
    const resp = await fetch(`http://localhost:${PORT}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId, userId: lockedBy })
    });
    const j = await resp.json();
    console.log('Confirm response:', j);
  } else {
    console.log('No one managed to lock the seat in the simulation (unexpected)');
  }

  // Shutdown server after test
  server.close(() => {
    console.log('\nSimulation complete. Server shut down.');
  });
}

// Export functions for unit testing if needed
module.exports = { tryLockSeat, confirmSeat, releaseLockInternal, seats, serializeSeats };
