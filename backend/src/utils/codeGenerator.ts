/**
 * Generate a random 6-character alphanumeric code
 */
export const generateInviteCode = (): string => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking characters
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  
  return code;
};

/**
 * Check if code is expired
 */
export const isCodeExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

/**
 * Get code expiration date (15 minutes from now)
 */
export const getCodeExpiration = (): Date => {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + 15);
  return expiration;
};

/**
 * Get remaining time for code expiration
 */
export const getRemainingTime = (expiresAt: Date): number => {
  const now = new Date();
  const remaining = expiresAt.getTime() - now.getTime();
  return Math.max(0, remaining);
};

/**
 * Format remaining time as human readable
 */
export const formatRemainingTime = (expiresAt: Date): string => {
  const remaining = getRemainingTime(expiresAt);
  const minutes = Math.floor(remaining / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};
