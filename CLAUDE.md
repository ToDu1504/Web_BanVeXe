# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Đặt Vé Xe Khách — a bus-ticket-selling web app with four roles: Guest (Khách Vãng Lai), Customer (Khách Hàng), Staff (Nhân Viên), Admin (Quản Trị Viên). Monorepo with independent `backend/` and `frontend/` apps (no shared package manager workspace — each has its own `node_modules`/`package.json`).

## Commands

### Backend (`backend/`)
```bash
npm run dev        # nodemon server.js — dev server on PORT (.env), default 8080
npm start           # node server.js — production start
npm run db:sync     # node src/scripts/syncDb.js — sync Sequelize models to MySQL
npm run db:seed     # node src/scripts/seedData.js — seed sample data
```
No lint/test scripts exist in the backend.

### Frontend (`frontend/`)
```bash
npm run dev         # vite — dev server on http://localhost:5173
npm run build        # vite build
npm run lint          # oxlint (config: frontend/.oxlintrc.json)
npm run preview       # vite preview — serve production build locally
```
No test runner is configured in the frontend.

Run backend and frontend dev servers in separate terminals; the frontend expects the API at `VITE_API_URL` (frontend/.env), and the backend allows CORS only from `CLIENT_URL` (backend/.env).

## Architecture

### Backend — Express + Sequelize (MySQL)

- Entry: `server.js` → connects DB (`src/config/db.js`, non-fatal if DB is down), loads `src/models` (registers all Sequelize associations as a side effect), then starts `src/app.js`.
- `src/app.js` wires global middleware (cors with `credentials: true`, morgan, cookie-parser, json body) and mounts one router per resource under `/api/*`: `auth`, `users`, `invoices`, `tickets`, `routes`, `trips`, `vehicles`, `stats`. Ends with a 404 handler and a single global error handler (`err.statusCode` / `err.message`, stack only logged server-side).
- Layering is routes → controllers → models, no service layer. Controllers are plain objects of async handlers (e.g. `src/controllers/invoiceController.js`), not classes.
- Auth: JWT is stored in an **HttpOnly cookie** (`req.cookies.token`), never in a header/localStorage. `src/middlewares/auth.js` (`protect`) verifies the cookie, loads the `User`, and checks `is_active`. `src/middlewares/role.js` (`authorize(...roles)`) gate routes by `req.user.role` (`customer` | `staff` | `admin`). Request validation goes through `src/middlewares/validate.js` with Joi schemas in `src/utils/joiSchemas.js`.
- Data model (see `src/models/index.js` for associations): `User` 1—N `Invoice` 1—N `Ticket` N—1 `Trip` N—1 `Route`, and `Trip` N—1 `Vehicle`. An **Invoice = one payment** (`payment_status`: pending/paid/refunded), a **Ticket = one seat** on one trip (`booking_status`: booked/cancelled). `tickets.UNIQUE(trip_id, seat_number)` is the DB-level guard against double booking.
- **Booking flow is transactional**: `POST /api/invoices` takes a `tickets[]` array and creates the Invoice + all Tickets inside one `sequelize.transaction()`, then decrements `trips.available_seats`. A `SequelizeUniqueConstraintError` from the double-booking constraint is caught and turned into a 409 with a Vietnamese user-facing message ("Ghế ... đã được đặt"). Cancelling an invoice, and marking one `refunded`, run in the same transactional pattern and must add the seats back to `trips.available_seats`. When touching booking/cancellation code, preserve this transaction + seat-count bookkeeping — it's the mechanism that prevents overselling.
- User-facing error/success messages throughout the backend are in Vietnamese — match that when adding new endpoints.

### Frontend — React 19 + Vite + Redux Toolkit + shadcn/ui

- Routing: `src/router/AppRouter.jsx` defines routes; `src/router/PrivateRoute.jsx` wraps role-gated routes/pages, redirecting to `/login` if unauthenticated or to `/` if `user.role` isn't in the route's `allowedRoles`. Pages are grouped by audience under `src/pages/`: `public/`, `auth/`, `customer/`, `staff/`, `admin/` — mirroring the role matrix in the README.
- State: Redux Toolkit store at `src/store/store.js`. `authSlice` holds `{ user, isAuthenticated }`; `bookingSlice` holds the in-progress booking (`selectedTrip`, `selectedSeats[]`, `bookedSeats[]`) used across the trip-detail → seat-selection → checkout flow.
- API layer: one Axios module per resource under `src/api/` (e.g. `tripApi.js`, `invoiceApi.js`), all built on the shared `src/api/axiosInstance.js`. That instance sets `withCredentials: true` (required so the HttpOnly auth cookie is sent) and has a response interceptor that dispatches `logout()` and redirects to `/login` on any 401 — don't add per-call 401 handling, it's centralized there.
- UI: shadcn/ui primitives live in `src/components/ui/` (generated via `npx shadcn@latest add ...`, config in `components.json` — don't hand-roll a component that shadcn already provides). Domain components live in `src/components/features/` (`SeatMap.jsx` renders `vehicles.seat_layout` JSON + `bookedSeats[]` fetched from `GET /api/trips/:id/booked-seats`; `StatsChart.jsx` uses Recharts). Shared chrome (`Navbar`, `Footer`, `AdminLayout`, `PageLayout`) is in `src/components/common/`.
- Styling: Tailwind CSS v4 via the Vite plugin (no `tailwind.config.js` — see `vite.config.js` and `src/styles/globals.css`), CSS variables for theming, dark mode toggled via a `dark` class on `<html>` (see `src/hooks/useTheme.js`), preference persisted to `localStorage`. `@` resolves to `src/` (see alias in `vite.config.js` and `components.json`).
- Forms/validation: `react-hook-form` + `zod` resolvers for all forms; animations via Framer Motion (page transitions, list stagger, modal scale-in).

## Database

MySQL, managed through Sequelize models (not raw migrations) — schema is defined by the model files under `backend/src/models/` and applied via `npm run db:sync`. The reference DDL (including the double-booking unique constraint and recommended indexes) is in [README.md](README.md). Key design point to preserve: `invoices` is one payment, `tickets` is one seat, and cancel/refund flows must keep `trips.available_seats` consistent with the sum of active (`booking_status = 'booked'`) tickets.
