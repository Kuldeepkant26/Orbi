// ── Email sending (Brevo) ────────────────────────────────────────────────────
//
// We use Brevo (https://www.brevo.com) to email signup OTP codes. Unlike a
// domain-based sender, Brevo lets you verify a SINGLE sender email (e.g. your
// own Gmail) and then send to ANY recipient — no domain purchase needed.
//
// Environment variables (.env):
//   BREVO_API_KEY    → your Brevo API key (Brevo dashboard → SMTP & API → API Keys)
//   EMAIL_FROM       → the verified sender address, e.g. "you@gmail.com"
//   EMAIL_FROM_NAME  → the display name shown to recipients (default "Orbi")
//
// We call Brevo's REST API directly with fetch (built into Node 20+), so there's
// no SDK to install. If the API key is missing we throw a clear error instead of
// crashing the server.

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

const FROM_EMAIL = process.env.EMAIL_FROM || '';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Orbi';

// Generate a random 6-digit code as a string (e.g. "042913").
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// A simple, premium-looking email body (black text on white, big code).
function otpEmailHtml(code) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 440px; margin: 0 auto; padding: 32px 24px; color: #0A0A0A;">
    <h1 style="font-size: 24px; font-weight: 800; letter-spacing: 0.5px; margin: 0 0 8px;">Orbi</h1>
    <p style="font-size: 15px; color: #6B6B6B; margin: 0 0 24px;">Confirm your email to finish creating your account.</p>
    <div style="background: #FAFAF8; border: 1px solid #ECECEC; border-radius: 12px; padding: 24px; text-align: center;">
      <p style="font-size: 13px; color: #6B6B6B; margin: 0 0 8px;">Your verification code</p>
      <p style="font-size: 36px; font-weight: 800; letter-spacing: 8px; margin: 0;">${code}</p>
    </div>
    <p style="font-size: 13px; color: #9A9A9A; margin: 24px 0 0;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
  </div>`;
}

// Shared Brevo send call — used for both signup verification and password
// reset emails, which only differ in subject line and intro copy.
async function sendEmail(to, subject, htmlContent, failureContext) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('Email is not configured (BREVO_API_KEY is missing).');
  }
  if (!FROM_EMAIL) {
    throw new Error('Email is not configured (EMAIL_FROM is missing).');
  }

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    // Brevo returns a JSON error body; surface its message so the controller
    // can respond clearly.
    let detail = '';
    try {
      const data = await res.json();
      detail = data.message || JSON.stringify(data);
    } catch {
      detail = `HTTP ${res.status}`;
    }
    throw new Error(`Failed to send ${failureContext} email: ${detail}`);
  }
}

// Send the OTP code to a user's email via Brevo.
async function sendOtpEmail(to, code) {
  await sendEmail(
    to,
    `${code} is your Orbi verification code`,
    otpEmailHtml(code),
    'verification',
  );
}

// A password-reset variant of the OTP template — same layout, different copy
// so users don't confuse it with account verification.
function passwordResetEmailHtml(code) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 440px; margin: 0 auto; padding: 32px 24px; color: #0A0A0A;">
    <h1 style="font-size: 24px; font-weight: 800; letter-spacing: 0.5px; margin: 0 0 8px;">Orbi</h1>
    <p style="font-size: 15px; color: #6B6B6B; margin: 0 0 24px;">Use this code to reset your password.</p>
    <div style="background: #FAFAF8; border: 1px solid #ECECEC; border-radius: 12px; padding: 24px; text-align: center;">
      <p style="font-size: 13px; color: #6B6B6B; margin: 0 0 8px;">Your password reset code</p>
      <p style="font-size: 36px; font-weight: 800; letter-spacing: 8px; margin: 0;">${code}</p>
    </div>
    <p style="font-size: 13px; color: #9A9A9A; margin: 24px 0 0;">This code expires in 10 minutes. If you didn't request it, you can ignore this email — your password will not be changed.</p>
  </div>`;
}

// Send the password-reset OTP code to a user's email via Brevo.
async function sendPasswordResetEmail(to, code) {
  await sendEmail(
    to,
    `${code} is your Orbi password reset code`,
    passwordResetEmailHtml(code),
    'password reset',
  );
}

module.exports = { generateOtp, sendOtpEmail, sendPasswordResetEmail };
