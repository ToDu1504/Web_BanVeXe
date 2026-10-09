# PROJECT_MAP — compact index of the codebase

Read this first when adding a feature: it says **where things live and which rules must not break**, so you only open the files you actually need. Detailed reasoning for each rule is in `CLAUDE.md`; user-facing spec (Vietnamese) is in `README.md`. Keep this file in sync when you add files/endpoints/tables.

Last full scan: 2026-10-08 (backend ~6.1k LOC, frontend ~11.1k LOC).

---

## 1. Stack & run

| Part | Tech | Run |
|---|---|---|
| backend/ | Node + Express 4, Sequelize 6 + MySQL (mysql2), Joi, JWT in HttpOnly cookie, Nodemailer | `npm run dev` (port 8080) |
| frontend/ | React 19 + Vite, Redux Toolkit, React Router 7, Tailwind v4, shadcn/ui (Radix), RHF + zod 4, Framer Motion, GSAP + Lenis, Recharts, axios, sonner, qrcode.react | `npm run dev` (5173), `npm run lint`, `npm run build` |

DB (XAMPP MariaDB 10.4 now, Docker later — `md/ThietKeDatabase.md`): DBs `bus_ticket_dev` / `bus_ticket_test`. Scripts (backend): `db:create` · `db:migrate` · `db:status` · `db:migrate:undo -- --yes` · `db:seed -- --yes` (wipe + seed, calls seedDrivers) · `db:reset -- --yes` (backup → drop → migrate → seed) · `db:backup` · `db:restore -- <file> --yes` · `db:seed-drivers` (idempotent). Destructive ones are guarded by `src/db/safety.js` (`_dev`/`_test` only, `--yes`, never production) and auto-backup.
No test runner anywhere. Verify = `node --check`, `npm run lint`, `npm run build`, manual API calls.

Seed (`db:seed`, ~20s): 7 users (admin/staff + 5 customers), 22 vehicles, 36 templates, 44 drivers, 21 days of completed/ongoing history with actual times + tickets + boarding, upcoming 14 days (tickets on next 3 days), driver leave, incidents, shuttle pickup demo (8/15 routes shuttle-enabled with `origin_station`, ~20% of random paid tickets on those routes are `shuttle`, plus 3 scripted trips: needs-reprint / locked-unprinted with an unpaid shuttle invoice / still-open for registration). Deterministic RNG. Seed accounts (password `password`): `admin@`, `staff@`, `customer@` + `datvexekhach.vn`, extra customers `@khachhang.vn`; drivers `taixe1.<plate>@` / `taixe2.<plate>@datvexekhach.vn` (plate lowercase, no dash, e.g. `taixe1.51b11111`).

## 2. Roles

`customer` · `staff` · `admin` · `driver` (+ guest = not logged in). Backend gate: `protect` (`middlewares/auth.js`, reads `req.cookies.token`, loads `req.user`, rejects inactive) + `authorize(...roles)` (`middlewares/role.js`). Frontend gate: `PrivateRoute allowedRoles`. Login redirect by role is in `pages/auth/Login.jsx` (admin→/admin/dashboard, staff→/staff/invoices, driver→/driver/trips, customer→previous page).

## 3. Data model (`backend/src/models/`, associations in `models/index.js`)

