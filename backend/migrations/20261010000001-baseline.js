const { DataTypes } = require('sequelize')

// Baseline: toàn bộ schema của ứng dụng tại thời điểm chuyển sang migration
// (md/ThietKeDatabase.md mục 4–6) — gồm cả các cột tài xế và xe trung chuyển
// trước đây được vá bằng addDriverFeatures.js / addShuttlePickup.js.
//
// Chỉ dùng cú pháp chạy giống nhau trên MariaDB 10.4 (XAMPP) và MySQL 8.x.
// Từ nay mọi thay đổi schema là một file migration MỚI — không sửa file này.

const TABLE_OPTIONS = { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci', engine: 'InnoDB' }

const id = () => ({ type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false })
const timestamps = () => ({
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false },
})

// Thứ tự tạo (cha trước con); down() xóa theo thứ tự ngược lại.
const TABLES = [
  'users', 'routes', 'vehicles', 'trip_templates', 'trips', 'invoices',
  'tickets', 'ticket_prints', 'trip_incidents', 'driver_unavailabilities',
]

// [bảng, cột, bảng cha, ON DELETE, tên constraint] — chính sách ở mục 5:
// RESTRICT cho lịch sử tiền/vé, SET NULL cho người thao tác/tài xế, CASCADE cho dữ liệu phụ.
const FOREIGN_KEYS = [
  ['trip_templates', 'route_id', 'routes', 'CASCADE', 'fk_trip_templates_route'],
  ['trip_templates', 'vehicle_id', 'vehicles', 'CASCADE', 'fk_trip_templates_vehicle'],
  ['trip_templates', 'driver_id', 'users', 'SET NULL', 'fk_trip_templates_driver'],
  ['trip_templates', 'co_driver_id', 'users', 'SET NULL', 'fk_trip_templates_co_driver'],
  ['trips', 'route_id', 'routes', 'RESTRICT', 'fk_trips_route'],
  ['trips', 'vehicle_id', 'vehicles', 'RESTRICT', 'fk_trips_vehicle'],
  ['trips', 'template_id', 'trip_templates', 'SET NULL', 'fk_trips_template'],
  ['trips', 'driver_id', 'users', 'SET NULL', 'fk_trips_driver'],
  ['trips', 'co_driver_id', 'users', 'SET NULL', 'fk_trips_co_driver'],
  ['invoices', 'user_id', 'users', 'RESTRICT', 'fk_invoices_user'],
  ['tickets', 'invoice_id', 'invoices', 'RESTRICT', 'fk_tickets_invoice'],
  ['tickets', 'trip_id', 'trips', 'RESTRICT', 'fk_tickets_trip'],
  ['tickets', 'issued_by', 'users', 'SET NULL', 'fk_tickets_issued_by'],
  ['tickets', 'boarded_by', 'users', 'SET NULL', 'fk_tickets_boarded_by'],
  ['ticket_prints', 'ticket_id', 'tickets', 'RESTRICT', 'fk_ticket_prints_ticket'],
  ['ticket_prints', 'invoice_id', 'invoices', 'RESTRICT', 'fk_ticket_prints_invoice'],
  ['ticket_prints', 'printed_by', 'users', 'RESTRICT', 'fk_ticket_prints_printed_by'],
  ['trip_incidents', 'trip_id', 'trips', 'CASCADE', 'fk_trip_incidents_trip'],
  ['trip_incidents', 'reported_by', 'users', 'RESTRICT', 'fk_trip_incidents_reported_by'],
  ['trip_incidents', 'resolved_by', 'users', 'SET NULL', 'fk_trip_incidents_resolved_by'],
  ['driver_unavailabilities', 'driver_id', 'users', 'CASCADE', 'fk_driver_unavail_driver'],
]

