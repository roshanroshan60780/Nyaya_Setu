/**
 * Normalizes email address by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Validates that an email belongs strictly to the exact MNNIT domain: 'mnnit.ac.in'.
 * Rejects other domains (@gmail.com, @mnnit.edu.in), subdomains (@cs.mnnit.ac.in),
 * and domain suffixes (@mnnit.ac.in.com).
 */
export function isValidMNNITEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = normalizeEmail(email);

  const parts = normalized.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domainPart] = parts;
  if (!localPart || !domainPart) return false;

  // Domain must strictly be 'mnnit.ac.in'
  if (domainPart !== 'mnnit.ac.in') return false;

  if (localPart.length > 64) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return false;
  }

  const localPartRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
  return localPartRegex.test(localPart);
}
