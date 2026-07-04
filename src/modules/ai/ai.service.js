import axios from 'axios';
import env from '../../config/env.js';
import logger from '../../config/logger.js';
import ApiError from '../../utils/ApiError.js';

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
  // Feature not configured at all — this is expected in some environments,
  // not a failure, so it stays silent (null suggestion, no error).
  if (!env.huggingFace.apiKey) return null;

  let response;
  try {
    const dataUrl = `data:${mimetype};base64,${fileBuffer.toString('base64')}`;
    response = await axios.post(
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
  } catch (err) {
    // The provider is configured but actually failed (network error, rate
    // limit, provider outage, etc.) — unlike the "not configured" case above,
    // this is a real failure the user should be told about rather than
    // silently getting no suggestion.
    logger.warn(`AI caption suggestion request failed: ${err.message}`);
    throw ApiError.serviceUnavailable(
      'The AI caption suggestion service is temporarily unavailable. Please try again shortly.'
    );
  }

  const content = response.data?.choices?.[0]?.message?.content;
  return typeof content === 'string' && content.trim() ? content.trim().replace(/^"|"$/g, '') : null;
};
