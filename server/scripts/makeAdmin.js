
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

const User = require("../models/User");

dotenv.config({
  path: path.join(__dirname, "..", ".env")
});

async function makeAdmin() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing from server/.env"
      );
    }

    const email = process.argv[2];

    if (!email) {
      console.error(
        "Usage: node server/scripts/makeAdmin.js your-email@example.com"
      );

      process.exit(1);
    }

    await mongoose.connect(
      process.env.MONGODB_URI
    );

    const user = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (!user) {
      console.error(
        "User not found. Register the account first."
      );

      await mongoose.disconnect();
      process.exit(1);
    }

    user.role = "admin";

    await user.save();

    console.log(
      `Admin role successfully assigned to ${user.email}`
    );

    await mongoose.disconnect();
  } catch (error) {
    console.error(
      "Failed to assign admin role:",
      error.message
    );

    await mongoose.disconnect();
    process.exit(1);
  }
}

makeAdmin();
