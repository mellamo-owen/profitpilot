
const express = require("express");

const User =
    require("../models/User");

const Subscription =
    require("../models/Subscription");

const authenticateUser =
    require("../middleware/auth");

const router =
    express.Router();


// =========================================================
// PREMIUM PLAN CONFIGURATION
// =========================================================

const PREMIUM_PRICE = 500;

const PREMIUM_DURATION_DAYS = 30;


// =========================================================
// HELPER — CALCULATE END DATE
// =========================================================

function calculateEndDate(
    startDate
) {
    const endDate =
        new Date(startDate);

    endDate.setDate(
        endDate.getDate() +
        PREMIUM_DURATION_DAYS
    );

    return endDate;
}


// =========================================================
// GET SUBSCRIPTION
// =========================================================

router.get(
    "/",
    authenticateUser,
    async function (req, res) {

        try {

            const subscription =
                await Subscription.findOne({

                    userId:
                        req.userId,

                    status: {
                        $in: [
                            "pending",
                            "active",
                            "cancelled"
                        ]
                    }

                }).sort({

                    createdAt:
                        -1

                });


            return res.json({

                success: true,

                plan:
                    req.user.plan,

                subscriptionStatus:
                    req.user.subscriptionStatus,

                subscription:
                    subscription || null
            });


        } catch (error) {

            console.error(
                "Get subscription error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load subscription information."
            });
        }
    }
);


// =========================================================
// CREATE SUBSCRIPTION REQUEST
// =========================================================
//
// This does NOT confirm payment.
//
// It creates a pending subscription that can later
// be confirmed by an admin or payment provider.
//
// =========================================================

router.post(
    "/subscribe",
    authenticateUser,
    async function (req, res) {

        try {

            const user =
                await User.findById(
                    req.userId
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User account not found."
                });
            }


            // =================================================
            // ALREADY PREMIUM
            // =================================================

            if (
                user.plan === "premium" &&
                user.subscriptionStatus ===
                    "active"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Your Premium subscription is already active."
                });
            }


            // =================================================
            // GET PAYMENT REFERENCE
            // =================================================

            const paymentReference =
                String(
                    req.body.paymentReference ||
                    ""
                ).trim();


            // =================================================
            // CREATE PENDING SUBSCRIPTION
            // =================================================

            const subscription =
                await Subscription.create({

                    userId:
                        user._id,

                    plan:
                        "premium",

                    status:
                        "pending",

                    paymentProvider:
                        "manual",

                    paymentReference:
                        paymentReference,

                    amount:
                        PREMIUM_PRICE,

                    currency:
                        "KES",

                    startDate:
                        null,

                    endDate:
                        null
                });


            return res.status(201).json({

                success: true,

                message:
                    "Premium subscription request submitted. Payment confirmation is required before Premium access is activated.",

                subscription:
                    subscription
            });


        } catch (error) {

            console.error(
                "Create subscription error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to create subscription request."
            });
        }
    }
);


// =========================================================
// CANCEL SUBSCRIPTION
// =========================================================

router.post(
    "/cancel",
    authenticateUser,
    async function (req, res) {

        try {

            const subscription =
                await Subscription.findOne({

                    userId:
                        req.userId,

                    status:
                        "active"

                }).sort({

                    createdAt:
                        -1

                });


            if (!subscription) {

                return res.status(404).json({

                    success: false,

                    message:
                        "No active subscription found."
                });
            }


            subscription.status =
                "cancelled";

            subscription.cancelledAt =
                new Date();

            subscription.cancellationReason =
                String(
                    req.body.reason ||
                    "Cancelled by user"
                ).trim();


            await subscription.save();


            return res.json({

                success: true,

                message:
                    "Subscription cancelled. Premium access remains available until the subscription end date.",

                subscription:
                    subscription
            });


        } catch (error) {

            console.error(
                "Cancel subscription error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to cancel subscription."
            });
        }
    }
);


// =========================================================
// ADMIN-STYLE ACTIVATION HELPER
// =========================================================
//
// This endpoint is intentionally NOT exposed as an
// ordinary user endpoint.
//
// It will be used by the admin route later.
//
// =========================================================

async function activatePremiumSubscription(
    subscriptionId
) {

    const subscription =
        await Subscription.findById(
            subscriptionId
        );


    if (!subscription) {
        throw new Error(
            "Subscription not found."
        );
    }


    const startDate =
        new Date();

    const endDate =
        calculateEndDate(
            startDate
        );


    subscription.status =
        "active";

    subscription.startDate =
        startDate;

    subscription.endDate =
        endDate;


    await subscription.save();


    const user =
        await User.findById(
            subscription.userId
        );


    if (!user) {
        throw new Error(
            "Subscription user not found."
        );
    }


    user.plan =
        "premium";

    user.subscriptionStatus =
        "active";

    user.subscriptionStartDate =
        startDate;

    user.subscriptionEndDate =
        endDate;


    await user.save();


    return {
        subscription,
        user
    };
}


// =========================================================
// EXPORT
// =========================================================

module.exports = {
    router,
    activatePremiumSubscription
};
