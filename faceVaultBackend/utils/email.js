const { Resend } = require('resend');

// ── Email sending (Resend) ──────────────────────────────────────────────────
//
// We use Resend to email signup OTP codes. The API key and "from" address come
// from environment variables (.env):
//   RESEND_API_KEY  → your Resend API key (starts with "re_...")
//   EMAIL_FROM      → the sender, e.g. "Orbi <onboarding@resend.dev>"
//
// NOTE: with Resend's test sender (onboarding@resend.dev) emails only deliver
// to your own Resend account email. Verify a domain in Resend to email anyone.

const FROM = process.env.EMAIL_FROM || 'Orbi <onboarding@resend.dev>';

// Create the Resend client lazily (only when we actually send), so the server
// can still boot if RESEND_API_KEY isn't set — we just fail the send with a
// clear message instead of crashing on startup.
let resendClient = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Email is not configured (RESEND_API_KEY is missing).');
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

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

// Send the OTP code to a user's email.
async function sendOtpEmail(to, code) {
  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: `${code} is your Orbi verification code`,
    html: otpEmailHtml(code),
  });

  if (error) {
    // Surface a clear error so the controller can respond appropriately.
    throw new Error(error.message || 'Failed to send verification email');
  }
}

module.exports = { generateOtp, sendOtpEmail };
