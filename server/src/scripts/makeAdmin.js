// Usage: npm run make-admin -- user@example.com
const db = require('../db');

const email = (process.argv[2] || '').toLowerCase();
if (!email) {
  console.error('Usage: npm run make-admin -- user@example.com');
  process.exit(1);
}

const user = db.get('users').find({ email }).value();
if (!user) {
  console.error(`No user found with email ${email}`);
  process.exit(1);
}

db.get('users').find({ email }).assign({ role: 'admin' }).write();
console.log(`${email} is now an admin.`);
