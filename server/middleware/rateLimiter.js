

const rateLimit =
    require("express-rate-limit");


// =========================================================
// GENERAL API RATE LIMITER
// =========================================================
//
// Limits repeated requests to the API.
//
// 100 requests per 15 minutes per IP.
//
// =========================================================

const apiLimiter =
    rateLimit({
        windowMs:
            15 * 60* 1000,

        limit: 100,

        standardHeaders:
            "draft-8",

        legacyHeaders:
            false,

        message: {
            success: false,
            message:
                "Too many requests. Please try again later."
        }
    });


// =========================================================
// AUTH RATE LIMITER
// =========================================================
//
// Login and registration need stricter protection.
//
// 10 attempts per 15 minutes per IP.
//
// =========================================================

const authLimiter =
    rateLimit({
        windowMs:
            15 * 60 * 1000,

        limit: 10,

        standardHeaders:
            "draft-8",

        legacyHeaders:
            false,

        message: {
            success: false,
            message:
                "Too many authentication attempts. Please try again later."
        }
    });


// =========================================================
// EXPORT
// =========================================================

module.exports = {
    apiLimiter,
    authLimiter
};

