const mongoose = require("mongoose");


// =========================
// REPORT SCHEMA
// =========================

const reportSchema = new mongoose.Schema(
    {
        // The user who owns this report
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Business information
        businessName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },

        businessType: {
            type: String,
            required: true,
            default: "main"
        },

        // Financial calculations
        revenueValue: {
            type: Number,
            required: true,
            min: 0
        },

        productCostsValue: {
            type: Number,
            required: true,
            min: 0
        },

        operatingExpensesValue: {
            type: Number,
            required: true,
            min: 0
        },

        totalCostsValue: {
            type: Number,
            required: true,
            min: 0
        },

        profitValue: {
            type: Number,
            required: true
        },

        marginValue: {
            type: Number,
            required: true
        },

        // Break-even calculations
        breakEvenUnits: {
            type: Number,
            required: true,
            min: 0
        },

        breakEvenRevenue: {
            type: Number,
            required: true,
            min: 0
        }
    },

    {
        timestamps: true
    }
);


// =========================
// REPORT MODEL
// =========================

module.exports =
    mongoose.model(
        "Report",
        reportSchema
    );