| Model / table | Key columns | Relations |
|---|---|---|
| User `users` | full_name, email (unique), phone, password (bcrypt hook), role ENUM(customer,staff,admin,driver), is_active | 1-N Invoice; 1-N Trip as `DrivenTrips` (driver_id); 1-N DriverUnavailability |
| Route `routes` | origin, destination, distance_km, duration_min, base_price, is_active, origin_station?, shuttle_enabled, shuttle_area_note? | 1-N Trip, 1-N TripTemplate |
| Vehicle `vehicles` | license_plate (unique, `29B-12345`), vehicle_type ENUM(sleeper,limousine,standard), total_seats, seat_layout JSON `{floors,rows,cols}`, is_active | 1-N Trip, 1-N TripTemplate |
| Trip `trips` | route_id, vehicle_id, departure_time, arrival_time, available_seats, price, status ENUM(scheduled,ongoing,completed,cancelled), template_id?, driver_id?, co_driver_id? (tài xế phụ), reminder_sent_at?, actual_departure_at?, actual_arrival_at?, shuttle_locked_at?, shuttle_list_printed_at? | belongsTo Route, Vehicle, TripTemplate, User as `Driver` and `CoDriver`; 1-N Ticket, TripIncident |
| TripTemplate `trip_templates` | route_id, vehicle_id, departure_time_of_day "HH:mm", duration_minutes, price, available_seats, days_of_week JSON [0=Sun..6], driver_id?, co_driver_id?, is_active | 1-N Trip (SET NULL on delete); belongsTo User as `Driver`, `CoDriver` |
| Invoice `invoices` | user_id, total_price, payment_method ENUM(cash,momo), payment_status ENUM(pending,paid,refunded), paid_at? | 1-N Ticket |
| Ticket `tickets` | invoice_id, trip_id, seat_number, **active_seat_number**, passenger_name/phone, ticket_price, booking_status ENUM(booked,cancelled), cancelled_at, issued_at/issued_by/print_count (print cache), boarded_at/boarded_by, pickup_type ENUM(station,shuttle), pickup_address?, pickup_note?, pickup_updated_at? | UNIQUE(trip_id, active_seat_number); 1-N TicketPrint |
| TicketPrint `ticket_prints` | ticket_id, invoice_id, printed_by (alias `PrintedByUser`), print_type ENUM(original,reprint), print_sequence, reason | full print audit |
| TripIncident `trip_incidents` | trip_id, reported_by (`Reporter`), type ENUM(delay,breakdown,accident,other), delay_minutes, note, passengers_notified_at, resolved_at, resolved_by (`Resolver`) | |
| DriverUnavailability `driver_unavailabilities` | driver_id, start_date/end_date (DATEONLY 'YYYY-MM-DD'), reason | |

Schema changes: **new migration file** in `backend/migrations/` (never edit one that already ran; never `sync()`) + update the model's columns. FK/CHECK/index live only in migrations. FK policy: RESTRICT for invoices/tickets/trips/ticket_prints history, SET NULL for actor/driver columns, CASCADE for templates/incidents/unavailabilities — deleting a pending invoice = delete its tickets first. Invoice has `paid_at` (required once paid/refunded).

## 4. Backend layout (`backend/src/`)

Pattern: `routes/x.routes.js` → `controllers/xController.js` (plain object of async handlers, each try/catch → Vietnamese `message`) → models. Validation: `validate(schemas.xxx)` with Joi in `utils/joiSchemas.js` (**unknown keys are rejected** — add every new body field to the schema).

| File | What it holds |
|---|---|
| `server.js` | connect DB, warn on pending migrations, load models, start 5 jobs, listen |
| `app.js` | cors(credentials, CLIENT_URL), json, cookies, mounts `/api/*`, 404 + error handler |
| `config/db.js` | Sequelize; `timezone +07:00`; **typeCast**: BLOB/JSON→parsed JSON, DATE→raw string |
| `config/momo.config.js`, `services/momoService.js` | MoMo sandbox signing/verify |
| `services/mailService.js` | Nodemailer; never throws; no-op without SMTP_HOST/USER or for `@quayve.local`; templates: departure reminder, driver assigned/unassigned, incident notice |
| `utils/pagination.js` | `getPagination(query)`, `buildPaginationMeta()` |
| `utils/tripScheduling.js` | `findVehicleScheduleConflict`, `getEffectiveArrivalMs` (2h fallback), `hasTripDeparted` |
| `utils/driverScheduling.js` | `tripsOfDriver(id)` (= driver_id OR co_driver_id — use for every "trips of this driver" query), `validateDriverAssignment` (role/active/day-off/overlap), `validateDriverPair` (main ≠ co, co needs main), `findDriverScheduleConflict`, `findDriverUnavailability` |
| `utils/dateVN.js` | `toVNDateString`, `getVNWeekRange(weekStart)` (Mon–Sun, UTC+7), `startOfVNDay`/`endOfVNDay`, `formatVNDateTime` |
| `jobs/expireInvoices.js` | cancels stale `pending` invoices (momo TTL 30m; cash 120m or 30m before departure) |
| `jobs/generateTripsFromTemplates.js` | rolling 14-day Trip generation; returns summary counts; inherits driver unless invalid → driver_id NULL |
| `jobs/updateTripStatuses.js` | every 1m: scheduled→ongoing→completed by clock, **only trips without driver**; driver trips auto-complete after arrival + 180m |
| `utils/shuttle.js` | shuttle rules (spec `md/DonKhachTrungChuyen.md`): `SHUTTLE_CUTOFF_MINUTES`, `isPastShuttleCutoff`, `assertShuttleAllowed`, `normalizePickup`, `countShuttleByTrip`, `ELIGIBLE_SHUTTLE_INVOICE` (booked + paid only) |
| `jobs/lockShuttleLists.js` | every 1m: trips ≤ cutoff → `shuttle_locked_at` (claim first), then mail shuttle passengers; runs without SMTP |
| `jobs/sendDepartureReminders.js` | trips departing ≤30m, claim via `reminder_sent_at`, 1 mail/invoice; off without SMTP |
| `db/` | `migrator.js` (umzug + SequelizeStorage), `safety.js` (`assertDestructiveAllowed`), `backup.js` (mysqldump/mysql via `MYSQLDUMP_PATH`/`MYSQL_PATH`) |
| `migrations/` (backend root) | `20261010000001-baseline.js` = whole schema (tables, 21 FKs, 22 CHECKs, indexes) |
| `utils/dbErrors.js` | `mapDbError(error)` → `{status, message}` for FK/UNIQUE/CHECK violations; used at the end of write handlers' catch |
| `scripts/` | `createDb.js`, `migrate.js`, `resetDb.js`, `backupDb.js`, `restoreDb.js`, `seedDrivers.js` (exports `seedDrivers()`), `seedData.js` |

