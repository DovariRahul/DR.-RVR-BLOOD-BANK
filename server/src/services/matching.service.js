const { query, queryOne } = require('../config/db');
const { logger } = require('../utils/logger');

/**
 * Blood group compatibility map.
 * Key = patient's needed group, Value = compatible donor groups (ordered by preference).
 */
const COMPATIBILITY_MAP = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-']
};

/**
 * Find matching donors for a blood request.
 *
 * @param {Object} request - The blood request record.
 * @returns {Array} Matching donor records with user info.
 */
async function findMatchingDonors(request) {
  const { blood_group_needed, urgency, hospital_city, hospital_pincode, hospital_latitude, hospital_longitude } = request;

  // Step 1: Determine blood groups to search
  let bloodGroups = [blood_group_needed]; // exact match first

  // Step 2: Build base query conditions
  const conditions = [
    'd.is_available = 1',
    'd.notification_opt_in = 1',
    'u.is_active = 1',
    '(d.last_donation_date IS NULL OR DATEDIFF(NOW(), d.last_donation_date) >= 56)'
  ];
  const params = [];

  // Step 3: Check if we can use proximity matching (lat/lng available)
  let useProximity = hospital_latitude && hospital_longitude;
  let radiusKm = getSearchRadius(urgency);

  // Build blood group condition for exact match first
  conditions.push('d.blood_group IN (?)');
  params.push(bloodGroups);

  let selectFields = `
    d.*, u.full_name, u.phone, u.email, u.id as user_id
  `;

  let orderBy = 'd.created_at DESC';

  if (useProximity) {
    selectFields += `,
      (6371 * ACOS(
        LEAST(1, GREATEST(-1,
          COS(RADIANS(?)) * COS(RADIANS(d.latitude)) *
          COS(RADIANS(d.longitude) - RADIANS(?)) +
          SIN(RADIANS(?)) * SIN(RADIANS(d.latitude))
        ))
      )) AS distance_km`;
    params.push(hospital_latitude, hospital_longitude, hospital_latitude);
    conditions.push('d.latitude IS NOT NULL AND d.longitude IS NOT NULL');
    orderBy = 'distance_km ASC';
  }

  // Rate limit: exclude donors notified 3+ times in last 24 hours
  const rateLimitSubquery = `
    d.id NOT IN (
      SELECT dr.donor_id FROM donor_responses dr
      WHERE dr.sms_sent_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY dr.donor_id
      HAVING COUNT(*) >= ?
    )
  `;
  conditions.push(rateLimitSubquery);
  params.push(parseInt(process.env.SMS_RATE_LIMIT_PER_DAY, 10) || 3);

  let sql = `
    SELECT ${selectFields}
    FROM donors d
    JOIN users u ON d.user_id = u.id
    WHERE ${conditions.join(' AND ')}
    ${useProximity ? `HAVING distance_km <= ?` : ''}
    ORDER BY ${orderBy}
    LIMIT 20
  `;

  if (useProximity) {
    params.push(radiusKm);
  }

  let donors = await query(sql, params);

  // Step 4: If critical urgency and fewer than 3 exact matches, expand to compatible groups
  if (urgency === 'critical' && donors.length < 3) {
    const compatibleGroups = COMPATIBILITY_MAP[blood_group_needed];
    logger.info(`Expanding search to compatible groups: ${compatibleGroups.join(', ')}`);

    // Re-run with all compatible groups
    const expandedParams = [];
    const expandedConditions = [
      'd.is_available = 1',
      'd.notification_opt_in = 1',
      'u.is_active = 1',
      '(d.last_donation_date IS NULL OR DATEDIFF(NOW(), d.last_donation_date) >= 56)',
      'd.blood_group IN (?)'
    ];
    expandedParams.push(compatibleGroups);

    let expandedSelect = `d.*, u.full_name, u.phone, u.email, u.id as user_id`;
    let expandedOrder = `FIELD(d.blood_group, ?) ASC, d.created_at DESC`;
    expandedParams.push(blood_group_needed);

    if (useProximity) {
      expandedSelect += `,
        (6371 * ACOS(
          LEAST(1, GREATEST(-1,
            COS(RADIANS(?)) * COS(RADIANS(d.latitude)) *
            COS(RADIANS(d.longitude) - RADIANS(?)) +
            SIN(RADIANS(?)) * SIN(RADIANS(d.latitude))
          ))
        )) AS distance_km`;
      expandedParams.push(hospital_latitude, hospital_longitude, hospital_latitude);
      expandedConditions.push('d.latitude IS NOT NULL AND d.longitude IS NOT NULL');
      expandedOrder = `FIELD(d.blood_group, ?) ASC, distance_km ASC`;
      // Need to add blood_group_needed again for the FIELD() in order
      expandedParams.splice(expandedParams.length - 3, 0); // already have it
    }

    expandedConditions.push(rateLimitSubquery);
    expandedParams.push(parseInt(process.env.SMS_RATE_LIMIT_PER_DAY, 10) || 3);

    // Expand radius for critical
    const expandedRadius = Math.min(radiusKm * 3, 100);

    const expandedSql = `
      SELECT ${expandedSelect}
      FROM donors d
      JOIN users u ON d.user_id = u.id
      WHERE ${expandedConditions.join(' AND ')}
      ${useProximity ? `HAVING distance_km <= ?` : ''}
      ORDER BY ${expandedOrder}
      LIMIT 20
    `;

    if (useProximity) {
      expandedParams.push(expandedRadius);
    }

    try {
      donors = await query(expandedSql, expandedParams);
    } catch (err) {
      logger.error('Expanded matching query failed, using initial results:', err.message);
    }
  }

  // Step 5: If no proximity data, fall back to city/pincode matching
  if (!useProximity && donors.length === 0) {
    logger.info('Falling back to city/pincode matching');
    const fallbackGroups = urgency === 'critical' ? COMPATIBILITY_MAP[blood_group_needed] : [blood_group_needed];

    const fallbackSql = `
      SELECT d.*, u.full_name, u.phone, u.email, u.id as user_id
      FROM donors d
      JOIN users u ON d.user_id = u.id
      WHERE d.blood_group IN (?)
        AND d.is_available = 1
        AND d.notification_opt_in = 1
        AND u.is_active = 1
        AND (d.last_donation_date IS NULL OR DATEDIFF(NOW(), d.last_donation_date) >= 56)
        AND (d.city = ? OR d.pincode = ?)
        AND d.id NOT IN (
          SELECT dr.donor_id FROM donor_responses dr
          WHERE dr.sms_sent_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
          GROUP BY dr.donor_id
          HAVING COUNT(*) >= ?
        )
      ORDER BY FIELD(d.blood_group, ?) ASC, d.created_at DESC
      LIMIT 20
    `;

    donors = await query(fallbackSql, [
      fallbackGroups,
      hospital_city,
      hospital_pincode,
      parseInt(process.env.SMS_RATE_LIMIT_PER_DAY, 10) || 3,
      blood_group_needed
    ]);
  }

  logger.info(`Found ${donors.length} matching donors for request #${request.id}`);
  return donors;
}

/**
 * Get search radius based on urgency level.
 */
function getSearchRadius(urgency) {
  const radiusMap = {
    critical: 15,
    urgent: 25,
    standard: 50
  };
  return radiusMap[urgency] || parseInt(process.env.MATCHING_RADIUS_KM, 10) || 25;
}

module.exports = { findMatchingDonors, COMPATIBILITY_MAP };
