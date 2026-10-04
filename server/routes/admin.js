
const express = require("express");

const User =
    require("../models/User");

const Report =
    require("../models/Report");

const Subscription =
    require("../models/Subscription");

const authenticateUser =
    require("../middleware/auth");

const requireAdmin =
    require("../middleware/admin");

const {
    activatePremiumSubscription
} = require("./subscription");

const router =
    express.Router();


// =========================================================
// ADMIN PROTECTION
// =========================================================

router.use(
    authenticateUser,
    requireAdmin
);


// =========================================================
// PLATFORM STATISTICS
// =========================================================

router.get(
    "/stats",
    async function (req, res) {

        try {

            const [
                totalUsers,
                activeUsers,
                disabledUsers,
                premiumUsers,
                totalReports,
                totalSubscriptions,
                activeSubscriptions
            ] = await Promise.all([

                User.countDocuments(),

                User.countDocuments({
                    accountStatus:
                        "active"
                }),

                User.countDocuments({
                    accountStatus:
                        "disabled"
                }),

                User.countDocuments({
                    plan:
                        "premium"
                }),

                Report.countDocuments(),

                Subscription.countDocuments(),

                Subscription.countDocuments({
                    status:
                        "active"
                })
            ]);


            return res.json({

                success: true,

                stats: {

                    totalUsers,

                    activeUsers,

                    disabledUsers,

                    premiumUsers,

                    freeUsers:
                        totalUsers -
                        premiumUsers,

                    totalReports,

                    totalSubscriptions,

                    activeSubscriptions
                }
            });


        } catch (error) {

            console.error(
                "Admin statistics error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load platform statistics."
            });
        }
    }
);


// =========================================================
// GET ALL USERS
// =========================================================

router.get(
    "/users",
    async function (req, res) {

        try {

            const users =
                await User.find()
                    .select(
                        "-password"
                    )
                    .sort({
                        createdAt:
                            -1
                    });


            return res.json({

                success: true,

                count:
                    users.length,

                users
            });


        } catch (error) {

            console.error(
                "Admin users error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load users."
            });
        }
    }
);


// =========================================================
// GET SINGLE USER
// =========================================================

router.get(
    "/users/:id",
    async function (req, res) {

        try {

            const user =
                await User.findById(
                    req.params.id
                )
                    .select(
                        "-password"
                    );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."
                });
            }


            const [
                reports,
                subscriptions
            ] = await Promise.all([

                Report.find({
                    userId:
                        user._id
                }).sort({
                    createdAt:
                        -1
                }),

                Subscription.find({
                    userId:
                        user._id
                }).sort({
                    createdAt:
                        -1
                })
            ]);


            return res.json({

                success: true,

                user,

                reports,

                subscriptions
            });


        } catch (error) {

            console.error(
                "Admin user details error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load user details."
            });
        }
    }
);


// =========================================================
// DISABLE USER
// =========================================================

router.patch(
    "/users/:id/disable",
    async function (req, res) {

        try {

            // Prevent an administrator from
            // accidentally disabling themselves.

            if (
                req.params.id ===
                req.userId
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "You cannot disable your own administrator account."
                });
            }


            const user =
                await User.findByIdAndUpdate(

                    req.params.id,

                    {
                        accountStatus:
                            "disabled"
                    },

                    {
                        new: true
                    }
                )
                    .select(
                        "-password"
                    );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."
                });
            }


            return res.json({

                success: true,

                message:
                    "User account disabled successfully.",

                user
            });


        } catch (error) {

            console.error(
                "Disable user error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to disable user."
            });
        }
    }
);


// =========================================================
// RESTORE USER
// =========================================================

router.patch(
    "/users/:id/restore",
    async function (req, res) {

        try {

            const user =
                await User.findByIdAndUpdate(

                    req.params.id,

                    {
                        accountStatus:
                            "active"
                    },

                    {
                        new: true
                    }
                )
                    .select(
                        "-password"
                    );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."
                });
            }


            return res.json({

                success: true,

                message:
                    "User account restored successfully.",

                user
            });


        } catch (error) {

            console.error(
                "Restore user error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to restore user."
            });
        }
    }
);


// =========================================================
// ACTIVATE PREMIUM SUBSCRIPTION
// =========================================================

router.patch(
    "/subscriptions/:id/activate",
    async function (req, res) {

        try {

            const result =
                await activatePremiumSubscription(
                    req.params.id
                );


            return res.json({

                success: true,

                message:
                    "Premium subscription activated successfully.",

                subscription:
                    result.subscription,

                user: {

                    id:
                        result.user._id,

                    name:
                        result.user.name,

                    email:
                        result.user.email,

                    plan:
                        result.user.plan,

                    subscriptionStatus:
                        result.user.subscriptionStatus,

                    subscriptionStartDate:
                        result.user.subscriptionStartDate,

                    subscriptionEndDate:
                        result.user.subscriptionEndDate
                }
            });


        } catch (error) {

            console.error(
                "Activate subscription error:",
                error.message
            );


            return res.status(400).json({

                success: false,

                message:
                    error.message ||
                    "Failed to activate subscription."
            });
        }
    }
);


// =========================================================
// GET ALL SUBSCRIPTIONS
// =========================================================

router.get(
    "/subscriptions",
    async function (req, res) {

        try {

            const subscriptions =
                await Subscription.find()
                    .populate(
                        "userId",
                        "name email businessName"
                    )
                    .sort({
                        createdAt:
                            -1
                    });


            return res.json({

                success: true,

                count:
                    subscriptions.length,

                subscriptions
            });


        } catch (error) {

            console.error(
                "Admin subscriptions error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load subscriptions."
            });
        }
    }
);


// =========================================================
// GET ALL REPORTS
// =========================================================

router.get(
    "/reports",
    async function (req, res) {

        try {

            const reports =
                await Report.find()
                    .populate(
                        "userId",
                        "name email businessName"
                    )
                    .sort({
                        createdAt:
                            -1
                    });


            return res.json({

                success: true,

                count:
                    reports.length,

                reports
            });


        } catch (error) {

            console.error(
                "Admin reports error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load reports."
            });
        }
    }
);


// =========================================================
// EXPORT
// =========================================================

module.exports =
    router;