### API (all under `/api`; P=public, A=auth any)

| Resource | Endpoints → handler | Roles |
|---|---|---|
| auth | POST register, login · POST logout · GET me · PUT profile, change-password | P / A |
| users | GET customers/search?phone · POST customers (find-or-create) | staff, admin |
| | GET / (paged) · POST / · GET drivers?departure_time&arrival_time&exclude_trip_id&vehicle_id (flags unavailable/busy_trip/is_vehicle_regular, sorted) · GET :id/unavailabilities · PUT :id/role · PUT :id/status · DELETE :id | admin |
| routes | GET / · GET :id | P |
| | POST / (`create_return` default true → `{route, returnRoute}`) · PUT :id · DELETE :id | admin |
| vehicles | GET / (paged result adds current_driver, current_trip, regular_drivers) · GET :id | staff, admin |
| | POST · PUT :id · DELETE :id | admin |
| trips | GET search?origin&destination&date · GET :id (both include `Driver` name only) · GET :id/booked-seats | P |
| | GET :id/tickets (driver: own trip, no payment fields) | staff, admin, driver |
| | GET / (paged, search/status/from/to, includes `Driver`, `open_incident_count`) | staff, admin |
| | POST · PUT :id (driver_id, cancel cascade) · DELETE :id | admin |
| trip-templates | GET / · GET :id | staff, admin |
| | POST · PUT :id (rebuilds unsold future trips) · DELETE :id | admin |
| invoices | POST / (tickets[], optional customer_id for staff/admin) · DELETE :id · GET :id | customer, staff, admin |
| | GET my | customer |
| | GET / · PUT :id/status (pending→paid, paid→refunded only) | staff, admin |
| tickets | DELETE :id (cancel one) | customer, staff, admin |
| | PUT :id/pickup `{pickup_type, pickup_address?, pickup_note?}` (customer own ticket before cutoff; staff/admin any time) | customer, staff, admin |
| shuttles | GET queue?from&to · GET pickup-list?trip_ids= (or from&to) · POST mark-printed `{trip_ids}` | staff, admin |
| tickets | PUT :id/pickup `{pickup_type, pickup_address?, pickup_note?}` (customer: own ticket, before cutoff; staff/admin: any time) | customer, staff, admin |
| shuttles | GET queue?from&to · GET pickup-list?trip_ids= (or from&to) · POST mark-printed `{trip_ids}` | staff, admin |
| tickets | POST :id/print · GET :id/prints · GET prints?from&to&printed_by (non-admin forced to self) | staff, admin |
| | PUT :id/board `{boarded}` | driver (own trip), staff, admin |
| stats | GET / · GET revenue | staff, admin |
| payments | POST momo/create/:invoiceId · POST momo/verify-return | customer, staff, admin |
| | POST momo/ipn | P (MoMo) |
| driver | (main or co-driver of the trip; start/complete = main only) GET trips?week_start (or from/to/page, each trip has `my_role` main/co) · GET trips/:id · POST trips/:id/start · POST trips/:id/complete · POST trips/:id/incidents · GET dashboard · GET history · GET schedule.ics · GET/POST unavailabilities · DELETE unavailabilities/:id | driver (own data only) |
| trip-incidents | GET / (status=open/resolved, paged) · PUT :id/resolve | staff, admin |

