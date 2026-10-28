import bcrypt from 'bcryptjs';
import db from './database';
import { migrate } from './migrate';
import { computeHash } from '../utils/audit';

/**
 * Idempotent Seed script for NyayaSetu demo data.
 * 
 * Safety & Integrity Guarantees:
 * - Does NOT drop or clear existing database tables or records.
 * - Idempotent: safe to run multiple times without creating duplicate users or complaints.
 * - Preserves existing accounts and does not overwrite modified user passwords.
 * - Seeds official @mnnit.ac.in demo accounts and marks them verified for local evaluation.
 * - Seeds realistic fictional complaints across all statuses with intact SHA-256 audit chains.
 */
function seed(): void {
  console.log('🌱 Checking and seeding NyayaSetu demo dataset (idempotent)...\n');

  // Ensure migrations have created tables and indexes
  migrate();

  const salt = bcrypt.genSaltSync(12);

  // Helper to ensure user exists idempotently
  function ensureUser(
    email: string,
    name: string,
    defaultPassword: string,
    role: 'student' | 'admin',
    department: string | null
  ): number {
    const existing = db.prepare('SELECT id, is_verified FROM users WHERE email = ?').get(email) as
      | { id: number; is_verified: number }
      | undefined;

    if (existing) {
      if (existing.is_verified !== 1) {
        db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(existing.id);
      }
      return existing.id;
    }

    const passwordHash = bcrypt.hashSync(defaultPassword, salt);
    const result = db.prepare(`
      INSERT INTO users (email, name, password_hash, role, department, is_verified)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(email, name, passwordHash, role, department);

    return result.lastInsertRowid as number;
  }

  // ─── 1. SEED USERS ──────────────────────────────────────────────────────────
  console.log('👥 Ensuring demo accounts exist...');

  // MNNIT Authority Account
  const mnnitAdminId = ensureUser(
    'admin@mnnit.ac.in',
    'Dr. Alok Srivastava',
    'Admin@123',
    'admin',
    'Dean Student Welfare'
  );

  // MNNIT Student Accounts
  const mnnitStudent1Id = ensureUser(
    'student1@mnnit.ac.in',
    'Aarav Sharma',
    'Student@123',
    'student',
    'Computer Science and Engineering'
  );

  const mnnitStudent2Id = ensureUser(
    'student2@mnnit.ac.in',
    'Ananya Patel',
    'Student@123',
    'student',
    'Electronics and Communication'
  );

  const mnnitStudent3Id = ensureUser(
    'student3@mnnit.ac.in',
    'Rohan Verma',
    'Student@123',
    'student',
    'Mechanical Engineering'
  );

  // Baseline Demo Accounts (for regression test compatibility)
  const legacyAdminId = ensureUser(
    'admin@nyayasetu.edu.in',
    'Dr. Rajesh Verma',
    'Admin@123',
    'admin',
    'Administration'
  );

  const legacyCoordId = ensureUser(
    'coordinator@nyayasetu.edu.in',
    'Prof. Sunita Sharma',
    'Coord@123',
    'admin',
    'Student Affairs'
  );

  const legacyStudent1Id = ensureUser(
    'rahul.sharma@student.edu.in',
    'Rahul Sharma',
    'Student@123',
    'student',
    'Computer Science'
  );

  const legacyStudent2Id = ensureUser(
    'priya.patel@student.edu.in',
    'Priya Patel',
    'Student@123',
    'student',
    'Electronics'
  );

  const legacyStudent3Id = ensureUser(
    'amit.kumar@student.edu.in',
    'Amit Kumar',
    'Student@123',
    'student',
    'Mechanical Engineering'
  );

  console.log('  ✅ Demo user accounts verified.');

  // ─── 2. SEED REALISTIC COMPLAINTS & AUDIT LOGS ──────────────────────────────
  console.log('📝 Ensuring realistic fictional complaints and audit trails exist...');

  interface SeedComplaintItem {
    userId: number;
    title: string;
    description: string;
    category: 'academic' | 'infrastructure' | 'administrative' | 'hostel' | 'financial' | 'other';
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
    assignedTo: number | null;
    createdAt: string;
    updatedAt: string;
    escalatedAt: string | null;
    resolutionNotes: string | null;
    comments?: Array<{ userId: number; content: string; createdAt: string }>;
  }

  const complaintsToSeed: SeedComplaintItem[] = [
    {
      userId: mnnitStudent1Id,
      title: 'Hostel water supply disruption in SVBH Block C',
      description: 'The overhead water supply in SVBH (Swami Vivekananda Boys Hostel) Block C 2nd floor has been erratic for the past 3 days with zero flow during morning peak hours.',
      category: 'hostel',
      priority: 'critical',
      status: 'in_progress',
      assignedTo: mnnitAdminId,
      createdAt: '2026-10-20 08:30:00',
      updatedAt: '2026-10-21 10:15:00',
      escalatedAt: null,
      resolutionNotes: null,
      comments: [
        {
          userId: mnnitAdminId,
          content: 'Plumbing contractor notified. Water pump inspection is currently underway.',
          createdAt: '2026-10-21 10:15:00',
        },
      ],
    },
    {
      userId: mnnitStudent2Id,
      title: 'Central Library 2nd floor air-conditioning failure',
      description: 'The central air conditioning in the reading hall on the 2nd floor of Central Library is non-functional, causing high ambient temperature and humidity during afternoon study hours.',
      category: 'infrastructure',
      priority: 'high',
      status: 'open',
      assignedTo: null,
      createdAt: '2026-10-25 14:00:00',
      updatedAt: '2026-10-25 14:00:00',
      escalatedAt: null,
      resolutionNotes: null,
    },
    {
      userId: mnnitStudent3Id,
      title: 'Classroom projector malfunction in Computer Center CC-3',
      description: 'The ceiling mounted projector in CC-3 displays severe color distortion and powers off unexpectedly after 10 minutes of lecture presentation.',
      category: 'academic',
      priority: 'medium',
      status: 'resolved',
      assignedTo: mnnitAdminId,
      createdAt: '2026-10-15 11:20:00',
      updatedAt: '2026-10-18 16:45:00',
      escalatedAt: null,
      resolutionNotes: 'HDMI connection unit and lamp bulb replaced by IT Support. Verified in test projection.',
      comments: [
        {
          userId: mnnitAdminId,
          content: 'Hardware vendor replaced the projector lamp. Faculty verified regular display operation.',
          createdAt: '2026-10-18 16:45:00',
        },
      ],
    },
    {
      userId: mnnitStudent1Id,
      title: 'Campus Wi-Fi connectivity dropouts in Raman Hostel',
      description: 'Access Point AP-R2 on the 1st floor of Raman Hostel repeatedly drops client connections during evening hours, preventing access to digital course portals.',
      category: 'other',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: legacyCoordId,
      createdAt: '2026-10-22 19:40:00',
      updatedAt: '2026-10-23 09:30:00',
      escalatedAt: null,
      resolutionNotes: null,
      comments: [
        {
          userId: legacyCoordId,
          content: 'Computer Center network team scheduled to reflash AP firmware.',
          createdAt: '2026-10-23 09:30:00',
        },
      ],
    },
    {
      userId: mnnitStudent2Id,
      title: 'Mess food hygiene & sanitation inspection request in KNGH',
      description: 'Students in Kamala Nehru Girls Hostel have reported undercooked food and poor washing hygiene in the dining hall over the past week.',
      category: 'hostel',
      priority: 'high',
      status: 'open',
      assignedTo: null,
      createdAt: '2026-10-26 20:10:00',
      updatedAt: '2026-10-26 20:10:00',
      escalatedAt: null,
      resolutionNotes: null,
    },
    {
      userId: mnnitStudent3Id,
      title: 'Streetlight failure near Mega Hostel Main Gate',
      description: 'Two pole-mounted streetlights along the walkway leading from Mega Hostel to the main academic quadrant are completely dark, creating safety concerns at night.',
      category: 'infrastructure',
      priority: 'low',
      status: 'closed',
      assignedTo: mnnitAdminId,
      createdAt: '2026-10-10 18:00:00',
      updatedAt: '2026-10-14 11:00:00',
      escalatedAt: null,
      resolutionNotes: 'Estate department installed new LED fixtures. Pathway illumination restored and inspected.',
    },
    {
      userId: mnnitStudent1Id,
      title: 'Delay in issuing semester grade sheets for 6th semester',
      description: 'Grade sheets for the Even Semester have been pending distribution for over 45 days, delaying internship onboarding documentation.',
      category: 'administrative',
      priority: 'high',
      status: 'escalated',
      assignedTo: mnnitAdminId,
      createdAt: '2026-09-28 10:00:00',
      updatedAt: '2026-10-12 09:00:00',
      escalatedAt: '2026-10-12 09:00:00',
      resolutionNotes: null,
    },
    {
      userId: mnnitStudent2Id,
      title: 'Laboratory oscilloscope calibration error in Electrical Machines Lab',
      description: 'Oscilloscopes at workbenches 4 and 7 in the Electrical Department Machines Lab display a persistent DC offset voltage that disrupts measurement accuracy.',
      category: 'academic',
      priority: 'medium',
      status: 'open',
      assignedTo: null,
      createdAt: '2026-10-27 15:30:00',
      updatedAt: '2026-10-27 15:30:00',
      escalatedAt: null,
      resolutionNotes: null,
    },
    {
      userId: mnnitStudent3Id,
      title: 'Scholarship disbursement delay for odd semester 2024-25',
      description: 'The institute merit scholarship stipend credited on portal has not reached beneficiary bank account ending in 9102.',
      category: 'financial',
      priority: 'high',
      status: 'in_progress',
      assignedTo: mnnitAdminId,
      createdAt: '2026-10-19 11:00:00',
      updatedAt: '2026-10-24 14:00:00',
      escalatedAt: null,
      resolutionNotes: null,
      comments: [
        {
          userId: mnnitAdminId,
          content: 'Finance section is cross-referencing IFSC code with Canara Bank branch.',
          createdAt: '2026-10-24 14:00:00',
        },
      ],
    },
    {
      userId: mnnitStudent1Id,
      title: 'Non-functional water cooler on 1st Floor Mechanical Dept',
      description: 'The refrigerated drinking water cooler on the 1st floor hallway of the Mechanical Engineering Department does not dispense cold water.',
      category: 'infrastructure',
      priority: 'medium',
      status: 'resolved',
      assignedTo: mnnitAdminId,
      createdAt: '2026-10-14 12:15:00',
      updatedAt: '2026-10-19 15:30:00',
      escalatedAt: null,
      resolutionNotes: 'Compressor cooling unit repaired and serviced. Water temperature verified normal.',
    },
    {
      userId: mnnitStudent2Id,
      title: 'Sports complex outdoor badminton court floodlight replacement',
      description: 'One of the four halogen floodlights illuminating the outdoor badminton court failed during evening recreational play.',
      category: 'infrastructure',
      priority: 'low',
      status: 'closed',
      assignedTo: legacyCoordId,
      createdAt: '2026-10-08 17:30:00',
      updatedAt: '2026-10-12 16:00:00',
      escalatedAt: null,
      resolutionNotes: 'Replacement 200W LED floodlight installed and angled by maintenance staff.',
    },
    {
      userId: mnnitStudent3Id,
      title: 'Urgent migration certificate request for postgraduate admission',
      description: 'Application for inter-university migration certificate submitted on 5th September. Official verification required before the upcoming admission counseling deadline.',
      category: 'administrative',
      priority: 'critical',
      status: 'escalated',
      assignedTo: mnnitAdminId,
      createdAt: '2026-09-25 09:30:00',
      updatedAt: '2026-10-08 10:00:00',
      escalatedAt: '2026-10-08 10:00:00',
      resolutionNotes: null,
    },
  ];

  let seededComplaintsCount = 0;

  for (const item of complaintsToSeed) {
    const existing = db.prepare('SELECT id FROM complaints WHERE title = ?').get(item.title) as
      | { id: number }
      | undefined;

    if (existing) {
      continue;
    }

    const insertResult = db.prepare(`
      INSERT INTO complaints (user_id, title, description, category, priority, status, assigned_to, created_at, updated_at, escalated_at, resolution_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.userId,
      item.title,
      item.description,
      item.category,
      item.priority,
      item.status,
      item.assignedTo,
      item.createdAt,
      item.updatedAt,
      item.escalatedAt,
      item.resolutionNotes
    );

    const complaintId = insertResult.lastInsertRowid as number;
    seededComplaintsCount++;

    // Construct valid cryptographic hash chain for this complaint
    let prevHash = 'GENESIS';

    // Genesis audit entry
    const genesisDetails = JSON.stringify({
      title: item.title,
      category: item.category,
      priority: item.priority,
    });
    const genesisHash = computeHash(prevHash, complaintId, item.userId, 'complaint_created', genesisDetails, item.createdAt);
    db.prepare(`
      INSERT INTO audit_trail (complaint_id, user_id, action, details, prev_hash, record_hash, created_at)
      VALUES (?, ?, 'complaint_created', ?, ?, ?, ?)
    `).run(complaintId, item.userId, genesisDetails, prevHash, genesisHash, item.createdAt);
    prevHash = genesisHash;

    // Assignment audit entry if assigned
    if (item.assignedTo) {
      const assignDetails = JSON.stringify({ assigned_to: item.assignedTo });
      const assignHash = computeHash(prevHash, complaintId, item.assignedTo, 'complaint_assigned', assignDetails, item.updatedAt);
      db.prepare(`
        INSERT INTO audit_trail (complaint_id, user_id, action, details, prev_hash, record_hash, created_at)
        VALUES (?, ?, 'complaint_assigned', ?, ?, ?, ?)
      `).run(complaintId, item.assignedTo, assignDetails, prevHash, assignHash, item.updatedAt);
      prevHash = assignHash;
    }

    // Status changed audit entry if non-open
    if (item.status !== 'open') {
      const statusDetails = JSON.stringify({
        from: 'open',
        to: item.status,
        resolution_notes: item.resolutionNotes,
      });
      const statusHash = computeHash(prevHash, complaintId, item.assignedTo || item.userId, 'status_changed', statusDetails, item.updatedAt);
      db.prepare(`
        INSERT INTO audit_trail (complaint_id, user_id, action, details, prev_hash, record_hash, created_at)
        VALUES (?, ?, 'status_changed', ?, ?, ?, ?)
      `).run(complaintId, item.assignedTo || item.userId, statusDetails, prevHash, statusHash, item.updatedAt);
      prevHash = statusHash;
    }

    // Comments
    if (item.comments && item.comments.length > 0) {
      for (const comment of item.comments) {
        db.prepare(`
          INSERT INTO comments (complaint_id, user_id, content, created_at)
          VALUES (?, ?, ?, ?)
        `).run(complaintId, comment.userId, comment.content, comment.createdAt);

        const commentDetails = JSON.stringify({ content_preview: comment.content.slice(0, 50) });
        const commentHash = computeHash(prevHash, complaintId, comment.userId, 'comment_added', commentDetails, comment.createdAt);
        db.prepare(`
          INSERT INTO audit_trail (complaint_id, user_id, action, details, prev_hash, record_hash, created_at)
          VALUES (?, ?, 'comment_added', ?, ?, ?, ?)
        `).run(complaintId, comment.userId, commentDetails, prevHash, commentHash, comment.createdAt);
        prevHash = commentHash;
      }
    }
  }

  console.log(`  ✅ Complaints verified (${seededComplaintsCount} newly provisioned).`);
  console.log('\n✅ Idempotent seeding complete!');
  console.log('\n📋 MNNIT Evaluation Demo Credentials:');
  console.log('  Authority: admin@mnnit.ac.in    / Admin@123');
  console.log('  Student 1: student1@mnnit.ac.in / Student@123');
  console.log('  Student 2: student2@mnnit.ac.in / Student@123');
  console.log('  Student 3: student3@mnnit.ac.in / Student@123\n');
}

// Run seed when invoked directly
seed();

export { seed };
