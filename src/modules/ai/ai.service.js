import axios from 'axios';
import env from '../../config/env.js';
import logger from '../../config/logger.js';

// Hugging Face retired the classic dedicated image-captioning models
// (Salesforce/blip-*, etc.) from its serverless Inference API — none of them
// carry an inferenceProviderMapping any more. Captioning now has to go
// through a vision-capable chat model over the router's OpenAI-compatible
// chat-completions endpoint instead of the old single-purpose endpoint.
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_VISION_MODEL = 'google/gemma-3-4b-it';
const PROMPT =
  'Write one short, engaging Instagram caption for this image (no hashtags, no quotes around it). Reply with only the caption text.';

export const suggestCaption = async (fileBuffer, mimetype) => {
  if (!env.huggingFace.apiKey) return null;

  try {
    const dataUrl = `data:${mimetype};base64,${fileBuffer.toString('base64')}`;
    const response = await axios.post(
      HF_ROUTER_URL,
      {
        model: HF_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 60,
      },
      {
        headers: {
          Authorization: `Bearer ${env.huggingFace.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.trim() ? content.trim().replace(/^"|"$/g, '') : null;
  } catch (err) {
    logger.warn(`AI caption suggestion unavailable: ${err.message}`);
    return null;
  }
};
