require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rvr_blood_bank'
  });

  const [notifs] = await conn.query('SELECT * FROM user_notifications ORDER BY created_at DESC LIMIT 10');
  console.log('Notifications in DB:', notifs.length);
  if (notifs.length > 0) console.log('Sample:', JSON.stringify(notifs[0], null, 2));

  const [users] = await conn.query('SELECT id, full_name, role, blood_group FROM users');
  console.log('\nUsers:');
  users.forEach(u => console.log(` - [${u.id}] ${u.full_name} | role=${u.role} | blood_group=${u.blood_group}`));

  const [donors] = await conn.query('SELECT d.id, d.user_id, d.blood_group, u.full_name FROM donors d JOIN users u ON u.id=d.user_id');
  console.log('\nDonors:');
  donors.forEach(d => console.log(` - [user ${d.user_id}] ${d.full_name} | blood_group=${d.blood_group}`));

  await conn.end();
})();
