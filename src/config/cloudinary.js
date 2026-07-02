import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import env from './env.js';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

export const uploadBufferToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });

export const destroyCloudinaryAsset = (publicId, options = {}) =>
  cloudinary.uploader.destroy(publicId, options);

export default cloudinary;
