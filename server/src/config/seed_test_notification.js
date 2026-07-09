require('dotenv').config();
const mysql = require('mysql2/promise');

// Simulate creating a notification (what happens when a blood request is submitted)
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rvr_blood_bank'
  });

  // Find a test blood request
  const [[request]] = await conn.query('SELECT * FROM blood_requests ORDER BY created_at DESC LIMIT 1');
  if (!request) {
    console.log('No blood requests in DB. Please create one first via the UI.');
    await conn.end();
    return;
  }

  console.log('Using blood request:', request.id, request.blood_group_needed);

  // Find users whose donors table matches
  const [matchingDonorUsers] = await conn.query(
    `SELECT u.id, u.full_name FROM users u
     JOIN donors d ON d.user_id = u.id
     WHERE d.blood_group = ? AND u.is_active = 1 AND u.id != ?`,
    [request.blood_group_needed, request.requester_id]
  );

  console.log('Matching donor users:', matchingDonorUsers.map(u => `${u.id}: ${u.full_name}`));

  if (matchingDonorUsers.length === 0) {
    console.log('No matching donors found. Check blood_group in donors table vs request blood_group_needed.');
    await conn.end();
    return;
  }

  // Insert notifications per-row (matching the fixed code)
  const notifMessage = `Someone needs your ${request.blood_group_needed} blood group blood! TEST NOTIFICATION.`;
  for (const user of matchingDonorUsers) {
    await conn.query(
      `INSERT INTO user_notifications
       (recipient_id, request_id, message, patient_name, blood_group, urgency,
        hospital_name, hospital_address, hospital_city, hospital_state, hospital_pincode,
        contact_name, contact_phone, additional_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id, request.id, notifMessage,
        request.patient_name, request.blood_group_needed, request.urgency,
        request.hospital_name, request.hospital_address, request.hospital_city,
        request.hospital_state, request.hospital_pincode,
        request.contact_name, request.contact_phone, request.additional_notes || null
      ]
    );
    console.log(`Inserted test notification for user ${user.id} (${user.full_name})`);
  }

  const [[count]] = await conn.query('SELECT COUNT(*) as c FROM user_notifications');
  console.log(`Total notifications in DB: ${count.c}`);
  await conn.end();
})();
