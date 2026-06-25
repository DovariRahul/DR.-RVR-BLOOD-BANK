const { query, queryOne } = require('../config/db');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError } = require('../utils/errors');
const { logger } = require('../utils/logger');

/**
 * GET /api/admin/analytics
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const [
    totalRequests,
    activeRequests,
    totalDonors,
    availableDonors,
    fulfilledRequests,
    avgResponseTime,
    monthlyRequests,
    bloodGroupDemand,
    cityDistribution,
    monthlyTrend
  ] = await Promise.all([
    queryOne('SELECT COUNT(*) as count FROM blood_requests'),
    queryOne("SELECT COUNT(*) as count FROM blood_requests WHERE status IN ('pending','matching','matched')"),
    queryOne('SELECT COUNT(*) as count FROM donors'),
    queryOne('SELECT COUNT(*) as count FROM donors WHERE is_available = 1'),
    queryOne("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'fulfilled'"),
    queryOne("SELECT AVG(TIMESTAMPDIFF(MINUTE, sms_sent_at, response_time)) as avg_minutes FROM donor_responses WHERE response != 'no_response' AND response_time IS NOT NULL"),
    queryOne('SELECT COUNT(*) as count FROM blood_requests WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())'),
    query("SELECT blood_group_needed as blood_group, COUNT(*) as count FROM blood_requests GROUP BY blood_group_needed ORDER BY count DESC"),
    query("SELECT d.city, COUNT(*) as donors FROM donors d JOIN users u ON d.user_id = u.id WHERE u.is_active = 1 GROUP BY d.city ORDER BY donors DESC LIMIT 10"),
    query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
             COUNT(*) as requests,
             SUM(CASE WHEN status = 'fulfilled' THEN 1 ELSE 0 END) as fulfilled
      FROM blood_requests
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `)
  ]);

  const matchSuccessRate = totalRequests.count > 0
    ? ((fulfilledRequests.count / totalRequests.count) * 100).toFixed(1)
    : 0;

  res.json({
    success: true,
    data: {
      total_requests: totalRequests.count,
      active_requests: activeRequests.count,
      total_donors: totalDonors.count,
      available_donors: availableDonors.count,
      match_success_rate: parseFloat(matchSuccessRate),
      avg_response_time_minutes: Math.round(avgResponseTime.avg_minutes || 0),
      requests_this_month: monthlyRequests.count,
      blood_group_demand: bloodGroupDemand,
      city_distribution: cityDistribution,
      monthly_trend: monthlyTrend
    }
  });
});

/**
 * GET /api/admin/requests/active
 */
const getActiveRequests = asyncHandler(async (req, res) => {
  const requests = await query(`
    SELECT br.*, u.full_name as requester_name, u.phone as requester_phone
    FROM blood_requests br
    JOIN users u ON br.requester_id = u.id
    WHERE br.status IN ('pending', 'matching', 'matched')
    ORDER BY
      FIELD(br.urgency, 'critical', 'urgent', 'standard') ASC,
      br.created_at DESC
  `);

  res.json({ success: true, data: { requests } });
});

/**
 * PATCH /api/admin/users/:id
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_active, role } = req.body;

  const user = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) throw new NotFoundError('User');

  const updates = [];
  const values = [];

  if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
  if (role) { updates.push('role = ?'); values.push(role); }

  if (updates.length === 0) {
    return res.json({ success: true, message: 'No changes made.' });
  }

  values.push(id);
  await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

  // Audit log
  await query(
    `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
     VALUES (?, ?, 'user', ?, ?)`,
    [req.user.id, is_active === false ? 'ban_user' : 'update_user', id, JSON.stringify(req.body)]
  );

  logger.info(`Admin #${req.user.id} updated user #${id}:`, req.body);

  res.json({
    success: true,
    message: `User #${id} updated successfully.`
  });
});

/**
 * GET /api/admin/audit-log
 */
const getAuditLog = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  const offset = (pageNum - 1) * limitNum;

  const [logs, countResult] = await Promise.all([
    query(
      `SELECT al.*, u.full_name as admin_name
       FROM admin_audit_log al
       JOIN users u ON al.admin_id = u.id
       ORDER BY al.performed_at DESC
       LIMIT ? OFFSET ?`,
      [limitNum, offset]
    ),
    queryOne('SELECT COUNT(*) as total FROM admin_audit_log')
  ]);

  res.json({
    success: true,
    data: {
      logs,
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
 * GET /api/admin/users
 */
const getUsers = asyncHandler(async (req, res) => {
  const { role, is_active, search, page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];

  if (role) { conditions.push('role = ?'); params.push(role); }
  if (is_active !== undefined) { conditions.push('is_active = ?'); params.push(is_active === 'true' ? 1 : 0); }
  if (search) {
    conditions.push('(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [users, countResult] = await Promise.all([
    query(
      `SELECT id, full_name, email, phone, role, is_verified, is_active, created_at
       FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    ),
    queryOne(`SELECT COUNT(*) as total FROM users ${whereClause}`, params)
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult.total,
        total_pages: Math.ceil(countResult.total / limitNum)
      }
    }
  });
});

module.exports = { getAnalytics, getActiveRequests, updateUser, getAuditLog, getUsers };
