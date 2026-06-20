/**
 * Strips HTML tags and dangerous characters from user input.
 * Prevents XSS attacks in form submissions.
 * @param input - Raw string from user input
 * @returns Sanitized string, max 500 characters
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>'"&]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 500);
};

/**
 * Validates and clamps a numeric value within safe bounds.
 * Returns 0 for NaN, Infinity, or values outside range.
 * @param input - Raw value to sanitize
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (default: 100000)
 * @returns Safe numeric value within bounds
 */
export const sanitizeNumber = (
  input: unknown,
  min = 0,
  max = 100000
): number => {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.min(Math.max(num, min), max);
};

/**
 * Sanitizes user input for Gemini API prompts.
 * Blocks prompt injection and jailbreak attempts.
 * @param input - Raw user message
 * @returns Clean prompt string, max 1000 characters
 */
export const sanitizeGeminiPrompt = (
  input: string
): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/ignore (previous|above|prior)/gi, '')
    .replace(/system prompt/gi, '')
    .replace(/you are now/gi, '')
    .replace(/jailbreak/gi, '')
    .replace(/bypass/gi, '')
    .trim()
    .slice(0, 1000);
};

/**
 * Validates and sanitizes a complete activity log entry.
 * Throws if category is invalid. Clamps all numeric values.
 * @param data - Raw activity data from form submission
 * @returns Sanitized activity object safe for Firestore write
 * @throws Error if category is not in allowed list
 */
export const sanitizeActivityInput = (data: {
  category: string;
  activityType: string;
  quantity: number;
  unit: string;
  co2Kg: number;
  date: string;
}) => {
  const allowedCategories = [
    'transport', 'food', 'energy', 'shopping'
  ];
  const allowedUnits = [
    'km', 'serving', 'kWh', 'kg', 'hours', 'items'
  ];

  if (!allowedCategories.includes(data.category)) {
    throw new Error('Invalid activity category');
  }

  return {
    category: data.category,
    activityType: sanitizeString(data.activityType)
      .slice(0, 50),
    quantity: sanitizeNumber(data.quantity, 0.01, 10000),
    unit: allowedUnits.includes(data.unit)
      ? data.unit : 'items',
    co2Kg: sanitizeNumber(data.co2Kg, 0, 100000),
    date: /^\d{4}-\d{2}-\d{2}$/.test(data.date)
      ? data.date : new Date().toISOString().split('T')[0]
  };
};
