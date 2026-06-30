const { query, queryOne } = require('../config/db');
const { asyncHandler, formatPhoneE164 } = require('../utils/helpers');
const { NotFoundError, ForbiddenError, AppError } = require('../utils/errors');
const { findMatchingDonors } = require('../services/matching.service');
const { sendDonorNotification } = require('../services/fcm.service');
const { logger } = require('../utils/logger');

/**
 * POST /api/requests
 * Create a new blood request and trigger donor matching.
 */
const createRequest = asyncHandler(async (req, res) => {
  const {
    patient_name, blood_group_needed, units_needed, urgency,
    hospital_name, hospital_address, hospital_city, hospital_state, hospital_pincode,
    contact_name, contact_phone, additional_notes
  } = req.body;

  const expiryHours = parseInt(process.env.REQUEST_EXPIRY_HOURS, 10) || 24;
  const formattedPhone = formatPhoneE164(contact_phone);

  // Insert request
  const result = await query(
    `INSERT INTO blood_requests
     (requester_id, patient_name, blood_group_needed, units_needed, urgency,
      hospital_name, hospital_address, hospital_city, hospital_state, hospital_pincode,
      contact_name, contact_phone, additional_notes, status, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', DATE_ADD(NOW(), INTERVAL ? HOUR))`,
    [
      req.user.id, patient_name, blood_group_needed, units_needed, urgency,
      hospital_name, hospital_address, hospital_city, hospital_state, hospital_pincode,
      contact_name, formattedPhone, additional_notes || null, expiryHours
    ]
  );

  const requestId = result.insertId;
  const requestRecord = await queryOne('SELECT * FROM blood_requests WHERE id = ?', [requestId]);

  // Update status to matching
  await query("UPDATE blood_requests SET status = 'matching' WHERE id = ?", [requestId]);

  // Trigger matching engine asynchronously
  setImmediate(async () => {
    try {
      const matchingDonors = await findMatchingDonors(requestRecord);

      if (matchingDonors.length > 0) {
        let notifiedCount = 0;

        for (const donor of matchingDonors) {
          const sent = await sendDonorNotification(donor, requestRecord);
          if (sent) notifiedCount++;
        }

        // Update request with notification count and status
        await query(
          `UPDATE blood_requests SET status = 'matched', donors_notified = ? WHERE id = ?`,
          [notifiedCount, requestId]
        );

        logger.info(`Request #${requestId}: ${notifiedCount} donors notified`);
      } else {
        // No donors found — keep as pending
        await query("UPDATE blood_requests SET status = 'pending' WHERE id = ?", [requestId]);
        logger.warn(`Request #${requestId}: No matching donors found`);
      }
    } catch (error) {
      logger.error(`Matching failed for request #${requestId}:`, error.message);
      await query("UPDATE blood_requests SET status = 'pending' WHERE id = ?", [requestId]);
    }
  });

  res.status(201).json({
    success: true,
    data: {
      request: {
        id: requestId,
        status: 'pending',
        blood_group_needed,
        units_needed,
        urgency,
        created_at: requestRecord.created_at,
        expires_at: requestRecord.expires_at
      },
      message: 'Request submitted. Matching donors will be notified shortly.'
    }
  });
});

/**
 * GET /api/requests/:id
 * Get a single request with donor response summary.
 */
const getRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const request = await queryOne('SELECT * FROM blood_requests WHERE id = ?', [id]);

  if (!request) {
    throw new NotFoundError('Request');
  }

  // Access control: owner or admin
  if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
    throw new ForbiddenError('You can only view your own requests.');
  }

  // Get accepted donors (limited info for privacy)
  const acceptedDonors = await query(
    `SELECT u.full_name, d.blood_group, dr.response_time as accepted_at
     FROM donor_responses dr
     JOIN donors d ON dr.donor_id = d.id
     JOIN users u ON d.user_id = u.id
     WHERE dr.request_id = ? AND dr.response = 'accepted'
     ORDER BY dr.response_time ASC`,
    [id]
  );

  // Mask full names — show first name only
  const maskedDonors = acceptedDonors.map(d => ({
    first_name: d.full_name.split(' ')[0],
    blood_group: d.blood_group,
    accepted_at: d.accepted_at
  }));

  res.json({
    success: true,
    data: {
      request: {
        ...request,
        accepted_donors: maskedDonors
      }
    }
  });
});

/**
 * GET /api/requests
 * Get requests (patients see own, admins see all).
 */
const getRequests = asyncHandler(async (req, res) => {
  const { status, blood_group, urgency, page = 1, limit = 20, sort_by = 'created_at', sort_order = 'desc' } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];

  // Role-based filtering
  if (req.user.role !== 'admin') {
    conditions.push('requester_id = ?');
    params.push(req.user.id);
  }

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (blood_group) { conditions.push('blood_group_needed = ?'); params.push(blood_group); }
  if (urgency) { conditions.push('urgency = ?'); params.push(urgency); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSorts = ['created_at', 'urgency', 'status', 'blood_group_needed', 'units_needed'];
  const sortColumn = allowedSorts.includes(sort_by) ? sort_by : 'created_at';
  const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';

  const [requests, countResult] = await Promise.all([
    query(`SELECT * FROM blood_requests ${whereClause} ORDER BY ${sortColumn} ${sortDir} LIMIT ${limitNum} OFFSET ${offset}`,
      params),
    queryOne(`SELECT COUNT(*) as total FROM blood_requests ${whereClause}`, params)
  ]);

  res.json({
    success: true,
    data: {
      requests,
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
 * PATCH /api/requests/:id/status
 * Update request status.
 */
const updateRequestStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const request = await queryOne('SELECT * FROM blood_requests WHERE id = ?', [id]);
  if (!request) throw new NotFoundError('Request');

  // Validate status transition
  const allowedTransitions = {
    pending: ['matching', 'cancelled'],
    matching: ['matched', 'cancelled', 'pending'],
    matched: ['fulfilled', 'cancelled'],
    fulfilled: [],
    cancelled: [],
    expired: []
  };

  const allowed = allowedTransitions[request.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(`Cannot transition from '${request.status}' to '${status}'.`, 422, 'UNPROCESSABLE_ENTITY');
  }

  const updates = { status };
  if (status === 'fulfilled') updates.fulfilled_at = new Date();

  await query(
    `UPDATE blood_requests SET status = ?${status === 'fulfilled' ? ', fulfilled_at = NOW()' : ''} WHERE id = ?`,
    [status, id]
  );

  logger.info(`Request #${id} status changed: ${request.status} → ${status}`);

  res.json({
    success: true,
    data: { id: parseInt(id), status },
    message: `Request status updated to '${status}'.`
  });
});

/**
 * PATCH /api/requests/:id/cancel
 */
const cancelRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const request = await queryOne('SELECT * FROM blood_requests WHERE id = ?', [id]);
  if (!request) throw new NotFoundError('Request');

  // Only owner or admin can cancel
  if (req.user.role !== 'admin' && request.requester_id !== req.user.id) {
    throw new ForbiddenError('You can only cancel your own requests.');
  }

  if (['fulfilled', 'cancelled', 'expired'].includes(request.status)) {
    throw new AppError(`Cannot cancel a request that is already '${request.status}'.`, 422, 'UNPROCESSABLE_ENTITY');
  }

  await query("UPDATE blood_requests SET status = 'cancelled' WHERE id = ?", [id]);

  res.json({
    success: true,
    message: 'Request cancelled successfully.'
  });
});

module.exports = { createRequest, getRequest, getRequests, updateRequestStatus, cancelRequest };
