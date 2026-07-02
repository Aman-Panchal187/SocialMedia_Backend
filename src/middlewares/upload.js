import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const storage = multer.memoryStorage();

const IMAGE_MAGIC_BYTES = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
];

export const bufferMatchesImageMagicBytes = (buffer) =>
  IMAGE_MAGIC_BYTES.some((sig) => sig.bytes.every((byte, idx) => buffer[idx] === byte));

const AVATAR_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif'];
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: AVATAR_MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!AVATAR_ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(ApiError.badRequest('Avatar must be a JPG, PNG, or GIF image'));
    }
    return cb(null, true);
  },
}).single('avatar');

const POST_MEDIA_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];
const POST_MEDIA_MAX_SIZE_BYTES = 100 * 1024 * 1024;
const POST_MEDIA_MAX_COUNT = 10;

export const uploadPostMedia = multer({
  storage,
  limits: { fileSize: POST_MEDIA_MAX_SIZE_BYTES, files: POST_MEDIA_MAX_COUNT },
  fileFilter: (req, file, cb) => {
    if (!POST_MEDIA_ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported media type: ${file.mimetype}`));
    }
    return cb(null, true);
  },
}).array('media', POST_MEDIA_MAX_COUNT);

const CHAT_DOCUMENT_ALLOWED_MIMES = [
  'application/pdf',
  'application/zip',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const CHAT_ATTACHMENT_ALLOWED_MIMES = [...POST_MEDIA_ALLOWED_MIMES, ...CHAT_DOCUMENT_ALLOWED_MIMES];
const CHAT_ATTACHMENT_MAX_SIZE_BYTES = 50 * 1024 * 1024;

export const uploadChatAttachment = multer({
  storage,
  limits: { fileSize: CHAT_ATTACHMENT_MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!CHAT_ATTACHMENT_ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported attachment type: ${file.mimetype}`));
    }
    return cb(null, true);
  },
}).single('attachment');

export const uploadStoryMedia = multer({
  storage,
  limits: { fileSize: POST_MEDIA_MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!POST_MEDIA_ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported media type: ${file.mimetype}`));
    }
    return cb(null, true);
  },
}).single('media');

const CAPTION_MEDIA_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const uploadCaptionMedia = multer({
  storage,
  limits: { fileSize: CAPTION_MEDIA_MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!AVATAR_ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(ApiError.badRequest('Image must be a JPG, PNG, or GIF'));
    }
    return cb(null, true);
  },
}).single('media');
