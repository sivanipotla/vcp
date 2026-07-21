// Email stub. In production, replace `transport` with a real SMTP/SendGrid/SES config,
// e.g. nodemailer.createTransport({ host, port, auth: { user, pass } })
const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  jsonTransport: true, // captures the "sent" email instead of actually sending it
});

async function sendMail({ to, subject, text }) {
  const info = await transport.sendMail({ from: 'no-reply@vcp-mvp.local', to, subject, text });
  console.log(`\n[mailer] Email "sent" to ${to}\n  Subject: ${subject}\n  Body: ${text}\n`);
  return info;
}

module.exports = { sendMail };
