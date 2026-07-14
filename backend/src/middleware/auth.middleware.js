const { verifyToken } = require('../utils/jwt.util');

/**
 * Verifies the JWT from the Authorization header and attaches the decoded
 * payload (userId, schoolId, role) to req.auth. Every downstream handler
 * must derive schoolId from req.auth.schoolId — never from req.body/params.
 */
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    const payload = verifyToken(token);
    req.auth = {
      userId: payload.userId,
      schoolId: payload.schoolId,
      role: payload.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Restricts a route to a set of roles. Must run after authenticateUser.
 */
function authorizeRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

/**
 * Makes req.schoolId available for controllers, sourced only from the
 * verified JWT payload. This is the single source of truth for tenant
 * scoping — controllers must use req.schoolId in every where clause.
 */
function scopeToSchool(req, res, next) {
  if (!req.auth || !req.auth.schoolId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.schoolId = req.auth.schoolId;
  next();
}

module.exports = { authenticateUser, authorizeRole, scopeToSchool };
