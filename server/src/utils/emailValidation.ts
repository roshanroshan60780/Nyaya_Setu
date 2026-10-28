import crypto from 'node:crypto';

const OTP_SECRET = process.env.JWT_SECRET || 'nyayasetu-otp-secret-salt';

/**
 * Normalizes email address by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Strictly validates that an email belongs to the exact MNNIT domain: 'mnnit.ac.in'.
 * 
 * Rules:
 * - Must contain exactly one '@'
 * - Domain must strictly equal 'mnnit.ac.in' (subdomains like 'sub.mnnit.ac.in' and suffixes like 'mnnit.ac.in.com' are rejected)
 * - Local part must be standard compliant (1-64 chars, valid RFC characters, no leading/trailing/consecutive dots)
 */
export function isValidMNNITEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = normalizeEmail(email);

  // Must have exactly one '@'
  const parts = normalized.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domainPart] = parts;
  if (!localPart || !domainPart) return false;

  // Domain MUST strictly equal 'mnnit.ac.in'
  if (domainPart !== 'mnnit.ac.in') return false;

  // Local part validation
  if (localPart.length > 64) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return false;
  }

  // RFC standard compliant local part characters: alphanumeric and allowed symbols
  const localPartRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
  return localPartRegex.test(localPart);
}

/**
 * Generates a cryptographically random 6-digit OTP string.
 */
export function generateOTP(): string {
  // randomInt generates an integer in [100000, 1000000)
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP string securely using HMAC-SHA256 with the server secret.
 * Plaintext OTPs are never stored in the database.
 */
export function hashOTP(otp: string): string {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(otp)
    .digest('hex');
}

/**
 * Validates a submitted OTP against the stored HMAC hash using constant-time comparison.
 */
export function verifyOTPHash(otp: string, storedHash: string): boolean {
  if (!otp || !storedHash) return false;
  const computedHash = hashOTP(otp);
  if (computedHash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash));
}