## 5. Frontend layout (`frontend/src/`, alias `@` = `src`)

| Path | Contents |
|---|---|
| `router/AppRouter.jsx` | every route; public/customer pages wrapped in `PageLayout`, staff/admin/driver pages in `AdminLayout` |
| `components/common/AdminLayout.jsx` | sidebar `menuItems` filtered by `roles` — **add new back-office pages here** |
| `components/common/` | Navbar (role links), Footer, PageLayout, AuthLayout, PageHeader, EmptyState, TableSkeleton, SmoothScrollProvider, LegalPageLayout |
| `components/ui/` | shadcn: alert-dialog avatar badge(variants: default secondary destructive outline success warning accent) button(+accent) card dialog dropdown-menu input label select skeleton sonner switch table tabs · hand-made: form-field (`FormField label htmlFor error`), pagination, textarea, date-input (dd/mm/yyyy; use instead of native date inputs) |
| `components/features/` | SeatMap, TripCard, TripStatus, InvoiceStatus, ActiveStatus, StatCard (GSAP count-up, integers), StatsChart (`type line|bar`, `dataKey`, `unit`, x-key `date`), TicketPrintView, TripPassengersDialog (staff/admin/driver; boarding checkboxes; shows main + co driver; print manifest portal), DriverWeekSchedule, IncidentReportDialog, VehicleDriverCell, CreateUserDialog, DriverSelect (grouped free/blocked driver picker used for main + co driver), PickupSelector (tự đến bến / trung chuyển + địa chỉ), ChangePickupDialog, ShuttleBadge, ShuttlePickupSheet (print portal, auto `window.print()`; use via `hooks/useShuttlePrint.js`) |
| `api/*.js` | one axios module per resource on `axiosInstance` (withCredentials; global 401 → logout + /login) |
| `store/` | `authSlice` {user, isAuthenticated}, `bookingSlice` {selectedTrip, selectedSeats[], bookedSeats[]} |
| `hooks/` | useAuth (user, role, loginUser, logoutUser), useBooking, useTheme |
| `lib/utils.js` | cn, formatCurrency, formatDateTime, formatDate, formatDuration, formatTime, formatDateString, toVNDateString, addDays, getWeekStart, exportToCsv |
| `lib/motionVariants.js`, `lib/gsap.js` | fadeInUp/fadeIn/scaleIn/stagger/pageTransition; single gsap import point |

### Pages ↔ routes

| Route | Page | Roles |
|---|---|---|
| `/`, `/trips/:id`, `/login`, `/register`, `/terms`, `/privacy-policy`, `/cancellation-policy` | public/Home, TripDetail, auth/Login, Register, public legal pages | all |
| `/customer/book` | customer/BookTicket (staff/admin get "Khách hàng nhận vé" block) | customer, staff, admin |
| `/customer/invoices` | customer/InvoiceHistory | customer |
| `/customer/profile` | customer/Profile | all logged in |
| `/payment/momo/return` | customer/PaymentReturn | customer, staff, admin |
| `/staff/invoices` `/staff/stats` `/staff/trips` `/staff/routes` `/staff/vehicles` `/staff/print-log` `/staff/incidents` `/staff/shuttles` | staff/ManageInvoice, Statistics, ViewTrips, ViewRoutes, ViewVehicles, PrintReconciliation, TripIncidents, ShuttlePickups | staff, admin |
| `/driver/trips` `/driver/trips/:id` `/driver/history` `/driver/leave` | driver/MyTrips, DriverTripDetail, TripHistory, Unavailability | driver |
| `/admin/dashboard` `/admin/users` `/admin/routes` `/admin/trips` `/admin/vehicles` `/admin/trip-templates` | admin/Dashboard, ManageUsers, ManageRoutes, ManageTrips, ManageVehicles, ManageTripTemplates | admin |

