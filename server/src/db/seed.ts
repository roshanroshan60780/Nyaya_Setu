import bcrypt from 'bcryptjs';
import db from './database';
import { migrate } from './migrate';
import { computeHash } from '../utils/audit';

/**
 * Seed script for NyayaSetu demo data.
 * Creates realistic users, complaints, comments, notifications, and audit trail
 * entries with an Indian college context.
 *
 * WARNING: This clears existing data before seeding.
 */
function seed(): void {
  console.log('🌱 Seeding database with demo data...\n');

  // Run migrations first to ensure tables exist
  // (migrate.ts already ran via import, but we call it explicitly for safety)

  // Clear existing data (order matters due to foreign keys)
  console.log('🗑️  Clearing existing data...');
  db.exec('DELETE FROM audit_trail');
  db.exec('DELETE FROM notifications');
  db.exec('DELETE FROM attachments');
  db.exec('DELETE FROM comments');
  db.exec('DELETE FROM complaints');
  db.exec('DELETE FROM users');
  // Reset autoincrement counters
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users','complaints','comments','attachments','notifications','audit_trail')");

  // ─── USERS ────────────────────────────────────────────────────────────────

  console.log('👥 Creating users...');
  const salt = bcrypt.genSaltSync(12);

  const insertUser = db.prepare(
    `INSERT INTO users (email, name, password_hash, role, department)
     VALUES (?, ?, ?, ?, ?)`
  );

  insertUser.run('admin@nyayasetu.edu.in', 'Dr. Rajesh Verma', bcrypt.hashSync('Admin@123', salt), 'admin', 'Administration');
  insertUser.run('coordinator@nyayasetu.edu.in', 'Prof. Sunita Sharma', bcrypt.hashSync('Coord@123', salt), 'admin', 'Student Affairs');
  insertUser.run('rahul.sharma@student.edu.in', 'Rahul Sharma', bcrypt.hashSync('Student@123', salt), 'student', 'Computer Science');
  insertUser.run('priya.patel@student.edu.in', 'Priya Patel', bcrypt.hashSync('Student@123', salt), 'student', 'Electronics');
  insertUser.run('amit.kumar@student.edu.in', 'Amit Kumar', bcrypt.hashSync('Student@123', salt), 'student', 'Mechanical Engineering');

  console.log('  ✅ 5 users created');

  // ─── COMPLAINTS ───────────────────────────────────────────────────────────

  console.log('📝 Creating complaints...');
  const insertComplaint = db.prepare(
    `INSERT INTO complaints (user_id, title, description, category, priority, status, assigned_to, created_at, updated_at, escalated_at, resolution_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // Complaint 1 - Open, academic
  insertComplaint.run(
    3, // Rahul
    'Internal marks not updated on portal',
    'My internal assessment marks for CS301 Data Structures are still showing as 0 on the student portal even though the mid-semester exam was conducted three weeks ago. I have spoken to the faculty but no action has been taken. Other students in my batch are facing the same issue.',
    'academic', 'high', 'open', null,
    '2024-10-01 09:30:00', '2024-10-01 09:30:00', null, null
  );

  // Complaint 2 - In progress, infrastructure
  insertComplaint.run(
    4, // Priya
    'Water leakage in Girls Hostel Room 204',
    'There has been continuous water leakage from the ceiling of Room 204 in the Girls Hostel Block B for the past 10 days. The leakage worsens during rain and has damaged my laptop bag and some textbooks. Despite multiple verbal complaints to the hostel warden, no repair work has been initiated.',
    'infrastructure', 'critical', 'in_progress', 1,
    '2024-09-25 14:15:00', '2024-10-03 10:00:00', null, null
  );

  // Complaint 3 - Resolved, financial
  insertComplaint.run(
    3, // Rahul
    'Scholarship amount not credited for odd semester',
    'My State Merit Scholarship for the odd semester 2024-25 (Rs. 25,000) has not been credited to my bank account despite the college confirming disbursement on 15th September. The accounts office says the NEFT transfer was done, but my bank shows no incoming transaction.',
    'financial', 'high', 'resolved', 2,
    '2024-09-18 11:00:00', '2024-10-05 16:30:00', null,
    'Verified with accounts department - NEFT was sent to an old bank account. Amount re-transferred to the updated bank account on 5th October. Student confirmed receipt.'
  );

  // Complaint 4 - Open, hostel
  insertComplaint.run(
    5, // Amit
    'Mess food quality deterioration',
    'The quality of food served in the Boys Hostel mess has significantly deteriorated over the last month. Multiple instances of undercooked dal, stale chapatis, and insufficient quantity of vegetables. On 28th September, several students fell ill after dinner. We request an urgent inspection of the mess kitchen and a meeting with the mess committee.',
    'hostel', 'high', 'open', null,
    '2024-10-02 20:45:00', '2024-10-02 20:45:00', null, null
  );

  // Complaint 5 - Escalated, administrative
  insertComplaint.run(
    4, // Priya
    'Delay in issuing migration certificate',
    'I applied for my migration certificate on 1st September 2024 as I need it for my M.Tech admission at IIT Bombay. The last date for submission is 15th October. Despite visiting the admin office 5 times and submitting all required documents, the certificate has not been issued. The clerk keeps saying "it will be done next week."',
    'administrative', 'critical', 'escalated', 1,
    '2024-09-05 10:30:00', '2024-10-08 09:00:00', '2024-10-08 09:00:00', null
  );

  // Complaint 6 - Closed, infrastructure
  insertComplaint.run(
    5, // Amit
    'Broken projector in Lecture Hall 3',
    'The projector in Lecture Hall 3 (Mechanical Block) has not been working for the past two weeks. Faculty members are unable to deliver presentations and are resorting to blackboard teaching, which is affecting the quality of instruction. The projector displays a blue screen and shuts off after 2 minutes.',
    'infrastructure', 'medium', 'closed', 2,
    '2024-09-10 08:00:00', '2024-09-28 14:00:00', null,
    'Projector bulb and motherboard replaced on 26th September. Tested and confirmed working by IT department. Faculty confirmed normal operation.'
  );

  // Complaint 7 - Open, academic
  insertComplaint.run(
    5, // Amit
    'Lab equipment shortage in Thermodynamics Lab',
    'The Thermodynamics Lab (ME Lab 2) does not have sufficient equipment for all students. In a batch of 30 students, there are only 8 working setups for the calorimetry experiment. Students have to wait for 2-3 hours to get a turn, and many are unable to complete their lab journal entries on time. This has been an ongoing issue for 2 semesters.',
    'academic', 'medium', 'open', null,
    '2024-10-05 13:20:00', '2024-10-05 13:20:00', null, null
  );

  // Complaint 8 - In progress, other
  insertComplaint.run(
    3, // Rahul
    'Wi-Fi connectivity issues in Library',
    'The Wi-Fi network in the Central Library has been extremely unreliable for the past 3 weeks. Connection drops every 10-15 minutes, download speeds are below 100 Kbps, and many students cannot access online journals and databases required for research. The IT helpdesk has not been able to resolve the issue.',
    'other', 'medium', 'in_progress', 1,
    '2024-09-28 16:00:00', '2024-10-06 11:30:00', null, null
  );

  // Complaint 9 - Open, financial
  insertComplaint.run(
    4, // Priya
    'Excess fees charged for lab materials',
    'The Electronics Department has charged Rs. 3,500 as "lab consumable fee" for this semester, which is Rs. 1,500 more than what was mentioned in the fee structure at the time of admission. No prior notification was given about this hike. When questioned, the department office said it is a department-level decision and refused to provide any circular or official order.',
    'financial', 'low', 'open', null,
    '2024-10-07 09:15:00', '2024-10-07 09:15:00', null, null
  );

  // Complaint 10 - In progress, hostel
  insertComplaint.run(
    5, // Amit
    'Non-functional geyser in Hostel Block C',
    'The hot water geyser in the common bathroom of Block C, 2nd floor, Boys Hostel has not been working since the beginning of the winter season. With temperatures dropping below 10°C in the morning, students are forced to either bathe with cold water or carry hot water from the ground floor. A new geyser was promised 3 weeks ago but not installed yet.',
    'hostel', 'medium', 'in_progress', 2,
    '2024-10-03 07:30:00', '2024-10-07 15:00:00', null, null
  );

  console.log('  ✅ 10 complaints created');

  // ─── COMMENTS ─────────────────────────────────────────────────────────────

  console.log('💬 Creating comments...');
  const insertComment = db.prepare(
    `INSERT INTO comments (complaint_id, user_id, content, created_at)
     VALUES (?, ?, ?, ?)`
  );

  // Comments on Complaint 2 (Water leakage)
  insertComment.run(2, 1, 'Thank you for reporting this. I have forwarded this to the maintenance department and marked it as critical priority. An inspection team will visit within 24 hours.', '2024-09-26 09:00:00');
  insertComment.run(2, 4, 'The inspection team came yesterday but only took photos. No repair work has started yet. The leakage is getting worse.', '2024-09-30 18:30:00');
  insertComment.run(2, 1, 'I have escalated this to the Chief Warden. The plumbing contractor has been contacted and repair work will start tomorrow morning.', '2024-10-03 10:00:00');

  // Comments on Complaint 3 (Scholarship)
  insertComment.run(3, 2, 'I have checked with the accounts section. The NEFT reference number shows the amount was sent to a bank account ending in 4521. Could you confirm if this is your current account?', '2024-09-22 14:00:00');
  insertComment.run(3, 3, 'That is my old SBI account. I had submitted the updated bank details (HDFC account ending in 7890) in August. Please re-initiate the transfer.', '2024-09-23 10:15:00');
  insertComment.run(3, 2, 'Bank details have been corrected. The re-transfer has been initiated today. Please check your HDFC account in 2-3 working days.', '2024-10-02 11:00:00');
  insertComment.run(3, 3, 'Amount received. Thank you for resolving this quickly.', '2024-10-05 16:00:00');

  // Comments on Complaint 5 (Migration certificate)
  insertComment.run(5, 1, 'I will personally look into this matter. This is unacceptable delay. Will update you by tomorrow.', '2024-10-01 11:00:00');
  insertComment.run(5, 4, 'Sir, I have already missed one deadline extension. The final deadline is 15th October. Please help urgently.', '2024-10-05 09:00:00');
  insertComment.run(5, 1, 'I have instructed the admin office to prioritize this. The certificate should be ready by 10th October. I apologize for the delay.', '2024-10-08 09:00:00');

  // Comments on Complaint 8 (Wi-Fi)
  insertComment.run(8, 1, 'The IT team has identified the issue - one of the access points in the library needs replacement. A new AP has been ordered and should arrive by next week.', '2024-10-06 11:30:00');

  console.log('  ✅ 11 comments created');

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────

  console.log('🔔 Creating notifications...');
  const insertNotification = db.prepare(
    `INSERT INTO notifications (user_id, complaint_id, message, type, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  // Notifications for admins about new complaints
  insertNotification.run(1, 1, 'New high priority complaint filed: "Internal marks not updated on portal" in academic category.', 'info', 1, '2024-10-01 09:30:00');
  insertNotification.run(1, 2, 'New critical priority complaint filed: "Water leakage in Girls Hostel Room 204" in infrastructure category.', 'warning', 1, '2024-09-25 14:15:00');
  insertNotification.run(2, 3, 'Complaint #3 "Scholarship amount not credited for odd semester" has been assigned to you.', 'info', 1, '2024-09-20 10:00:00');

  // Notification for student about resolved complaint
  insertNotification.run(3, 3, 'Your complaint "Scholarship amount not credited for odd semester" has been resolved.', 'success', 1, '2024-10-05 16:30:00');

  // Notification for escalation
  insertNotification.run(4, 5, 'Your complaint "Delay in issuing migration certificate" has been escalated for higher priority attention.', 'warning', 0, '2024-10-08 09:00:00');
  insertNotification.run(1, 5, 'Complaint #5 "Delay in issuing migration certificate" has been escalated due to critical delay.', 'warning', 0, '2024-10-08 09:00:00');

  // Unread notifications
  insertNotification.run(1, 4, 'New high priority complaint filed: "Mess food quality deterioration" in hostel category.', 'info', 0, '2024-10-02 20:45:00');
  insertNotification.run(1, 7, 'New medium priority complaint filed: "Lab equipment shortage in Thermodynamics Lab" in academic category.', 'info', 0, '2024-10-05 13:20:00');
  insertNotification.run(2, 9, 'New low priority complaint filed: "Excess fees charged for lab materials" in financial category.', 'info', 0, '2024-10-07 09:15:00');
  insertNotification.run(5, 10, 'Your complaint "Non-functional geyser in Hostel Block C" is now being reviewed.', 'info', 0, '2024-10-07 15:00:00');

  console.log('  ✅ 10 notifications created');

  // ─── AUDIT TRAIL ──────────────────────────────────────────────────────────

  console.log('🔗 Creating audit trail with hash chain...');

  /**
   * Helper to insert audit trail entries with correct hash chaining.
   * Each complaint has its own independent chain.
   */
  const insertAudit = db.prepare(
    `INSERT INTO audit_trail (complaint_id, user_id, action, details, prev_hash, record_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  // Track prev_hash per complaint for chaining
  const prevHashes: Record<number, string> = {};

  function addAudit(complaintId: number, userId: number, action: string, details: string, timestamp: string): void {
    const prevHash = prevHashes[complaintId] || 'GENESIS';
    const recordHash = computeHash(prevHash, complaintId, userId, action, details, timestamp);
    insertAudit.run(complaintId, userId, action, details, prevHash, recordHash, timestamp);
    prevHashes[complaintId] = recordHash;
  }

  // Complaint 1 audit
  addAudit(1, 3, 'complaint_created', '{"title":"Internal marks not updated on portal","category":"academic","priority":"high"}', '2024-10-01 09:30:00');

  // Complaint 2 audit chain
  addAudit(2, 4, 'complaint_created', '{"title":"Water leakage in Girls Hostel Room 204","category":"infrastructure","priority":"critical"}', '2024-09-25 14:15:00');
  addAudit(2, 1, 'complaint_assigned', '{"assigned_to":1,"assigned_to_name":"Dr. Rajesh Verma"}', '2024-09-26 09:00:00');
  addAudit(2, 1, 'status_changed', '{"from":"open","to":"in_progress"}', '2024-09-26 09:00:00');
  addAudit(2, 1, 'comment_added', '{"content_preview":"Thank you for reporting this. I have forwarded this to the maintenance department..."}', '2024-09-26 09:00:00');

  // Complaint 3 audit chain
  addAudit(3, 3, 'complaint_created', '{"title":"Scholarship amount not credited for odd semester","category":"financial","priority":"high"}', '2024-09-18 11:00:00');
  addAudit(3, 1, 'complaint_assigned', '{"assigned_to":2,"assigned_to_name":"Prof. Sunita Sharma"}', '2024-09-20 10:00:00');
  addAudit(3, 2, 'comment_added', '{"content_preview":"I have checked with the accounts section..."}', '2024-09-22 14:00:00');
  addAudit(3, 2, 'status_changed', '{"from":"open","to":"in_progress"}', '2024-09-22 14:00:00');
  addAudit(3, 2, 'status_changed', '{"from":"in_progress","to":"resolved","resolution_notes":"Verified with accounts department - NEFT was sent to an old bank account. Amount re-transferred."}', '2024-10-05 16:30:00');

  // Complaint 4 audit
  addAudit(4, 5, 'complaint_created', '{"title":"Mess food quality deterioration","category":"hostel","priority":"high"}', '2024-10-02 20:45:00');

  // Complaint 5 audit chain
  addAudit(5, 4, 'complaint_created', '{"title":"Delay in issuing migration certificate","category":"administrative","priority":"critical"}', '2024-09-05 10:30:00');
  addAudit(5, 1, 'complaint_assigned', '{"assigned_to":1,"assigned_to_name":"Dr. Rajesh Verma"}', '2024-09-06 10:00:00');
  addAudit(5, 1, 'status_changed', '{"from":"open","to":"in_progress"}', '2024-09-06 10:00:00');
  addAudit(5, 1, 'manually_escalated', '{"previous_status":"in_progress","escalated_by":"Dr. Rajesh Verma"}', '2024-10-08 09:00:00');

  // Complaint 6 audit chain
  addAudit(6, 5, 'complaint_created', '{"title":"Broken projector in Lecture Hall 3","category":"infrastructure","priority":"medium"}', '2024-09-10 08:00:00');
  addAudit(6, 1, 'complaint_assigned', '{"assigned_to":2,"assigned_to_name":"Prof. Sunita Sharma"}', '2024-09-12 09:00:00');
  addAudit(6, 2, 'status_changed', '{"from":"open","to":"in_progress"}', '2024-09-12 09:00:00');
  addAudit(6, 2, 'status_changed', '{"from":"in_progress","to":"resolved"}', '2024-09-26 14:00:00');
  addAudit(6, 2, 'status_changed', '{"from":"resolved","to":"closed"}', '2024-09-28 14:00:00');

  // Complaint 7 audit
  addAudit(7, 5, 'complaint_created', '{"title":"Lab equipment shortage in Thermodynamics Lab","category":"academic","priority":"medium"}', '2024-10-05 13:20:00');

  // Complaint 8 audit chain
  addAudit(8, 3, 'complaint_created', '{"title":"Wi-Fi connectivity issues in Library","category":"other","priority":"medium"}', '2024-09-28 16:00:00');
  addAudit(8, 1, 'complaint_assigned', '{"assigned_to":1,"assigned_to_name":"Dr. Rajesh Verma"}', '2024-10-01 10:00:00');
  addAudit(8, 1, 'status_changed', '{"from":"open","to":"in_progress"}', '2024-10-01 10:00:00');

  // Complaint 9 audit
  addAudit(9, 4, 'complaint_created', '{"title":"Excess fees charged for lab materials","category":"financial","priority":"low"}', '2024-10-07 09:15:00');

  // Complaint 10 audit chain
  addAudit(10, 5, 'complaint_created', '{"title":"Non-functional geyser in Hostel Block C","category":"hostel","priority":"medium"}', '2024-10-03 07:30:00');
  addAudit(10, 1, 'complaint_assigned', '{"assigned_to":2,"assigned_to_name":"Prof. Sunita Sharma"}', '2024-10-05 09:00:00');
  addAudit(10, 2, 'status_changed', '{"from":"open","to":"in_progress"}', '2024-10-07 15:00:00');

  console.log('  ✅ 28 audit trail entries created with hash chains');

  console.log('\n✅ Seeding complete!');
  console.log('\n📋 Demo accounts:');
  console.log('  Admin:   admin@nyayasetu.edu.in / Admin@123');
  console.log('  Admin:   coordinator@nyayasetu.edu.in / Coord@123');
  console.log('  Student: rahul.sharma@student.edu.in / Student@123');
  console.log('  Student: priya.patel@student.edu.in / Student@123');
  console.log('  Student: amit.kumar@student.edu.in / Student@123');
}

seed();

export { seed };
