import crypto from 'crypto';
import db from '../db/database';
import { AuditEntry, AuditVerificationResult } from '../types';

/**
 * Computes a SHA-256 hash for an audit trail record.
 * The hash chain links each entry to the previous one via prev_hash,
 * creating a tamper-evident log.
 *
 * NOTE: This is a simplified hash chain for demonstration purposes.
 * It is NOT a true blockchain — there is no distributed consensus,
 * no proof-of-work, and the database admin could still tamper with
 * entries if they recalculate the hashes. For production use, consider
 * an append-only database, external timestamping, or a proper
 * distributed ledger.
 *
 * @param prevHash - Hash of the previous audit entry, or "GENESIS" for the first
 * @param complaintId - ID of the related complaint
 * @param userId - ID of the user who performed the action
 * @param action - Description of the action taken
 * @param details - Additional details about the action
 * @param timestamp - ISO timestamp of the action
 * @returns SHA-256 hex digest of the concatenated fields
 */
function computeHash(
  prevHash: string,
  complaintId: number,
  userId: number,
  action: string,
  details: string | null,
  timestamp: string
): string {
  const data = `${prevHash}|${complaintId}|${userId}|${action}|${details}|${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Creates an audit trail entry with hash chain integrity.
 * Each entry's hash includes the previous entry's hash, forming an
 * append-only chain that makes tampering detectable.
 *
 * @param complaintId - ID of the complaint being audited
 * @param userId - ID of the user performing the action
 * @param action - Action description (e.g. "status_change", "comment_added")
 * @param details - Optional JSON or text details about the action
 */
export function createAuditEntry(
  complaintId: number,
  userId: number,
  action: string,
  details: string | null = null
): void {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Get the last audit entry for this complaint to form the chain
  const lastEntry = db.prepare(
    'SELECT record_hash FROM audit_trail WHERE complaint_id = ? ORDER BY id DESC LIMIT 1'
  ).get(complaintId) as { record_hash: string } | undefined;

  const prevHash = lastEntry ? lastEntry.record_hash : 'GENESIS';
  const recordHash = computeHash(prevHash, complaintId, userId, action, details, timestamp);

  db.prepare(
    `INSERT INTO audit_trail (complaint_id, user_id, action, details, prev_hash, record_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(complaintId, userId, action, details, prevHash, recordHash, timestamp);
}

/**
 * Verifies the integrity of the audit trail hash chain for a given complaint.
 * Walks through every entry in order and re-computes each hash, checking it
 * matches the stored hash and that prev_hash links are consistent.
 *
 * NOTE: This only verifies internal consistency. If an attacker has full
 * database access, they could rewrite the entire chain. External anchoring
 * (e.g., periodic hash publication) would be needed for stronger guarantees.
 *
 * @param complaintId - ID of the complaint whose audit chain to verify
 * @returns Verification result with validity flag, entry count, and break point if invalid
 */
export function verifyAuditChain(complaintId: number): AuditVerificationResult {
  const entries = db.prepare(
    'SELECT * FROM audit_trail WHERE complaint_id = ? ORDER BY id ASC'
  ).all(complaintId) as AuditEntry[];

  if (entries.length === 0) {
    return { valid: true, entries: 0 };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPrevHash = i === 0 ? 'GENESIS' : entries[i - 1].record_hash;

    // Check prev_hash linkage
    if (entry.prev_hash !== expectedPrevHash) {
      return { valid: false, entries: entries.length, brokenAt: i };
    }

    // Recompute and verify the record hash
    const recomputedHash = computeHash(
      expectedPrevHash,
      entry.complaint_id,
      entry.user_id,
      entry.action,
      entry.details,
      entry.created_at
    );

    if (recomputedHash !== entry.record_hash) {
      return { valid: false, entries: entries.length, brokenAt: i };
    }
  }

  return { valid: true, entries: entries.length };
}

export { computeHash };
