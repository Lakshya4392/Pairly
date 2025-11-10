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
 * Get code expiration date (24 hours from now)
 */
export const getCodeExpiration = (): Date => {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 24);
  return expiration;
};