// Bất biến nghiệp vụ đưa xuống DB (mục 4). Tên constraint được utils/dbErrors.js
// dịch sang thông báo tiếng Việt. Lưu ý: CHECK chỉ chặn khi biểu thức là FALSE —
// NULL được coi là "đạt", nên cột có thể NULL phải ghi rõ "IS NOT NULL AND ...".
const CHECKS = [
  ['routes', 'chk_routes_distance', 'distance_km IS NULL OR distance_km > 0'],
  ['routes', 'chk_routes_duration', 'duration_min IS NULL OR duration_min > 0'],
  ['routes', 'chk_routes_base_price', 'base_price > 0'],
  ['vehicles', 'chk_vehicles_total_seats', 'total_seats > 0'],
  ['trip_templates', 'chk_trip_templates_price', 'price > 0'],
  ['trip_templates', 'chk_trip_templates_seats', 'available_seats >= 0'],
  ['trip_templates', 'chk_trip_templates_duration', 'duration_minutes IS NULL OR duration_minutes > 0'],
  ['trip_templates', 'chk_trip_templates_co_driver', 'co_driver_id IS NULL OR driver_id IS NULL OR co_driver_id <> driver_id'],
  ['trips', 'chk_trips_available_seats', 'available_seats >= 0'],
  ['trips', 'chk_trips_price', 'price > 0'],
  ['trips', 'chk_trips_arrival', 'arrival_time IS NULL OR arrival_time > departure_time'],
  ['trips', 'chk_trips_co_driver', 'co_driver_id IS NULL OR driver_id IS NULL OR co_driver_id <> driver_id'],
  ['invoices', 'chk_invoices_total_price', 'total_price >= 0'],
  ['invoices', 'chk_invoices_paid_at', "payment_status = 'pending' OR paid_at IS NOT NULL"],
  ['tickets', 'chk_tickets_seat_number', 'seat_number >= 1'],
  ['tickets', 'chk_tickets_price', 'ticket_price > 0'],
  ['tickets', 'chk_tickets_print_count', 'print_count >= 0'],
  ['tickets', 'chk_tickets_active_seat',
    "(booking_status = 'booked' AND active_seat_number IS NOT NULL AND active_seat_number = seat_number) OR (booking_status = 'cancelled' AND active_seat_number IS NULL)"],
  ['tickets', 'chk_tickets_pickup_address', "pickup_type = 'station' OR pickup_address IS NOT NULL"],
  ['ticket_prints', 'chk_ticket_prints_sequence', 'print_sequence >= 1'],
  ['trip_incidents', 'chk_trip_incidents_delay', "type <> 'delay' OR (delay_minutes IS NOT NULL AND delay_minutes > 0)"],
  ['driver_unavailabilities', 'chk_driver_unavail_range', 'start_date <= end_date'],
]

// [bảng, cột[], tên, unique?] — mục 6.
const INDEXES = [
  ['users', ['phone'], 'idx_users_phone'],
  ['routes', ['origin', 'destination'], 'uq_routes_origin_destination', true],
  ['trip_templates', ['route_id'], 'idx_trip_templates_route'],
  ['trip_templates', ['vehicle_id'], 'idx_trip_templates_vehicle'],
  ['trips', ['template_id', 'departure_time'], 'idx_trip_template_departure'],
  ['trips', ['driver_id', 'departure_time'], 'idx_trips_driver'],
  ['trips', ['co_driver_id', 'departure_time'], 'idx_trips_co_driver'],
  ['trips', ['status', 'departure_time'], 'idx_trips_status_departure'],
  ['trips', ['route_id', 'departure_time'], 'idx_trips_route_departure'],
  ['invoices', ['user_id', 'created_at'], 'idx_invoices_user_created'],
  ['invoices', ['payment_status', 'created_at'], 'idx_invoices_status_created'],
  ['tickets', ['trip_id', 'active_seat_number'], 'uq_trip_active_seat', true],
  ['tickets', ['trip_id', 'pickup_type'], 'idx_tickets_trip_pickup'],
  ['tickets', ['invoice_id'], 'idx_tickets_invoice'],
  ['ticket_prints', ['ticket_id'], 'idx_ticket_prints_ticket'],
  ['ticket_prints', ['printed_at'], 'idx_ticket_prints_printed_at'],
  ['ticket_prints', ['printed_by', 'printed_at'], 'idx_ticket_prints_printed_by'],
  ['trip_incidents', ['trip_id'], 'idx_trip_incidents_trip'],
  ['trip_incidents', ['resolved_at', 'created_at'], 'idx_trip_incidents_open'],
  ['driver_unavailabilities', ['driver_id', 'start_date', 'end_date'], 'idx_driver_unavail'],
]

