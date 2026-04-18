# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack web application with a Node.js/Express backend and React/Vite frontend. The project uses JWT-based authentication with cookie storage and PostgreSQL for data persistence.

## Development Setup

**Node Version:** Node.js v22 (use nvm)

```bash
# Install and use Node 22
nvm install 22
nvm use 22
```

**Starting the application:**

```bash
# Terminal 1 - Backend (runs on http://localhost:5000)
cd backend
npm install
npm start       # Production mode
npm run dev     # Development mode with nodemon

# Terminal 2 - Frontend (runs on http://localhost:5173)
cd frontend
npm install
npm run dev
```

**Database setup:**

```bash
# Seed test users into PostgreSQL
cd backend
node src/seed.js
```

## Architecture

### Backend Structure (`backend/`)

- **Entry point:** `server.js` (starts Express server on port 5000)
- **App configuration:** `src/app.js` (middleware, CORS, routes)
- **Database:** `src/db.js` (PostgreSQL connection pool using pg library)
- **Routes:** `src/routes/` (auth, generate, translate, audio)
- **Middleware:** `src/middleware/`
  - `authMiddleware.js` - JWT verification for protected routes
  - `upload.js` - Multer configuration for file uploads

### Frontend Structure (`frontend/`)

- **Entry point:** `src/main.jsx`
- **Routing:** `src/App.jsx` (React Router v7 configuration)
- **State management:** `src/context/AppContext.jsx` (React Context API)
- **Pages:** `src/pages/` (Login, Dashboard, Generate, Translate, Audio)
- **Components:** `src/components/` (Navbar, ProtectedRoute, ActionButtons)

### Key Patterns

1. **Demo Mode:** Backend can run with `DEMO_MODE=true` in `.env` to bypass database and use hardcoded demo credentials (demo@gmail.com / 123456)

2. **Authentication Flow:**
   - Login sets httpOnly cookie named "token" with JWT
   - JWT contains `userId` and `email` claims, expires in 1 hour
   - `authMiddleware.js` validates JWT from cookies on protected routes
   - Frontend `ProtectedRoute` component checks auth status via `/auth/me` endpoint

3. **CORS Configuration:**
   - Backend configured in `src/app.js` with origin `http://localhost:5173` and credentials enabled
   - Cookie settings: `httpOnly: true`, `sameSite: "lax"`, `secure: false` (development)

4. **Module System:**
   - Backend uses CommonJS (`require`/`module.exports`)
   - Frontend uses ES modules (`import`/`export`)

## API Endpoints

**Base URL:** `http://localhost:5000`

### Authentication (no JWT required)
- `POST /auth/login` - Login with email/password
- `GET /auth/me` - Get current user from token
- `POST /auth/logout` - Clear auth cookie

### Protected Routes (require JWT)
- `POST /generate` - Content generation endpoint

### Unprotected (mock endpoints)
- `POST /translate` - Text translation
- `POST /audio` - Audio processing

## Database

**PostgreSQL Configuration:**
- Host: localhost:5432
- Database name, user, and password configured in `backend/.env`
- Connection uses pg Pool (see `src/db.js`)

**Environment Variables (backend/.env):**
```
DB_USER=bhavya
DB_PASS=23062005
DB_NAME=bgenproject
DB_HOST=localhost
DB_PORT=5432
DEMO_MODE=true
JWT_SECRET=supersecretkey
```

## Important Implementation Details

### Middleware Order (src/app.js)
The middleware order is critical for proper request handling:
1. `cookieParser()` - Parse cookies first
2. `cors()` - Enable CORS with credentials
3. `express.json()` and `express.urlencoded()` - Parse request bodies
4. Routes - Handle API endpoints

### File Upload Handling
- Uses multer configured in `src/middleware/upload.js`
- Field name: "file"
- Uses memory storage (files in req.file.buffer)
- Document parsing with mammoth for .docx files

### Protected Route Implementation
Backend uses `authMiddleware` function:
```javascript
const authMiddleware = require("./middleware/authMiddleware");
router.post("/endpoint", authMiddleware, handler);
```

Frontend uses `ProtectedRoute` component:
```javascript
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
```

## Current State Notes

- Most API endpoints (`/generate`, `/translate`, `/audio`) are stubs returning mock/placeholder data
- Frontend UI is complete but backend logic is minimal
- Database integration exists only for authentication; other features don't persist to DB
- Application expects PostgreSQL to be running locally for production mode (when DEMO_MODE=false)

## Testing Credentials

**Demo Mode (DEMO_MODE=true):**
- Email: demo@gmail.com
- Password: 123456

**Database Mode (after running seed.js):**
- Email: test@gmail.com
- Password: 123456
- Email: t2@gmail.com
- Password: 123456
