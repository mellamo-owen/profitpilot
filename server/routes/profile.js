 
const express = require("express");

const User =
    require("../models/User");

const authenticateUser =
    require("../middleware/auth");

const router =
    express.Router();


// =========================================================
// GET PROFILE
// =========================================================

router.get(
    "/",
    authenticateUser,
    async function (req, res) {

        try {

            const user =
                await User.findById(
                    req.userId
                ).select(
                    "-password"
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User profile not found."
                });
            }


            return res.json({

                success: true,

                profile:
                    user
            });


        } catch (error) {

            console.error(
                "Get profile error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load profile."
            });
        }
    }
);


// =========================================================
// UPDATE PROFILE
// =========================================================
//
// Users can update their business information.
//
// Sensitive account fields such as:
//
// role
// accountStatus
// plan
// subscriptionStatus
// subscription dates
//
// are intentionally NOT accepted.
//
// =========================================================

router.put(
    "/",
    authenticateUser,
    async function (req, res) {

        try {

            const {
                name,
                businessName,
                businessType,
                phone,
                location,
                businessDescription
            } = req.body;


            const user =
                await User.findById(
                    req.userId
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User profile not found."
                });
            }


            // =================================================
            // NAME
            // =================================================

            if (
                name !== undefined
            ) {

                const cleanName =
                    String(
                        name
                    ).trim();


                if (
                    cleanName.length <
                    2
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Name must contain at least 2 characters."
                    });
                }


                if (
                    cleanName.length >
                    80
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Name is too long."
                    });
                }


                user.name =
                    cleanName;
            }


            // =================================================
            // BUSINESS NAME
            // =================================================

            if (
                businessName !== undefined
            ) {

                const cleanBusinessName =
                    String(
                        businessName
                    ).trim();


                if (
                    cleanBusinessName.length >
                    100
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Business name is too long."
                    });
                }


                user.businessName =
                    cleanBusinessName;
            }


            // =================================================
            // BUSINESS TYPE
            // =================================================

            if (
                businessType !== undefined
            ) {

                const cleanBusinessType =
                    String(
                        businessType
                    ).trim();


                if (
                    cleanBusinessType.length >
                    80
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Business type is too long."
                    });
                }


                user.businessType =
                    cleanBusinessType;
            }


            // =================================================
            // PHONE
            // =================================================

            if (
                phone !== undefined
            ) {

                const cleanPhone =
                    String(
                        phone
                    ).trim();


                if (
                    cleanPhone.length >
                    30
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Phone number is too long."
                    });
                }


                user.phone =
                    cleanPhone;
            }


            // =================================================
            // LOCATION
            // =================================================

            if (
                location !== undefined
            ) {

                const cleanLocation =
                    String(
                        location
                    ).trim();


                if (
                    cleanLocation.length >
                    120
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Location is too long."
                    });
                }


                user.location =
                    cleanLocation;
            }


            // =================================================
            // BUSINESS DESCRIPTION
            // =================================================

            if (
                businessDescription !==
                undefined
            ) {

                const cleanDescription =
                    String(
                        businessDescription
                    ).trim();


                if (
                    cleanDescription.length >
                    500
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Business description is too long."
                    });
                }


                user.businessDescription =
                    cleanDescription;
            }


            // =================================================
            // SAVE
            // =================================================

            await user.save();


            // =================================================
            // SAFE RESPONSE
            // =================================================

            return res.json({

                success: true,

                message:
                    "Business profile updated successfully.",

                profile: {

                    id:
                        user._id,

                    name:
                        user.name,

                    email:
                        user.email,

                    businessName:
                        user.businessName,

                    businessType:
                        user.businessType,

                    phone:
                        user.phone,

                    location:
                        user.location,

                    businessDescription:
                        user.businessDescription,

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
                }
            });


        } catch (error) {

            console.error(
                "Update profile error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to update profile."
            });
        }
    }
);


// =========================================================
// EXPORT
// =========================================================

module.exports =
    router;
