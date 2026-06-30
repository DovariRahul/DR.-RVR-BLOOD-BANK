const bcrypt = require('bcryptjs');
const { query, queryOne } = require('../config/db');
const { asyncHandler, formatPhoneE164, calculateAge, daysSince } = require('../utils/helpers');
const { ConflictError, NotFoundError, ForbiddenError, AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');

/**
 * POST /api/donors/register
 * Register a new donor (with or without existing user account).
 */
const registerDonor = asyncHandler(async (req, res) => {
  const {
    full_name, email, phone, password,
    date_of_birth, gender, blood_group, weight_kg,
    last_donation_date, medical_conditions,
    address_line, city, state, pincode,
    notification_opt_in
  } = req.body;

  let userId;

  if (req.user) {
    // Authenticated user adding donor profile
    userId = req.user.id;

    // Check if already a donor
    const existingDonor = await queryOne('SELECT id FROM donors WHERE user_id = ?', [userId]);
    if (existingDonor) {
      throw new ConflictError('You are already registered as a donor.');
    }

    // Update role to donor if currently patient
    if (req.user.role === 'patient') {
      await query("UPDATE users SET role = 'donor', phone = ?, full_name = ? WHERE id = ?", [formatPhoneE164(phone), full_name, userId]);
    } else {
      await query("UPDATE users SET phone = ?, full_name = ? WHERE id = ?", [formatPhoneE164(phone), full_name, userId]);
    }
  } else {
    // Guest registration — create new user account
    if (!full_name || !email || !phone || !password) {
      throw new AppError('Full name, email, phone, and password are required for new accounts.', 400, 'VALIDATION_ERROR');
    }

    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      throw new ConflictError('Email already registered. Please login first.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const formattedPhone = formatPhoneE164(phone);

    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, phone, role)
       VALUES (?, ?, ?, ?, 'donor')`,
      [full_name, email, passwordHash, formattedPhone]
    );
    userId = result.insertId;
  }

  // Validate age
  const age = calculateAge(date_of_birth);
  if (age < 18 || age > 65) {
    throw new AppError('Donors must be between 18 and 65 years old.', 400, 'VALIDATION_ERROR');
  }

  // Validate donation gap
  if (last_donation_date && daysSince(last_donation_date) < 56) {
    throw new AppError('Last donation must be at least 56 days ago.', 400, 'VALIDATION_ERROR');
  }

  // Insert donor record
  const donorResult = await query(
    `INSERT INTO donors
     (user_id, blood_group, date_of_birth, gender, weight_kg, last_donation_date,
      medical_conditions, address_line, city, state, pincode, notification_opt_in)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId, blood_group, date_of_birth, gender, weight_kg,
      last_donation_date || null, medical_conditions || null,
      address_line, city, state, pincode,
      notification_opt_in !== false ? 1 : 0
    ]
  );

  logger.info(`New donor registered: user #${userId}, blood group ${blood_group}`);

  res.status(201).json({
    success: true,
    data: {
      user: { id: userId, role: 'donor' },
      donor: { id: donorResult.insertId, blood_group, is_available: true },
      message: 'Donor registration successful. Please verify your phone.'
    }
  });
});

/**
 * GET /api/donors/profile
 * Get the current donor's own profile.
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const donor = await queryOne(
    `SELECT d.*, u.full_name, u.email, u.phone, u.is_verified
     FROM donors d
     JOIN users u ON d.user_id = u.id
     WHERE d.user_id = ?`,
    [req.user.id]
  );

  if (!donor) {
    throw new NotFoundError('Donor profile');
  }

  // Get response history
  const responseHistory = await query(
    `SELECT dr.response, dr.response_time, dr.created_at,
            br.blood_group_needed, br.hospital_name, br.hospital_city, br.urgency
     FROM donor_responses dr
     JOIN blood_requests br ON dr.request_id = br.id
     WHERE dr.donor_id = ?
     ORDER BY dr.created_at DESC
     LIMIT 20`,
    [donor.id]
  );

  // Calculate days until next eligibility
  const daysSinceLastDonation = daysSince(donor.last_donation_date);
  const daysUntilEligible = Math.max(0, 56 - daysSinceLastDonation);

  res.json({
    success: true,
    data: {
      donor: {
        ...donor,
        days_until_eligible: daysUntilEligible,
        is_eligible: daysUntilEligible === 0
      },
      response_history: responseHistory
    }
  });
});

/**
 * PUT /api/donors/:id
 * Update donor profile.
 */
const updateDonor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const donor = await queryOne('SELECT * FROM donors WHERE id = ?', [id]);
  if (!donor) throw new NotFoundError('Donor');

  // Access control: own profile or admin
  if (req.user.role !== 'admin' && donor.user_id !== req.user.id) {
    throw new ForbiddenError('You can only edit your own profile.');
  }

  const allowedFields = ['weight_kg', 'address_line', 'city', 'state', 'pincode',
    'medical_conditions', 'notification_opt_in', 'last_donation_date'];

  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (updates.length === 0) {
    return res.json({ success: true, message: 'No changes made.' });
  }

  values.push(id);
  await query(`UPDATE donors SET ${updates.join(', ')} WHERE id = ?`, values);

  const updatedDonor = await queryOne('SELECT * FROM donors WHERE id = ?', [id]);

  res.json({
    success: true,
    data: { donor: updatedDonor },
    message: 'Profile updated successfully.'
  });
});

/**
 * PATCH /api/donors/:id/availability
 * Toggle donor availability.
 */
const toggleAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_available } = req.body;

  const donor = await queryOne('SELECT * FROM donors WHERE id = ?', [id]);
  if (!donor) throw new NotFoundError('Donor');

  if (req.user.role !== 'admin' && donor.user_id !== req.user.id) {
    throw new ForbiddenError('You can only update your own availability.');
  }

  await query('UPDATE donors SET is_available = ? WHERE id = ?', [is_available ? 1 : 0, id]);

  logger.info(`Donor #${id} availability changed to ${is_available}`);

  res.json({
    success: true,
    data: { is_available: !!is_available },
    message: is_available ? 'You are now available for donation requests.' : 'You are now marked as unavailable.'
  });
});

/**
 * POST /api/requests/:id/respond
 * Donor responds to a blood request (accept/decline).
 */
const respondToRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;

  if (!['accepted', 'declined'].includes(response)) {
    throw new AppError("Response must be 'accepted' or 'declined'.", 400, 'VALIDATION_ERROR');
  }

  // Get donor record for this user
  const donor = await queryOne('SELECT * FROM donors WHERE user_id = ?', [req.user.id]);
  if (!donor) throw new NotFoundError('Donor profile');

  // Get the donor_response record
  const donorResponse = await queryOne(
    'SELECT * FROM donor_responses WHERE request_id = ? AND donor_id = ?',
    [id, donor.id]
  );

  if (!donorResponse) {
    throw new NotFoundError('You were not notified for this request.');
  }

  if (donorResponse.response !== 'no_response') {
    throw new AppError('You have already responded to this request.', 400, 'VALIDATION_ERROR');
  }

  // Update response
  await query(
    `UPDATE donor_responses SET response = ?, response_time = NOW() WHERE id = ?`,
    [response, donorResponse.id]
  );

  // If accepted, update request accepted count and send confirmations
  if (response === 'accepted') {
    await query(
      'UPDATE blood_requests SET donors_accepted = donors_accepted + 1 WHERE id = ?',
      [id]
    );

    // Send confirmations asynchronously
    const request = await queryOne('SELECT * FROM blood_requests WHERE id = ?', [id]);
    const { sendAcceptanceConfirmation, sendSeekerNotification } = require('../services/fcm.service');

    setImmediate(async () => {
      try {
        await sendAcceptanceConfirmation(
          { ...donor, phone: (await queryOne('SELECT phone FROM users WHERE id = ?', [donor.user_id])).phone, user_id: donor.user_id },
          request
        );

        const seeker = await queryOne('SELECT phone, id FROM users WHERE id = ?', [request.requester_id]);
        if (seeker) {
          const user = await queryOne('SELECT full_name FROM users WHERE id = ?', [donor.user_id]);
          await sendSeekerNotification(seeker.phone, seeker.id, user.full_name, donor.blood_group, request);
        }
      } catch (err) {
        logger.error('Failed to send confirmation SMS:', err.message);
      }
    });
  }

  logger.info(`Donor #${donor.id} ${response} request #${id}`);

  res.json({
    success: true,
    message: response === 'accepted'
      ? 'Thank you for accepting! Hospital details have been sent to your phone.'
      : 'Response recorded. Thank you for letting us know.'
  });
});

/**
 * GET /api/donors
 * List donors (admin only for full list).
 */
const getDonors = asyncHandler(async (req, res) => {
  const { blood_group, city, is_available, page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  const offset = (pageNum - 1) * limitNum;

  const conditions = ['u.is_active = 1'];
  const params = [];

  if (blood_group) { conditions.push('d.blood_group = ?'); params.push(blood_group); }
  if (city) { conditions.push('d.city = ?'); params.push(city); }
  if (is_available !== undefined) { conditions.push('d.is_available = ?'); params.push(is_available === 'true' ? 1 : 0); }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const [donors, countResult] = await Promise.all([
    query(
      `SELECT d.*, u.full_name, u.email, u.phone, u.is_verified
       FROM donors d
       JOIN users u ON d.user_id = u.id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      params
    ),
    queryOne(`SELECT COUNT(*) as total FROM donors d JOIN users u ON d.user_id = u.id ${whereClause}`, params)
  ]);

  res.json({
    success: true,
    data: {
      donors,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult.total,
        total_pages: Math.ceil(countResult.total / limitNum)
      }
    }
  });
});

/**
 * DELETE /api/donors/account
 * Delete donor account (requires password verification).
 * This removes the donor record and reverts the user role to 'patient'.
 */
const deleteDonorAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    throw new AppError('Password is required to delete your donor account.', 400, 'VALIDATION_ERROR');
  }

  // Verify password
  const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) throw new NotFoundError('User');

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Incorrect password. Please try again.', 401, 'AUTH_ERROR');
  }

  // Get donor record
  const donor = await queryOne('SELECT id FROM donors WHERE user_id = ?', [req.user.id]);
  if (!donor) throw new NotFoundError('Donor profile');

  // Delete donor responses first (foreign key)
  await query('DELETE FROM donor_responses WHERE donor_id = ?', [donor.id]);

  // Delete donor record
  await query('DELETE FROM donors WHERE id = ?', [donor.id]);

  // Revert user role to patient
  await query("UPDATE users SET role = 'patient' WHERE id = ?", [req.user.id]);

  logger.info(`Donor account deleted: user #${req.user.id}`);

  res.json({
    success: true,
    message: 'Your donor account has been successfully deleted. You can register again anytime.'
  });
});

module.exports = { registerDonor, getMyProfile, updateDonor, toggleAvailability, respondToRequest, getDonors, deleteDonorAccount };
