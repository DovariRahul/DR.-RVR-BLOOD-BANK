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

  try {
    await conn.query(
      "ALTER TABLE users ADD COLUMN blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NULL"
    );
    console.log('blood_group column added to users table.');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('blood_group column already exists on users table.');
    } else {
      console.error('Error:', e.message);
    }
  }

  try {
    await conn.query('ALTER TABLE users ADD INDEX idx_users_blood_group (blood_group)');
    console.log('Index added.');
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') {
      console.log('Index already exists.');
    } else {
      console.error('Index error:', e.message);
    }
  }

  await conn.end();
  console.log('Done.');
})();