module.exports = {
  up: async ({ context: queryInterface }) => {
    const qi = queryInterface

    await qi.createTable('users', {
      id: id(),
      full_name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(100), allowNull: false, unique: 'uq_users_email' },
      phone: { type: DataTypes.STRING(15), allowNull: true },
      password: { type: DataTypes.STRING(255), allowNull: false },
      role: { type: DataTypes.ENUM('customer', 'staff', 'admin', 'driver'), allowNull: false, defaultValue: 'customer' },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(),
    }, TABLE_OPTIONS)

    await qi.createTable('routes', {
      id: id(),
      origin: { type: DataTypes.STRING(100), allowNull: false },
      destination: { type: DataTypes.STRING(100), allowNull: false },
      distance_km: { type: DataTypes.FLOAT, allowNull: true },
      duration_min: { type: DataTypes.INTEGER, allowNull: true },
      base_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      origin_station: { type: DataTypes.STRING(255), allowNull: true },
      shuttle_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      shuttle_area_note: { type: DataTypes.STRING(255), allowNull: true },
      ...timestamps(),
    }, TABLE_OPTIONS)

    await qi.createTable('vehicles', {
      id: id(),
      license_plate: { type: DataTypes.STRING(20), allowNull: false, unique: 'uq_vehicles_license_plate' },
      vehicle_type: { type: DataTypes.ENUM('sleeper', 'limousine', 'standard'), allowNull: false },
      total_seats: { type: DataTypes.INTEGER, allowNull: false },
      seat_layout: { type: DataTypes.JSON, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(),
    }, TABLE_OPTIONS)

    await qi.createTable('trip_templates', {
      id: id(),
      route_id: { type: DataTypes.INTEGER, allowNull: false },
      vehicle_id: { type: DataTypes.INTEGER, allowNull: false },
      departure_time_of_day: { type: DataTypes.STRING(5), allowNull: false },
      duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      available_seats: { type: DataTypes.INTEGER, allowNull: false },
      days_of_week: { type: DataTypes.JSON, allowNull: false },
      driver_id: { type: DataTypes.INTEGER, allowNull: true },
      co_driver_id: { type: DataTypes.INTEGER, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(),
    }, TABLE_OPTIONS)

    await qi.createTable('trips', {
      id: id(),
      route_id: { type: DataTypes.INTEGER, allowNull: false },
      vehicle_id: { type: DataTypes.INTEGER, allowNull: false },
      departure_time: { type: DataTypes.DATE, allowNull: false },
      arrival_time: { type: DataTypes.DATE, allowNull: true },
      available_seats: { type: DataTypes.INTEGER, allowNull: false },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      status: { type: DataTypes.ENUM('scheduled', 'ongoing', 'completed', 'cancelled'), allowNull: false, defaultValue: 'scheduled' },
      template_id: { type: DataTypes.INTEGER, allowNull: true },
      driver_id: { type: DataTypes.INTEGER, allowNull: true },
      co_driver_id: { type: DataTypes.INTEGER, allowNull: true },
      reminder_sent_at: { type: DataTypes.DATE, allowNull: true },
      actual_departure_at: { type: DataTypes.DATE, allowNull: true },
      actual_arrival_at: { type: DataTypes.DATE, allowNull: true },
      shuttle_locked_at: { type: DataTypes.DATE, allowNull: true },
      shuttle_list_printed_at: { type: DataTypes.DATE, allowNull: true },
      ...timestamps(),
    }, TABLE_OPTIONS)

    await qi.createTable('invoices', {
      id: id(),
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      payment_method: { type: DataTypes.ENUM('cash', 'momo'), allowNull: false, defaultValue: 'cash' },
      payment_status: { type: DataTypes.ENUM('pending', 'paid', 'refunded'), allowNull: false, defaultValue: 'pending' },
      paid_at: { type: DataTypes.DATE, allowNull: true },
      ...timestamps(),
    }, TABLE_OPTIONS)

    await qi.createTable('tickets', {
      id: id(),
      invoice_id: { type: DataTypes.INTEGER, allowNull: false },
      trip_id: { type: DataTypes.INTEGER, allowNull: false },
      seat_number: { type: DataTypes.INTEGER, allowNull: false },
      active_seat_number: { type: DataTypes.INTEGER, allowNull: true },
      passenger_name: { type: DataTypes.STRING(100), allowNull: false },
      passenger_phone: { type: DataTypes.STRING(15), allowNull: false },
      ticket_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      booking_status: { type: DataTypes.ENUM('booked', 'cancelled'), allowNull: false, defaultValue: 'booked' },
      cancelled_at: { type: DataTypes.DATE, allowNull: true },
      issued_at: { type: DataTypes.DATE, allowNull: true },
      issued_by: { type: DataTypes.INTEGER, allowNull: true },
      print_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      boarded_at: { type: DataTypes.DATE, allowNull: true },
      boarded_by: { type: DataTypes.INTEGER, allowNull: true },
      pickup_type: { type: DataTypes.ENUM('station', 'shuttle'), allowNull: false, defaultValue: 'station' },
      pickup_address: { type: DataTypes.STRING(255), allowNull: true },
      pickup_note: { type: DataTypes.STRING(255), allowNull: true },
      pickup_updated_at: { type: DataTypes.DATE, allowNull: true },
      ...timestamps(),
    }, TABLE_OPTIONS)

    await qi.createTable('ticket_prints', {
      id: id(),
      ticket_id: { type: DataTypes.INTEGER, allowNull: false },
      invoice_id: { type: DataTypes.INTEGER, allowNull: false },
      printed_by: { type: DataTypes.INTEGER, allowNull: false },
      printed_at: { type: DataTypes.DATE, allowNull: false },
      print_type: { type: DataTypes.ENUM('original', 'reprint'), allowNull: false },
      print_sequence: { type: DataTypes.INTEGER, allowNull: false },
      reason: { type: DataTypes.STRING(255), allowNull: true },
    }, TABLE_OPTIONS)

    await qi.createTable('trip_incidents', {
      id: id(),
      trip_id: { type: DataTypes.INTEGER, allowNull: false },
      reported_by: { type: DataTypes.INTEGER, allowNull: false },
      type: { type: DataTypes.ENUM('delay', 'breakdown', 'accident', 'other'), allowNull: false },
      delay_minutes: { type: DataTypes.INTEGER, allowNull: true },
      note: { type: DataTypes.STRING(500), allowNull: true },
      passengers_notified_at: { type: DataTypes.DATE, allowNull: true },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      resolved_by: { type: DataTypes.INTEGER, allowNull: true },
      ...timestamps(),
    }, TABLE_OPTIONS)

    await qi.createTable('driver_unavailabilities', {
      id: id(),
      driver_id: { type: DataTypes.INTEGER, allowNull: false },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: false },
      reason: { type: DataTypes.STRING(255), allowNull: true },
      ...timestamps(),
    }, TABLE_OPTIONS)

    for (const [table, fields, name, unique] of INDEXES) {
      await qi.addIndex(table, fields, { name, unique: Boolean(unique) })
    }

    for (const [table, column, parent, onDelete, name] of FOREIGN_KEYS) {
      await qi.addConstraint(table, {
        type: 'foreign key',
        name,
        fields: [column],
        references: { table: parent, field: 'id' },
        onDelete,
        onUpdate: 'CASCADE',
      })
    }

    for (const [table, name, expression] of CHECKS) {
      await qi.sequelize.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\` CHECK (${expression})`)
    }
  },

  down: async ({ context: queryInterface }) => {
    for (const table of [...TABLES].reverse()) {
      await queryInterface.dropTable(table)
    }
  },
}
