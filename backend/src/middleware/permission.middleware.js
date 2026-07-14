const { userHasPermission } = require('../controllers/permission.controller');

/**
 * Allows a route if the user's role is in `roles` OR they've been granted
 * `permissionKey` specifically (via UserPermission). Must run after
 * authenticateUser + scopeToSchool. This is the additive layer on top of
 * the fixed Role enum — it never replaces authorizeRole, only widens it
 * for the specific users an owner/admin has chosen to grant extra access.
 */
function authorizeRoleOrPermission(roles, permissionKey) {
  return async (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' });
    if (roles.includes(req.auth.role)) return next();

    const allowed = await userHasPermission(req.schoolId, req.auth.userId, permissionKey);
    if (!allowed) return res.status(403).json({ error: 'Forbidden: insufficient role or permission' });
    return next();
  };
}

module.exports = { authorizeRoleOrPermission };
