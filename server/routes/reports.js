
const express = require("express");

const Report =
    require("../models/Report");

const authenticateUser =
    require("../middleware/auth");

const router =
    express.Router();


// =========================================================
// PLAN LIMITS
// =========================================================

const FREE_REPORT_LIMIT = 5;


// =========================================================
// HELPER — VALIDATE NUMBER
// =========================================================

function isValidNumber(
    value
) {
    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
    );
}


// =========================================================
// CREATE REPORT
// =========================================================

router.post(
    "/",
    authenticateUser,
    async function (req, res) {

        try {

            const user =
                req.user;


            // =================================================
            // CHECK FREE PLAN LIMIT
            // =================================================

            if (
                user.plan === "free"
            ) {

                const reportCount =
                    await Report.countDocuments({
                        userId:
                            req.userId
                    });


                if (
                    reportCount >=
                    FREE_REPORT_LIMIT
                ) {

                    return res.status(403).json({

                        success: false,

                        code:
                            "REPORT_LIMIT_REACHED",

                        message:
                            "You have reached the Free plan limit of 5 saved reports. Upgrade to Premium for unlimited reports."
                    });
                }
            }


            // =================================================
            // GET INPUT
            // =================================================

            const {
                businessName,
                businessType,
                revenueValue,
                productCostsValue,
                operatingExpensesValue,
                totalCostsValue,
                profitValue,
                marginValue,
                breakEvenUnits,
                breakEvenRevenue
            } = req.body;


            // =================================================
            // TEXT VALIDATION
            // =================================================

            const cleanBusinessName =
                String(
                    businessName || ""
                ).trim();

            const cleanBusinessType =
                String(
                    businessType || ""
                ).trim();


            if (
                !cleanBusinessName
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Business name is required."
                });
            }


            if (
                cleanBusinessName.length >
                80
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Business name is too long."
                });
            }


            if (
                !cleanBusinessType
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Business type is required."
                });
            }


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


            // =================================================
            // NUMBER VALIDATION
            // =================================================

            const financialValues = [

                revenueValue,

                productCostsValue,

                operatingExpensesValue,

                totalCostsValue,

                breakEvenUnits,

                breakEvenRevenue

            ];


            for (
                const value
                of financialValues
            ) {

                if (
                    !isValidNumber(
                        value
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Financial values must be valid non-negative numbers."
                    });
                }
            }


            // =================================================
            // PROFIT VALIDATION
            // =================================================

            if (
                typeof profitValue !==
                    "number" ||
                !Number.isFinite(
                    profitValue
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Profit must be a valid number."
                });
            }


            // =================================================
            // MARGIN VALIDATION
            // =================================================

            if (
                typeof marginValue !==
                    "number" ||
                !Number.isFinite(
                    marginValue
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Profit margin must be a valid number."
                });
            }


            // =================================================
            // CREATE REPORT
            // =================================================

            const report =
                await Report.create({

                    userId:
                        req.userId,

                    businessName:
                        cleanBusinessName,

                    businessType:
                        cleanBusinessType,

                    revenueValue:
                        revenueValue,

                    productCostsValue:
                        productCostsValue,

                    operatingExpensesValue:
                        operatingExpensesValue,

                    totalCostsValue:
                        totalCostsValue,

                    profitValue:
                        profitValue,

                    marginValue:
                        marginValue,

                    breakEvenUnits:
                        breakEvenUnits,

                    breakEvenRevenue:
                        breakEvenRevenue
                });


            // =================================================
            // RESPONSE
            // =================================================

            return res.status(201).json({

                success: true,

                message:
                    "Report saved successfully.",

                report:
                    report
            });


        } catch (error) {

            console.error(
                "Create report error:",
                error.message
            );


            return res.status(400).json({

                success: false,

                message:
                    "Failed to save report."
            });
        }
    }
);


// =========================================================
// GET USER REPORTS
// =========================================================

router.get(
    "/",
    authenticateUser,
    async function (req, res) {

        try {

            const reports =
                await Report.find({

                    userId:
                        req.userId

                }).sort({

                    createdAt:
                        -1

                });


            return res.json({

                success: true,

                count:
                    reports.length,

                reports:
                    reports
            });


        } catch (error) {

            console.error(
                "Get reports error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to fetch reports."
            });
        }
    }
);


// =========================================================
// GET SINGLE REPORT
// =========================================================

router.get(
    "/:id",
    authenticateUser,
    async function (req, res) {

        try {

            const report =
                await Report.findOne({

                    _id:
                        req.params.id,

                    userId:
                        req.userId

                });


            if (!report) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Report not found."
                });
            }


            return res.json({

                success: true,

                report:
                    report
            });


        } catch (error) {

            console.error(
                "Get single report error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to fetch report."
            });
        }
    }
);


// =========================================================
// DELETE REPORT
// =========================================================

router.delete(
    "/:id",
    authenticateUser,
    async function (req, res) {

        try {

            const deletedReport =
                await Report.findOneAndDelete({

                    _id:
                        req.params.id,

                    userId:
                        req.userId

                });


            if (!deletedReport) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Report not found."
                });
            }


            return res.json({

                success: true,

                message:
                    "Report deleted successfully."
            });


        } catch (error) {

            console.error(
                "Delete report error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to delete report."
            });
        }
    }
);


// =========================================================
// EXPORT
// =========================================================

module.exports =
    router;