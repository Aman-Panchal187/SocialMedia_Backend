import bcrypt from 'bcrypt';

export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

export const hashOtpCode = (code) => bcrypt.hash(code, 12);

export const compareOtpCode = (code, hash) => bcrypt.compare(code, hash);

export const getOtpExpiryDate = () => new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
