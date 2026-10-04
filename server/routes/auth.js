
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User =
    require("../models/User");

const {
    authLimiter
} = require("../middleware/rateLimiter");

const router =
    express.Router();


// =========================================================
// HELPER FUNCTIONS
// =========================================================

function normalizeEmail(
    email
) {
    return String(email)
        .trim()
        .toLowerCase();
}


function createToken(
    user
) {
    return jwt.sign(
        {
            userId:
                user._id.toString()
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}


function publicUser(
    user
) {
    return {
        id:
            user._id,

        name:
            user.name,

        email:
            user.email,

        role:
            user.role,

        accountStatus:
            user.accountStatus,

        plan:
            user.plan,

        subscriptionStatus:
            user.subscriptionStatus,

        subscriptionStartDate:
            user.subscriptionStartDate,

        subscriptionEndDate:
            user.subscriptionEndDate
    };
}


// =========================================================
// REGISTER
// =========================================================

router.post(
    "/register",
    authLimiter,
    async function (req, res) {

        try {

            const {
                name,
                email,
                password
            } = req.body;


            // =================================================
            // BASIC VALIDATION
            // =================================================

            if (
                !name ||
                !email ||
                !password
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Name, email and password are required."
                });
            }


            const cleanName =
                String(name).trim();

            const cleanEmail =
                normalizeEmail(email);


            if (
                cleanName.length < 2
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Name must contain at least 2 characters."
                });
            }


            if (
                cleanName.length > 80
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Name is too long."
                });
            }


            // =================================================
            // EMAIL VALIDATION
            // =================================================

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (
                !emailPattern.test(
                    cleanEmail
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please provide a valid email address."
                });
            }


            // =================================================
            // PASSWORD VALIDATION
            // =================================================

            if (
                password.length < 8
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 8 characters."
                });
            }


            if (
                password.length > 128
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password is too long."
                });
            }


            // =================================================
            // CHECK EXISTING ACCOUNT
            // =================================================

            const existingUser =
                await User.findOne({
                    email:
                        cleanEmail
                });


            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message:
                        "An account with this email already exists."
                });
            }


            // =================================================
            // HASH PASSWORD
            // =================================================

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    12
                );


            // =================================================
            // CREATE USER
            // =================================================

            const user =
                await User.create({

                    name:
                        cleanName,

                    email:
                        cleanEmail,

                    password:
                        hashedPassword,

                    role:
                        "user",

                    accountStatus:
                        "active",

                    plan:
                        "free",

                    subscriptionStatus:
                        "inactive"
                });


            // =================================================
            // CREATE TOKEN
            // =================================================

            const token =
                createToken(
                    user
                );


            // =================================================
            // RESPONSE
            // =================================================

            return res.status(201).json({

                success: true,

                message:
                    "Account created successfully.",

                token:

                    token,

                user:

                    publicUser(
                        user
                    )
            });


        } catch (error) {

            console.error(
                "Registration error:",
                error.message
            );


            return res.status(500).json({
                success: false,
                message:
                    "Failed to create account."
            });
        }
    }
);


// =========================================================
// LOGIN
// =========================================================

router.post(
    "/login",
    authLimiter,
    async function (req, res) {

        try {

            const {
                email,
                password
            } = req.body;


            // =================================================
            // BASIC VALIDATION
            // =================================================

            if (
                !email ||
                !password
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Email and password are required."
                });
            }


            const cleanEmail =
                normalizeEmail(
                    email
                );


            // =================================================
            // FIND USER
            // =================================================

            const user =
                await User.findOne({
                    email:
                        cleanEmail
                });


            if (!user) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
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
                        "This account has been disabled."
                });
            }


            // =================================================
            // CHECK PASSWORD
            // =================================================

            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password."
                });
            }


            // =================================================
            // CREATE TOKEN
            // =================================================

            const token =
                createToken(
                    user
                );


            // =================================================
            // RESPONSE
            // =================================================

            return res.json({

                success: true,

                message:
                    "Login successful.",

                token:
                    token,

                user:
                    publicUser(
                        user
                    )
            });


        } catch (error) {

            console.error(
                "Login error:",
                error.message
            );


            return res.status(500).json({
                success: false,
                message:
                    "Login failed."
            });
        }
    }
);


// =========================================================
// EXPORT
// =========================================================

module.exports =
    router;
