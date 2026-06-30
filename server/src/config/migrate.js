/**
 * Database migration script — creates all tables for RVR Blood Bank.
 * Run with: node src/config/migrate.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  role ENUM('patient', 'donor', 'admin') NOT NULL DEFAULT 'patient',
  is_verified TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  fcm_token VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS donors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  date_of_birth DATE NOT NULL,
  gender ENUM('male','female','other') NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  last_donation_date DATE NULL,
  medical_conditions TEXT NULL,
  is_available TINYINT(1) DEFAULT 1,
  address_line VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  latitude DECIMAL(10,8) NULL,
  longitude DECIMAL(11,8) NULL,
  notification_opt_in TINYINT(1) DEFAULT 1,
  total_donations INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_donors_blood_group (blood_group),
  INDEX idx_donors_availability (blood_group, is_available),
  INDEX idx_donors_location (latitude, longitude),
  INDEX idx_donors_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blood_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  patient_name VARCHAR(100) NOT NULL,
  blood_group_needed ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  units_needed INT NOT NULL,
  urgency ENUM('critical','urgent','standard') NOT NULL DEFAULT 'standard',
  hospital_name VARCHAR(200) NOT NULL,
  hospital_address VARCHAR(255) NOT NULL,
  hospital_city VARCHAR(100) NOT NULL,
  hospital_state VARCHAR(100) NOT NULL,
  hospital_pincode VARCHAR(10) NOT NULL,
  hospital_latitude DECIMAL(10,8) NULL,
  hospital_longitude DECIMAL(11,8) NULL,
  contact_name VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(15) NOT NULL,
  additional_notes TEXT NULL,
  status ENUM('pending','matching','matched','fulfilled','cancelled','expired') NOT NULL DEFAULT 'pending',
  donors_notified INT DEFAULT 0,
  donors_accepted INT DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  fulfilled_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id),
  INDEX idx_requests_status (status),
  INDEX idx_requests_blood_group (blood_group_needed),
  INDEX idx_requests_requester (requester_id),
  INDEX idx_requests_urgency (urgency, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS donor_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  donor_id INT NOT NULL,
  response ENUM('accepted','declined','no_response') NOT NULL DEFAULT 'no_response',
  response_time TIMESTAMP NULL,
  sms_sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sms_status ENUM('sent','delivered','failed','queued') DEFAULT 'queued',
  sms_sid VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES blood_requests(id),
  FOREIGN KEY (donor_id) REFERENCES donors(id),
  INDEX idx_responses_request (request_id),
  INDEX idx_responses_donor (donor_id),
  UNIQUE INDEX idx_unique_response (request_id, donor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_id INT NOT NULL,
  type ENUM('sms','email','push') NOT NULL,
  related_request INT NULL,
  message_body TEXT NOT NULL,
  status ENUM('sent','delivered','failed','queued') DEFAULT 'queued',
  external_id VARCHAR(50) NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_id) REFERENCES users(id),
  FOREIGN KEY (related_request) REFERENCES blood_requests(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id INT NOT NULL,
  details JSON NULL,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'rvr_blood_bank'}\``);
    await connection.query(`USE \`${process.env.DB_NAME || 'rvr_blood_bank'}\``);

    console.log('Creating tables...');
    await connection.query(SCHEMA);
    console.log('All tables created successfully.');

    // Seed admin user
    const adminEmail = 'admin@rvrbloodbank.org';
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [adminEmail]);

    if (existing.length === 0) {
      const hash = await bcrypt.hash('Admin@RVR2026', 12);
      await connection.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role, is_verified, is_active)
         VALUES (?, ?, ?, ?, 'admin', 1, 1)`,
        ['RVR Admin', adminEmail, hash, '+919999999999']
      );
      console.log('Admin user seeded: admin@rvrbloodbank.org / Admin@RVR2026');
    } else {
      console.log('Admin user already exists, skipping seed.');
    }

    // Seed DOVARI RAHUL as admin
    const rahulEmail = 'dovarirahul@rvrbloodbank.org';
    const [existingRahul] = await connection.query('SELECT id FROM users WHERE email = ?', [rahulEmail]);

    if (existingRahul.length === 0) {
      const rahulHash = await bcrypt.hash('Admin@RVR2026', 12);
      await connection.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role, is_verified, is_active)
         VALUES (?, ?, ?, ?, 'admin', 1, 1)`,
        ['DOVARI RAHUL', rahulEmail, rahulHash, '+919999999998']
      );
      console.log('Admin user seeded: dovarirahul@rvrbloodbank.org / Admin@RVR2026');
    } else {
      console.log('DOVARI RAHUL admin already exists, skipping seed.');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
