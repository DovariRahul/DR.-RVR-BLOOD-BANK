/**
 * Wraps an async route handler to catch errors and pass to Express error middleware.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Format a phone number to E.164 (Indian numbers).
 * Accepts: 9876543210, 09876543210, +919876543210
 */
function formatPhoneE164(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('0')) return `+91${cleaned.slice(1)}`;
  return `+${cleaned}`;
}

/**
 * Calculate age from a date of birth.
 */
function calculateAge(dob) {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calculate days since a given date.
 */
function daysSince(date) {
  if (!date) return Infinity;
  const d = new Date(date);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

module.exports = { asyncHandler, formatPhoneE164, calculateAge, daysSince };
