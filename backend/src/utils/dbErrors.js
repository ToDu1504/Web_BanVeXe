// Dịch lỗi ràng buộc của DB (FK / UNIQUE / CHECK — migrations/) sang phản hồi
// tiếng Việt. Controller vẫn tự kiểm tra trước để trả thông báo cụ thể; đây là
// lớp chặn cuối khi một ràng buộc bị vi phạm mà code chưa lường trước — thay vì
// trả 500 "Lỗi máy chủ", trả 400/409 có nghĩa.
//
// Trả về { status, message } hoặc null nếu không phải lỗi ràng buộc.

// Thông báo riêng cho từng CHECK (tên đặt trong migration baseline).
const CHECK_MESSAGES = {
  chk_trips_arrival: 'Giờ đến phải sau giờ khởi hành.',
  chk_trips_available_seats: 'Số ghế trống không được âm.',
  chk_trips_price: 'Giá vé phải lớn hơn 0.',
  chk_trips_co_driver: 'Tài xế phụ phải khác tài xế chính.',
  chk_trip_templates_price: 'Giá vé phải lớn hơn 0.',
  chk_trip_templates_seats: 'Số ghế mở bán không được âm.',
  chk_trip_templates_duration: 'Thời gian chạy phải lớn hơn 0.',
  chk_trip_templates_co_driver: 'Tài xế phụ phải khác tài xế chính.',
  chk_routes_base_price: 'Giá vé gốc phải lớn hơn 0.',
  chk_routes_distance: 'Cự ly phải lớn hơn 0.',
  chk_routes_duration: 'Thời gian chạy phải lớn hơn 0.',
  chk_vehicles_total_seats: 'Số ghế của xe phải lớn hơn 0.',
  chk_invoices_total_price: 'Tổng tiền hóa đơn không hợp lệ.',
  chk_invoices_paid_at: 'Hóa đơn đã thanh toán phải có thời điểm thanh toán.',
  chk_tickets_active_seat: 'Trạng thái vé và ghế không khớp nhau.',
  chk_tickets_pickup_address: 'Vé đi xe trung chuyển phải có địa chỉ đón.',
  chk_trip_incidents_delay: 'Sự cố trễ chuyến phải có số phút trễ lớn hơn 0.',
  chk_driver_unavail_range: 'Ngày bắt đầu nghỉ phải trước hoặc bằng ngày kết thúc.',
}

const UNIQUE_MESSAGES = {
  uq_routes_origin_destination: 'Tuyến đường này (cùng điểm đi và điểm đến) đã tồn tại.',
  uq_vehicles_license_plate: 'Biển số xe đã tồn tại.',
  uq_users_email: 'Email đã được sử dụng.',
  uq_trip_active_seat: 'Ghế này đã được đặt.',
}

// MariaDB: ER_CONSTRAINT_FAILED (4025) "CONSTRAINT `name` failed for ..."
// MySQL 8: ER_CHECK_CONSTRAINT_VIOLATED (3819) "Check constraint 'name' is violated."
const CHECK_ERRNOS = new Set([4025, 3819])

const findName = (sqlMessage, names) => names.find((name) => sqlMessage.includes(name))

const mapDbError = (error) => {
  const parent = error?.parent || error?.original || {}
  const sqlMessage = String(parent.sqlMessage || error?.message || '')

  if (error?.name === 'SequelizeForeignKeyConstraintError') {
    // 1451: xóa/sửa bản ghi cha còn bản ghi con; 1452: tham chiếu tới bản ghi không tồn tại.
    if (parent.errno === 1452) {
      return { status: 400, message: 'Dữ liệu tham chiếu (tuyến, xe, tài xế, chuyến…) không tồn tại.' }
    }
    return {
      status: 409,
      message: 'Không thể thực hiện vì bản ghi này đang được dữ liệu khác sử dụng (hóa đơn, vé, chuyến xe…). Hãy ngừng hoạt động thay vì xóa.',
    }
  }

  if (error?.name === 'SequelizeUniqueConstraintError') {
    const name = findName(sqlMessage, Object.keys(UNIQUE_MESSAGES))
    return { status: 409, message: UNIQUE_MESSAGES[name] || 'Dữ liệu bị trùng với bản ghi đã có.' }
  }

  if (CHECK_ERRNOS.has(parent.errno)) {
    const name = findName(sqlMessage, Object.keys(CHECK_MESSAGES))
    return { status: 400, message: CHECK_MESSAGES[name] || 'Dữ liệu không hợp lệ.' }
  }

  return null
}

module.exports = { mapDbError }
