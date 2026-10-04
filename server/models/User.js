
const mongoose = require("mongoose");


// =========================================================
// USER SCHEMA
// =========================================================

const userSchema = new mongoose.Schema(
    {
        // =================================================
        // PERSONAL INFORMATION
        // =================================================

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 150
        },

        password: {
            type: String,
            required: true
        },


        // =================================================
        // ACCOUNT CONTROL
        // =================================================

        role: {
            type: String,
            enum: [
                "user",
                "admin"
            ],
            default: "user"
        },

        accountStatus: {
            type: String,
            enum: [
                "active",
                "disabled"
            ],
            default: "active"
        },


        // =================================================
        // SUBSCRIPTION
        // =================================================

        plan: {
            type: String,
            enum: [
                "free",
                "premium"
            ],
            default: "free"
        },

        subscriptionStatus: {
            type: String,
            enum: [
                "inactive",
                "active",
                "cancelled",
                "expired"
            ],
            default: "inactive"
        },

        subscriptionStartDate: {
            type: Date,
            default: null
        },

        subscriptionEndDate: {
            type: Date,
            default: null
        },


        // =================================================
        // USAGE TRACKING
        // =================================================

        reportsThisMonth: {
            type: Number,
            default: 0,
            min: 0
        },

        usageMonth: {
            type: String,
            default: ""
        },


        // =================================================
        // BUSINESS PROFILE
        // =================================================

        businessName: {
            type: String,
            trim: true,
            maxlength: 100,
            default: ""
        },

        businessType: {
            type: String,
            trim: true,
            maxlength: 80,
            default: ""
        },

        phone: {
            type: String,
            trim: true,
            maxlength: 30,
            default: ""
        },

        location: {
            type: String,
            trim: true,
            maxlength: 120,
            default: ""
        },

        businessDescription: {
            type: String,
            trim: true,
            maxlength: 500,
            default: ""
        }
    },

    {
        timestamps: true
    }
);


// =========================================================
// USER MODEL
// =========================================================

module.exports =
    mongoose.model(
        "User",
        userSchema
    );

