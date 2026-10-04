
const mongoose = require("mongoose");


// =========================================================
// SUBSCRIPTION SCHEMA
// =========================================================

const subscriptionSchema = new mongoose.Schema(
    {
        // =================================================
        // USER
        // =================================================

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },


        // =================================================
        // PLAN
        // =================================================

        plan: {
            type: String,
            enum: [
                "free",
                "premium"
            ],
            required: true,
            default: "premium"
        },


        // =================================================
        // SUBSCRIPTION STATUS
        // =================================================

        status: {
            type: String,
            enum: [
                "pending",
                "active",
                "cancelled",
                "expired",
                "failed"
            ],
            required: true,
            default: "pending"
        },


        // =================================================
        // PAYMENT INFORMATION
        // =================================================

        paymentProvider: {
            type: String,
            enum: [
                "manual",
                "mpesa",
                "stripe",
                "other"
            ],
            default: "manual"
        },

        paymentReference: {
            type: String,
            trim: true,
            maxlength: 150,
            default: ""
        },

        amount: {
            type: Number,
            min: 0,
            default: 0
        },

        currency: {
            type: String,
            trim: true,
            uppercase: true,
            default: "KES",
            maxlength: 10
        },


        // =================================================
        // SUBSCRIPTION DATES
        // =================================================

        startDate: {
            type: Date,
            default: null
        },

        endDate: {
            type: Date,
            default: null
        },


        // =================================================
        // CANCELLATION
        // =================================================

        cancelledAt: {
            type: Date,
            default: null
        },

        cancellationReason: {
            type: String,
            trim: true,
            maxlength: 300,
            default: ""
        },


        // =================================================
        // ADMIN NOTES
        // =================================================

        adminNotes: {
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
// INDEXES
// =========================================================

subscriptionSchema.index({
    userId: 1,
    createdAt: -1
});

subscriptionSchema.index({
    status: 1
});


// =========================================================
// MODEL
// =========================================================

module.exports =
    mongoose.model(
        "Subscription",
        subscriptionSchema
    );
