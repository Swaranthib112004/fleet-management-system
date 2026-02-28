const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  return transporter;
}

exports.sendEmail = async (to, subject, text, html) => {
  const t = getTransporter();
  const info = await t.sendMail({ from: process.env.SMTP_FROM || 'no-reply@fleet.local', to, subject, text, html });
  return info;
};