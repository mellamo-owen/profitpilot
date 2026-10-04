
// =========================================================
// ADMIN AUTHORIZATION
// =========================================================
//
// This middleware should be used AFTER authenticateUser.
//
// Example:
//
// router.get(
//     "/users",
//     authenticateUser,
//     requireAdmin,
//     handler
// );
//
// =========================================================

function requireAdmin(
    req,
    res,
    next
) {

    // =====================================================
    // CHECK AUTHENTICATED USER
    // =====================================================

    if (!req.user) {
        return res.status(401).json({
            success: false,
            message:
                "Authentication required."
        });
    }


    // =====================================================
    // CHECK ADMIN ROLE
    // =====================================================

    if (
        req.user.role !==
        "admin"
    ) {
        return res.status(403).json({
            success: false,
            message:
                "Administrator access required."
        });
    }


    // =====================================================
    // CONTINUE
    // =====================================================

    next();
}


module.exports =
    requireAdmin;
