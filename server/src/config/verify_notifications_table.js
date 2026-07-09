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

  const [rows] = await conn.query("SHOW TABLES LIKE 'user_notifications'");
  if (rows.length > 0) {
    console.log('user_notifications table EXISTS ✓');
  } else {
    console.log('user_notifications table MISSING — creating it now...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_id INT NOT NULL,
        request_id INT NOT NULL,
        message TEXT NOT NULL,
        patient_name VARCHAR(100) NOT NULL,
        blood_group VARCHAR(10) NOT NULL,
        urgency ENUM('critical','urgent','standard') NOT NULL DEFAULT 'standard',
        hospital_name VARCHAR(200) NOT NULL,
        hospital_address VARCHAR(255) NOT NULL,
        hospital_city VARCHAR(100) NOT NULL,
        hospital_state VARCHAR(100) NOT NULL,
        hospital_pincode VARCHAR(10) NOT NULL,
        contact_name VARCHAR(100) NOT NULL,
        contact_phone VARCHAR(20) NOT NULL,
        additional_notes TEXT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
        INDEX idx_notif_recipient (recipient_id, is_read),
        INDEX idx_notif_request (request_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('user_notifications table created successfully ✓');
  }

  await conn.end();
})();