### Standard list page shape (copy from `admin/ManageRoutes.jsx`)
state `page`/`pagination`/`searchQuery` → 400ms debounce → `api.getAll({page, limit:10, search})` → `<Table>` + `<EmptyState>` + `<TableSkeleton>` + `<Pagination>`; create/edit in `<Dialog>` with RHF+zod and `<FormField>`; deletes behind `<AlertDialog>`; feedback via `toast` from sonner; wrapper `motion.div variants={fadeInUp}`.

## 6. Invariants — do not break

1. **Booking/cancel is transactional** and keeps `trips.available_seats` = capacity − booked tickets. Set `active_seat_number = seat_number` when booking, `NULL` when cancelling.
2. Prices are recomputed server-side from `Trip.price`; never trust client totals.
3. Invoice status transitions: only `pending→paid`, `paid→refunded`. Customers can't self-cancel once a trip has departed (`hasTripDeparted`).
4. Cancelling a Trip cascades to tickets/invoices (reduce / refund / delete pending).
5. Deletes with dependents are blocked (Trip with tickets, Route/Vehicle with trips, User with invoices/ticket prints/reported incidents, driver with scheduled/ongoing trips) — suggest deactivating. Add the same guard for new cascading entities.
6. Vehicle/driver must not be double-booked: use `findVehicleScheduleConflict` / `validateDriverPair`. A driver is busy whether they are main or co-driver (`tripsOfDriver`).
7. Lists use **opt-in pagination**: no `page` → bare array; `page` → `{data, pagination}`.
8. Per-user data endpoints force the owner server-side (`getPrintLog`, `/api/driver/*`) — never trust a client-supplied user id.
9. `GET /api/trips` sorts `departure_time ASC`.
10. User-facing backend messages are Vietnamese. Times are Vietnam time (UTC+7); use `utils/dateVN.js` / `lib/utils.js` helpers, not local-timezone math.
11. Mail sending must never fail a request; send after commit.
12. Print views inside scrollable Dialogs are portalled to `document.body`.

## 7. Recipe: adding a feature

1. New migration in `backend/migrations/` (+ columns in `models/X.js`, association in `models/index.js`) → `db:migrate` on `bus_ticket_test` first → then `_dev`.
2. Joi schema in `utils/joiSchemas.js` (every body field!).
3. Controller handler (try/catch, Vietnamese messages, transaction if touching seats/money) → route with `protect` + `authorize` → mount in `app.js` if new resource.
4. Frontend: `api/xApi.js` function → page in `pages/<role>/` → route in `AppRouter.jsx` → sidebar entry in `AdminLayout.jsx` (or Navbar for public/customer).
5. Verify: `node --check` changed backend files, `npm run lint` + `npm run build` in frontend, hit the endpoint with curl (login via cookie jar).
6. Update `README.md` (API table, role matrix, notes), `CLAUDE.md` if a new rule appears, and this file.

## 8. Env vars (backend/.env)

PORT, DB_HOST/PORT/NAME/USER/PASS, JWT_SECRET, JWT_EXPIRES_IN, CLIENT_URL, NODE_ENV · PENDING_INVOICE_TTL_MINUTES, CASH_HOLD_TTL_MINUTES, CASH_HOLD_DEPARTURE_BUFFER_MINUTES · TRIP_TEMPLATE_ADVANCE_DAYS, TRIP_TEMPLATE_CHECK_INTERVAL_MS, TRIP_STATUS_CHECK_INTERVAL_MS, TRIP_AUTO_COMPLETE_GRACE_MINUTES · SERVER_URL, MOMO_* · SMTP_HOST/PORT/USER/PASS, MAIL_FROM, MYSQLDUMP_PATH, MYSQL_PATH, BACKUP_DIR, BACKUP_KEEP · MAIL_SKIP_DOMAINS (default `datvexekhach.vn,khachhang.vn` — seed domains never mailed), DEPARTURE_REMINDER_MINUTES, DEPARTURE_REMINDER_CHECK_INTERVAL_MS · SHUTTLE_CUTOFF_MINUTES (120), SHUTTLE_PICKUP_LEAD_MINUTES (60), SHUTTLE_CHECK_INTERVAL_MS. Frontend: `VITE_API_URL`.
