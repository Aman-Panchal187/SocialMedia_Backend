import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../config/logger.js';

let transporterPromise = null;

const buildTransporter = async () => {
  const hasRealSmtp = env.smtp.host && env.smtp.user && env.smtp.pass;

  if (hasRealSmtp) {
    return nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port || 587,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }

  if (env.isProduction) {
    throw new Error('SMTP credentials are required in production');
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
