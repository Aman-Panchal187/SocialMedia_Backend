import axios from 'axios';
import env from '../config/env.js';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!env.brevo.apiKey || !env.brevo.senderEmail) {
    throw new Error('BREVO_API_KEY and BREVO_SENDER_EMAIL are required to send email');
  }

  await axios.post(
    BREVO_API_URL,
    {
      sender: { name: 'PhotoSphere', email: env.brevo.senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    },
    {
      headers: {
        'api-key': env.brevo.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      // Runs in the background (see auth.service.js) — no reason to let a
      // slow response hang around.
      timeout: 10000,
    }
  );
};

export const sendOtpEmail = async (to, code, purpose) => {
  const subjectMap = {
    email_verify: 'Verify your email',
    password_reset: 'Reset your password',
  };
  const subject = subjectMap[purpose] || 'Your verification code';
  const html = `<p>Your verification code is:</p><h2>${code}</h2><p>This code expires in 10 minutes.</p>`;
  return sendEmail({ to, subject, html, text: `Your verification code is ${code}. It expires in 10 minutes.` });
};
