# Hingo Tailors ERP - Backend Architecture & Production Guide

This guide details the foundational architectural patterns, security configurations, database integration guidelines, and operational standards implemented in the Hingu Tailors ERP backend system.

---

## 1. Environment Variables Configuration (`.env`)

Before starting the server in any environment, all required environment variables must be defined. The application runs an automatic startup validation via `config/env.js` and will safely terminate if any critical key is missing.

| Variable Name | Required | Example Value | Purpose |
| :--- | :---: | :--- | :--- |
| `PORT` | Yes | `5000` | Port number the Express daemon binds to. |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/hingu_erp` | Primary MongoDB database connection string. |
| `JWT_SECRET` | Yes | `super_secret_jwt_key...` | Cryptographic secret for signing authentication tokens. |
| `JWT_REFRESH_SECRET` | Yes | `super_secret_refresh_key...` | Secret for verifying long-lived refresh tokens. |
| `CLOUDINARY_NAME` | Yes | `demo_cloud_name` | Cloudinary storage account name for image/document uploads. |
| `CLOUDINARY_API_KEY` | Yes | `123456789012345` | API Key for Cloudinary authentication. |
| `CLOUDINARY_API_SECRET`| Yes | `abc123demoSecret...` | API Secret for signing Cloudinary media transactions. |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed Frontend origin for Cross-Origin (CORS) access. |
| `DB_MAX_RETRIES` | No | `5` | Maximum automatic reconnect attempts on unexpected DB loss. |

---

## 2. Database Configuration (`config/db.js`)

The database connection utilizes Mongoose connection pooling and automatic resilience mechanisms:
- **Connection Pooling**: Configured with `maxPoolSize: 20` and `minPoolSize: 2` to optimize high-concurrency throughput while minimizing idle memory usage.
- **Timeouts**: Uses `serverSelectionTimeoutMS: 5000` and `socketTimeoutMS: 45000` to quickly fail over if networking breaks.
- **Auto-Reconnect Strategy**: Listens to database `disconnected` events and automatically schedules up to `DB_MAX_RETRIES` connection attempts with an exponential/fixed 5-second backoff.
- **Graceful Shutdown**: Traps `SIGINT` and `SIGTERM` signals from the host operating system to invoke `mongoose.connection.close()`, guaranteeing no database corrupted locks or socket leaks remain on shutdown.
- **Development Fallback**: In non-production debugging sessions, if the local MongoDB daemon is unreachable, the driver automatically spawns an ephemeral `MongoMemoryServer` instance so developer UI workflows never block.

---

## 3. Standardized API Response Format (`utils/response.js`)

All REST endpoints across every module MUST adhere strictly to the centralized JSON response schema. Inconsistent response structures are strictly prohibited.

### Successful Response Schema
When invoking `sendSuccess(res, 200, "Message", { data })`:
```json
{
    "success": true,
    "message": "Operation completed successfully.",
    "data": {
        "id": "CUST-000001",
        "name": "Rajesh Hingu"
    }
}
```

### Error Response Schema
When invoking `sendError(res, 400, "Error description", { fieldDetails })`:
```json
{
    "success": false,
    "message": "Validation Failed",
    "error": {
        "mobile": "Mobile phone number must contain at least 10 digits."
    }
}
```

---

## 4. Centralized Error Handling & Security

### Global Error Handler (`middleware/errorHandler.js`)
All Express routes terminate into the global error handling middleware. It intercepts:
- **Mongoose Validation Errors**: Automatically translates schema validation failures into clean dictionary mappings (`field: error message`) with HTTP `400 Bad Request`.
- **MongoDB Duplicate Key Errors (Code `11000`)**: Detects unique index collisions (e.g. duplicate mobile number, email, or barcode) and returns an HTTP `409 Conflict` with clear explanation.
- **CastErrors**: Traps malformed database ObjectIds without crashing the server.
- **Stack Trace Suppression**: In production environments (`NODE_ENV=production`), internal filesystem traces and engine call stacks are omitted from the JSON payload.

### Security Defenses (`middleware/security.js`)
- **Headers Protection**: Automatically applies protective HTTP response headers (Anti-sniffing, XSS protection, Frame prevention, STS).
- **MongoDB Injection Shield**: Recursively traverses `req.body`, `req.query`, and `req.params` to sanitize keys containing operator prefixes (`$` or `.`).
- **Rate Limiting**: Protects against DoS brute-force attacks via an in-memory IP tracker capping incoming bandwidth at 300 requests per minute per IP.
- **Request Size Capping**: Restricts incoming JSON payloads to `10mb` max to prevent buffer overflow attacks.

---

## 5. Folder Structure & Modular Responsibilities

```
backend/
├── config/
│   ├── db.js             # Mongo connection pooling, events, & shutdown handlers
│   └── env.js            # Critical startup environment variable validators
├── middleware/
│   ├── auth.js           # JWT verification & RBAC (Role-Based Access Control)
│   ├── errorHandler.js   # Centralized REST exception transformer
│   ├── logger.js         # Execution timing & HTTP status access logger
│   ├── security.js       # Headers, rate limiting, and Mongo injection defenses
│   └── upload.js         # Cloudinary & multer storage handlers for attachments
├── models/
│   ├── Customer.js       # Customer Core CRM Schema + indexes
│   ├── Measurement.js    # Dynamic Measurement Templates & Version History
│   ├── Inventory.js      # Fabric rolls, stock history, and barcode tags
│   ├── Order.js          # Tailoring order workflows & item tracking
│   └── Finance.js        # Invoices, payments, and expense ledgers
├── routes/
│   ├── auth.js           # Authentication endpoints
│   ├── customers.js      # Customer 360 & transactional profile APIs
│   ├── measurements.js   # Dynamic template metadata endpoints
│   ├── orders.js         # Order creation & progression management
│   ├── stock.js          # Barcode scanning & inventory adjustments
│   └── transactions.js   # Payment processing & accounting entries
├── utils/
│   ├── response.js       # Standardized REST API format helper functions
│   └── validation.js     # Request payload data validators & sanitizers
├── .env                  # Environment key definitions
├── ARCHITECTURE_GUIDE.md # Technical documentation
└── server.js             # Application bootstrap & middleware pipeline wiring
```
