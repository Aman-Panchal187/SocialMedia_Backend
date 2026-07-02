import axios from 'axios';
import env from '../../config/env.js';
import logger from '../../config/logger.js';

const HF_MODEL_URL = 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base';

export const suggestCaption = async (fileBuffer, mimetype) => {
  if (!env.huggingFace.apiKey) return null;

  try {
    const response = await axios.post(HF_MODEL_URL, fileBuffer, {
      headers: {
        Authorization: `Bearer ${env.huggingFace.apiKey}`,
        'Content-Type': mimetype,
      },
      timeout: 10000,
    });

    const generatedText = response.data?.[0]?.generated_text;
    return typeof generatedText === 'string' && generatedText.trim() ? generatedText.trim() : null;
  } catch (err) {
    logger.warn(`AI caption suggestion unavailable: ${err.message}`);
    return null;
  }
};
