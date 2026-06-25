const { query } = require('../config/db');
const { asyncHandler } = require('../utils/helpers');

// Simple in-memory cache for public stats
let statsCache = null;
let statsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/stats/public
 * Public statistics for the home page.
 */
const getPublicStats = asyncHandler(async (req, res) => {
  const now = Date.now();

  // Cache removed for live updates

  const [totalDonors, fulfilledRequests, totalRequests, bloodGroupAvailability] = await Promise.all([
    query('SELECT COUNT(*) as count FROM donors d JOIN users u ON d.user_id = u.id WHERE u.is_active = 1'),
    query("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'fulfilled'"),
    query("SELECT COUNT(*) as count FROM blood_requests"),
    query(`
      SELECT blood_group, COUNT(*) as available_count
      FROM donors
      WHERE is_available = 1
      GROUP BY blood_group
      ORDER BY FIELD(blood_group, 'A+','A-','B+','B-','AB+','AB-','O+','O-')
    `)
  ]);

  const data = {
    total_donors: totalDonors[0].count,
    total_requests: totalRequests[0].count,
    requests_fulfilled: fulfilledRequests[0].count,
    lives_saved: fulfilledRequests[0].count,
    blood_group_availability: bloodGroupAvailability
  };

  // Cache the result
  statsCache = data;
  statsCacheTime = now;

  res.json({ success: true, data });
});

/**
 * GET /api/stats/public/donors
 * Public list of donors by blood group.
 */
const getPublicDonorsByGroup = asyncHandler(async (req, res) => {
  const { blood_group } = req.query;
  if (!blood_group) {
    return res.status(400).json({ success: false, message: 'Blood group is required.' });
  }

  const donors = await query(`
    SELECT u.full_name, u.phone, d.blood_group, d.city, d.state, d.gender, d.date_of_birth
    FROM donors d
    JOIN users u ON d.user_id = u.id
    WHERE d.is_available = 1 AND u.is_active = 1 AND d.blood_group = ?
    ORDER BY d.created_at DESC
    LIMIT 100
  `, [blood_group]);

  const { calculateAge } = require('../utils/helpers');

  // Mask phone number for privacy
  const formattedDonors = donors.map(d => {
    let maskedPhone = d.phone;
    if (d.phone && d.phone.length >= 10) {
      const last4 = d.phone.slice(-4);
      maskedPhone = d.phone.slice(0, d.phone.length - 8) + '****' + last4;
    }

    return {
      name: d.full_name,
      phone: maskedPhone,
      blood_group: d.blood_group,
      city: d.city,
      state: d.state,
      gender: d.gender,
      age: calculateAge(d.date_of_birth)
    };
  });

  res.json({ success: true, data: formattedDonors });
});

module.exports = { getPublicStats, getPublicDonorsByGroup };
