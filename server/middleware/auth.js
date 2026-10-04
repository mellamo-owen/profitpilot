
const jwt = require("jsonwebtoken");

const User =
    require("../models/User");


// =========================================================
// AUTHENTICATE USER
// =========================================================

async function authenticateUser(
    req,
    res,
    next
) {
    try {

        // =================================================
        // GET AUTHORIZATION HEADER
        // =================================================

        const authHeader =
            req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication required."
            });
        }


        // =================================================
        // CHECK BEARER FORMAT
        // =================================================

        const parts =
            authHeader.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer" ||
            !parts[1]
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid authentication format."
            });
        }


        const token =
            parts[1];


        // =================================================
        // VERIFY TOKEN
        // =================================================

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        if (!decoded.userId) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid authentication token."
            });
        }


        // =================================================
        // FIND USER
        // =================================================

        const user =
            await User.findById(
                decoded.userId
            ).select(
                "_id name email role accountStatus plan subscriptionStatus subscriptionStartDate subscriptionEndDate"
            );


        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "User account not found."
            });
        }


        // =================================================
        // CHECK ACCOUNT STATUS
        // =================================================

        if (
            user.accountStatus !==
            "active"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Your account has been disabled."
            });
        }


        // =================================================
        // ATTACH USER TO REQUEST
        // =================================================

        req.userId =
            user._id.toString();

        req.user =
            user;


        // =================================================
        // CONTINUE
        // =================================================

        next();

    } catch (error) {

        // JWT errors and authentication
        // failures are intentionally
        // returned with a generic message.

        return res.status(401).json({
            success: false,
            message:
                "Invalid or expired token."
        });
    }
}


module.exports =
    authenticateUser;
