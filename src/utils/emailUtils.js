import axios from 'axios';
import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../config/logger.js';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const sendViaBrevo = async ({ to, subject, html, text }) => {
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
      // Brevo's API is plain HTTPS, but keep a sane timeout regardless —
      // this now runs in the background (see auth.service.js), so there's
      // no reason to let a slow response hang around.
      timeout: 10000,
    }
  );
};

let transporterPromise = null;

const buildTransporter = async () => {
  const hasRealSmtp = env.smtp.host && env.smtp.user && env.smtp.pass;

  if (hasRealSmtp) {
    return nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port || 587,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      // Nodemailer's defaults (2min connection, 10min socket) are far too
      // long for something now sent in the background — fail fast instead
      // of leaving a doomed connection attempt hanging on hosts that
      // throttle or block outbound SMTP.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  if (env.isProduction) {
    throw new Error('BREVO_API_KEY or SMTP credentials are required in production');
  }

  const testAccount = await nodemailer.createTestAccount();
  logger.info(
    `No SMTP credentials configured — using Ethereal test account (${testAccount.user}) for dev email delivery`
  );
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
};

const getTransporter = () => {
  if (!transporterPromise) {
    transporterPromise = buildTransporter();
  }
  return transporterPromise;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  if (env.brevo.apiKey && env.brevo.senderEmail) {
    await sendViaBrevo({ to, subject, html, text });
    return;
  }

  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: '"PhotoSphere" <no-reply@photosphere.local>',
    to,
    subject,
    text,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info(`Email preview URL (Ethereal): ${previewUrl}`);
  }
  return info;
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
