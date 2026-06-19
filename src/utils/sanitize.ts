export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>'"&]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 500);
};

export const sanitizeNumber = (
  input: unknown,
  min = 0,
  max = 100000
): number => {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.min(Math.max(num, min), max);
};

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
    co2Kg: sanitizeNumber(data.co2Kg, 0, 10000),
    date: /^\d{4}-\d{2}-\d{2}$/.test(data.date)
      ? data.date
      : new Date().toISOString().split('T')[0]
  };
};
