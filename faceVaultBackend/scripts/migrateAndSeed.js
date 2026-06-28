// ── One-time migration + superadmin seed ─────────────────────────────────────
//
// Run this once after deploying the role/name changes:
//   node scripts/migrateAndSeed.js
//
// It does three safe, idempotent things:
//   1. Backfills firstName/lastName for users that only have the old `name`.
//   2. Ensures every user has a role (defaults to "user").
//   3. Creates (or promotes) the superadmin account.
//
// Re-running it is harmless: it skips users already migrated and won't create a
// duplicate superadmin.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

// ⚙️  Superadmin credentials — change the password after first login.
const SUPERADMIN = {
  email: 'superadmin@orbi.app',
  password: 'Orbi@Admin2026',
  firstName: 'Orbi',
  lastName: 'Admin',
  username: 'orbiadmin',
};

async function run() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log('Connected to DB');

  // ── 1 & 2: migrate names + roles for existing users ──────────────────────
  // We read raw docs so we can see who still lacks firstName.
  const users = await User.find({});
  let migrated = 0;

  for (const u of users) {
    let changed = false;

    if (!u.firstName) {
      // Split the old single name into first + rest.
      const parts = (u.name || '').trim().split(/\s+/);
      u.firstName = parts[0] || 'User';
      u.lastName = parts.slice(1).join(' ');
      changed = true;
    }
    if (!u.role) {
      u.role = 'user';
      changed = true;
    }
    if (changed) {
      await u.save(); // pre-save hook recomputes `name`
      migrated += 1;
    }
  }
  console.log(`Migrated ${migrated} existing user(s).`);

  // ── 3: create or promote the superadmin ──────────────────────────────────
  let admin = await User.findOne({ email: SUPERADMIN.email });
  if (admin) {
    admin.role = 'superadmin';
    admin.isVerified = true;
    admin.isBanned = false;
    await admin.save();
    console.log(`Superadmin already existed — ensured role/verified: ${SUPERADMIN.email}`);
  } else {
    const hashed = await bcrypt.hash(SUPERADMIN.password, 10);
    admin = await User.create({
      firstName: SUPERADMIN.firstName,
      lastName: SUPERADMIN.lastName,
      email: SUPERADMIN.email,
      password: hashed,
      username: SUPERADMIN.username,
      role: 'superadmin',
      isVerified: true, // skip OTP for the admin
    });
    console.log('✅ Superadmin created:');
    console.log(`   email:    ${SUPERADMIN.email}`);
    console.log(`   password: ${SUPERADMIN.password}`);
    console.log('   (change this password after first login)');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Migration/seed failed:', err);
  process.exit(1);
});
