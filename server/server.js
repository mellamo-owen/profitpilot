
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

const authRoutes = require("./routes/auth");
const reportRoutes = require("./routes/reports");
const profileRoutes = require("./routes/profile");
const subscriptionRoutes = require("./routes/subscription");
const adminRoutes = require("./routes/admin");

const { apiLimiter } = require("./middleware/rateLimiter");

dotenv.config({
  path: path.join(__dirname, ".env")
});

const app = express();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

const isProduction =
  process.env.NODE_ENV === "production";

/*
|--------------------------------------------------------------------------
| Required Environment Variables
|--------------------------------------------------------------------------
*/

if (!MONGODB_URI) {
  console.error(
    "MONGODB_URI is missing from environment variables."
  );

  process.exit(1);
}

if (!JWT_SECRET) {
  console.error(
    "JWT_SECRET is missing from environment variables."
  );

  process.exit(1);
}

/*
|--------------------------------------------------------------------------
| Basic Security
|--------------------------------------------------------------------------
*/

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5500",
  "http://127.0.0.1:5500"
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      /*
       * Requests without an Origin header are allowed.
       * This is useful for server-to-server requests and
       * some development tools.
       */
      if (!origin) {
        return callback(null, true);
      }

      /*
       * Allow the configured frontend URL.
       */
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      /*
       * Allow localhost development ports.
       */
      if (
        !isProduction &&
        (
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:")
        )
      ) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS policy: Origin not allowed")
      );
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ],

    credentials: false
  })
);

/*
|--------------------------------------------------------------------------
| JSON Request Parsing
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "100kb"
  })
);

/*
|--------------------------------------------------------------------------
| API Rate Limiting
|--------------------------------------------------------------------------
*/

app.use("/api", apiLimiter);

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);

app.use("/api/reports", reportRoutes);

app.use("/api/profile", profileRoutes);

app.use(
  "/api/subscription",
  subscriptionRoutes.router
);

app.use("/api/admin", adminRoutes);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ProfitPilot API is running",
    environment: isProduction
      ? "production"
      : "development"
  });
});

/*
|--------------------------------------------------------------------------
| Production Frontend
|--------------------------------------------------------------------------
*/

if (isProduction) {
  const frontendPath = path.join(
    __dirname,
    ".."
  );

  /*
   * Serve index.html, CSS, JavaScript and images.
   */
  app.use(
    express.static(frontendPath)
  );

  /*
   * Express 5 compatible catch-all route.
   *
   * This replaces the old:
   *
   * app.get("*", ...)
   *
   * which causes a PathError in Express 5.
   */
  app.get(
    "/{*splat}",
    (req, res, next) => {
      /*
       * Do not let frontend routing handle
       * unknown API endpoints.
       */
      if (req.path.startsWith("/api/")) {
        return next();
      }

      res.sendFile(
        path.join(
          frontendPath,
          "index.html"
        )
      );
    }
  );
}

/*
|--------------------------------------------------------------------------
| API 404 Handler
|--------------------------------------------------------------------------
*/

app.use(
  "/api",
  (req, res) => {
    res.status(404).json({
      success: false,
      message: "API endpoint not found"
    });
  }
);

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use(
  (error, req, res, next) => {
    console.error(
      "Server error:",
      error.message
    );

    /*
     * CORS error
     */
    if (
      error.message &&
      error.message.startsWith(
        "CORS policy"
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Request origin is not allowed"
      });
    }

    /*
     * Invalid JSON
     */
    if (
      error instanceof SyntaxError &&
      error.status === 400 &&
      "body" in error
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid JSON request"
      });
    }

    /*
     * Production hides internal error details.
     */
    return res.status(
      error.status || 500
    ).json({
      success: false,
      message: isProduction
        ? "An unexpected server error occurred"
        : error.message
    });
  }
);

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

async function startServer() {
  try {
    await mongoose.connect(
      MONGODB_URI
    );

    console.log(
      "MongoDB connected successfully"
    );

    app.listen(
      PORT,
      () => {
        console.log(
          `ProfitPilot server running on port ${PORT}`
        );

        console.log(
          `Environment: ${
            isProduction
              ? "production"
              : "development"
          }`
        );
      }
    );
  } catch (error) {
    console.error(
      "Failed to connect to MongoDB:",
      error.message
    );

    process.exit(1);
  }
}

startServer();
