const nodemailer = require('nodemailer');

const host = process.env.EMAIL_HOST;
const port = Number(process.env.EMAIL_PORT || 587);
const user = process.env.AUTH_EMAIL || process.env.EMAIL_USER;
const pass = process.env.AUTH_PASS || process.env.EMAIL_PASS;

const transporter = host && user && pass
  ? nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  : null;

const getFromAddress = () => process.env.EMAIL_FROM || user;

const sendMail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    throw new Error('Email transport is not configured');
  }

  return transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  });
};

module.exports = { sendMail };
