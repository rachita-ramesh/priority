import { OPENAI_API_KEY as ENV_OPENAI_API_KEY } from '@env';

/**
 * Access environment variables safely
 * This provides a central place to handle missing env vars
 */

// Helper function to get env var with fallback and optional warning
const getEnvVar = (name: string, value: string | undefined, fallback: string = '', warn: boolean = true): string => {
  const result = value || fallback;
  if (!result && warn) {
    console.warn(`Environment variable ${name} is not set, using fallback value`);
  }
  return result;
};

// Export environment variables
export const OPENAI_API_KEY = getEnvVar('OPENAI_API_KEY', ENV_OPENAI_API_KEY, '');

// Helpers for checking environment status
export const hasOpenAIKey = !!OPENAI_API_KEY; 