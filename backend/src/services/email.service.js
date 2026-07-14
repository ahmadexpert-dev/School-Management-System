const { Resend } = require('resend');

// If RESEND_API_KEY isn't set, fall back to logging the email instead of
// sending it — same stub-by-default pattern as notification.service.js, so
// local dev works with zero config, and setting the key in .env is the only
// step needed to go live.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendEmail({ to, subject, html }) {
  if (!resend) {
    // eslint-disable-next-line no-console
    console.log(`[email-stub] To: ${to} | Subject: ${subject}\n${html}`);
    return { stubbed: true };
  }

  return resend.emails.send({
    from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
    to,
    subject,
    html,
  });
}

module.exports = { sendEmail };
