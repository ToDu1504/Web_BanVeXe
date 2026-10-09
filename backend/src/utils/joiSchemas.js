const Joi = require('joi')

const schemas = {
  // Auth
  register: Joi.object({
    full_name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Họ tên phải có ít nhất 2 ký tự.',
      'any.required': 'Họ tên là bắt buộc.',
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Email không đúng định dạng.',
      'any.required': 'Email là bắt buộc.',
    }),
    phone: Joi.string().pattern(/^(0[3|5|7|8|9])+([0-9]{8})$/).required().messages({
      'string.pattern.base': 'Số điện thoại không đúng định dạng Việt Nam.',
      'any.required': 'Số điện thoại là bắt buộc.',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Mật khẩu phải có ít nhất 6 ký tự.',
      'any.required': 'Mật khẩu là bắt buộc.',
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email không đúng định dạng.',
      'any.required': 'Email là bắt buộc.',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Mật khẩu là bắt buộc.',
    }),
  }),

  updateProfile: Joi.object({
    full_name: Joi.string().min(2).max(100).optional(),
    phone: Joi.string().pattern(/^(0[3|5|7|8|9])+([0-9]{8})$/).optional().messages({
      'string.pattern.base': 'Số điện thoại không đúng định dạng Việt Nam.',
    }),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Mật khẩu hiện tại là bắt buộc.',
    }),
    newPassword: Joi.string().min(6).required().messages({
      'string.min': 'Mật khẩu mới phải có ít nhất 6 ký tự.',
      'any.required': 'Mật khẩu mới là bắt buộc.',
    }),
  }),

  // Admin User CRUD
  createUser: Joi.object({
    full_name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^(0[3|5|7|8|9])+([0-9]{8})$/).optional(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('customer', 'staff', 'admin', 'driver').default('customer'),
  }),

  updateUserRole: Joi.object({
    role: Joi.string().valid('customer', 'staff', 'admin', 'driver').required(),
  }),

  updateUserStatus: Joi.object({
    is_active: Joi.boolean().required(),
  }),

  // Route CRUD
  createRoute: Joi.object({
    origin: Joi.string().min(2).required(),
    destination: Joi.string().min(2).required(),
    distance_km: Joi.number().positive().optional(),
    duration_min: Joi.number().integer().positive().optional(),
    base_price: Joi.number().min(1000).required(),
    // Tự tạo luôn tuyến chiều về (destination → origin). Mặc định bật.
    create_return: Joi.boolean().default(true),
    origin_station: Joi.string().trim().max(255).allow('', null).optional(),
    shuttle_enabled: Joi.boolean().optional(),
    shuttle_area_note: Joi.string().trim().max(255).allow('', null).optional(),
  }),

  updateRoute: Joi.object({
    origin: Joi.string().min(2).optional(),
    destination: Joi.string().min(2).optional(),
    distance_km: Joi.number().positive().optional(),
    duration_min: Joi.number().integer().positive().optional(),
    base_price: Joi.number().min(1000).optional(),
    is_active: Joi.boolean().optional(),
    origin_station: Joi.string().trim().max(255).allow('', null).optional(),
    shuttle_enabled: Joi.boolean().optional(),
    shuttle_area_note: Joi.string().trim().max(255).allow('', null).optional(),
  }),

  // Đổi cách lên xe của một vé (tự đến bến <-> xe trung chuyển)
  updateTicketPickup: Joi.object({
    pickup_type: Joi.string().valid('station', 'shuttle').required(),
    pickup_address: Joi.when('pickup_type', {
      is: 'shuttle',
      then: Joi.string().trim().min(5).max(255).required().messages({
        'string.min': 'Địa chỉ đón phải có ít nhất 5 ký tự.',
        'any.required': 'Vui lòng nhập địa chỉ để xe trung chuyển đón.',
        'string.empty': 'Vui lòng nhập địa chỉ để xe trung chuyển đón.',
      }),
      otherwise: Joi.any().strip(),
    }),
    pickup_note: Joi.string().trim().max(255).allow('', null).optional(),
  }),

  markShuttlePrinted: Joi.object({
    trip_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
  }),

  // Vehicle CRUD
  createVehicle: Joi.object({
    license_plate: Joi.string().pattern(/^[0-9]{2}[A-Z]-[0-9]{4,5}$/).required().messages({
      'string.pattern.base': 'Biển số xe phải đúng định dạng (Ví dụ: 29B-12345)',
    }),
    vehicle_type: Joi.string().valid('sleeper', 'limousine', 'standard').required(),
    total_seats: Joi.number().integer().min(4).required(),
    seat_layout: Joi.object().optional(),
  }),

  updateVehicle: Joi.object({
    license_plate: Joi.string().pattern(/^[0-9]{2}[A-Z]-[0-9]{4,5}$/).optional(),
    vehicle_type: Joi.string().valid('sleeper', 'limousine', 'standard').optional(),
    total_seats: Joi.number().integer().min(4).optional(),
    seat_layout: Joi.object().optional(),
    is_active: Joi.boolean().optional(),
  }),

  // Trip CRUD
  createTrip: Joi.object({
    route_id: Joi.number().integer().required(),
    vehicle_id: Joi.number().integer().required(),
    departure_time: Joi.string().isoDate().required(),
    arrival_time: Joi.string().isoDate().optional().allow(null, ''),
    price: Joi.number().min(1000).required(),
    available_seats: Joi.number().integer().min(1).required(),
    status: Joi.string().valid('scheduled', 'ongoing', 'completed', 'cancelled').optional(),
    driver_id: Joi.number().integer().optional().allow(null),
    co_driver_id: Joi.number().integer().optional().allow(null),
  }),

  updateTrip: Joi.object({
    route_id: Joi.number().integer().optional(),
    vehicle_id: Joi.number().integer().optional(),
    departure_time: Joi.string().isoDate().optional(),
    arrival_time: Joi.string().isoDate().optional().allow(null, ''),
    price: Joi.number().min(1000).optional(),
    available_seats: Joi.number().integer().min(0).optional(),
    status: Joi.string().valid('scheduled', 'ongoing', 'completed', 'cancelled').optional(),
    driver_id: Joi.number().integer().optional().allow(null),
    co_driver_id: Joi.number().integer().optional().allow(null),
  }),

  // Trip Template CRUD (recurring trips, auto-generated by
  // jobs/generateTripsFromTemplates.js)
  createTripTemplate: Joi.object({
    route_id: Joi.number().integer().required(),
    vehicle_id: Joi.number().integer().required(),
    departure_time_of_day: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required().messages({
      'string.pattern.base': 'Giờ khởi hành phải theo định dạng HH:mm.',
    }),
    duration_minutes: Joi.number().integer().positive().optional().allow(null),
    price: Joi.number().min(1000).required(),
    available_seats: Joi.number().integer().min(1).required(),
    days_of_week: Joi.array().items(Joi.number().integer().min(0).max(6)).min(1).required().messages({
      'array.min': 'Chọn ít nhất 1 ngày trong tuần.',
    }),
    driver_id: Joi.number().integer().optional().allow(null),
    co_driver_id: Joi.number().integer().optional().allow(null),
    is_active: Joi.boolean().optional(),
  }),

  updateTripTemplate: Joi.object({
    route_id: Joi.number().integer().optional(),
    vehicle_id: Joi.number().integer().optional(),
    departure_time_of_day: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).optional().messages({
      'string.pattern.base': 'Giờ khởi hành phải theo định dạng HH:mm.',
    }),
    duration_minutes: Joi.number().integer().positive().optional().allow(null),
    price: Joi.number().min(1000).optional(),
    available_seats: Joi.number().integer().min(1).optional(),
    days_of_week: Joi.array().items(Joi.number().integer().min(0).max(6)).min(1).optional().messages({
      'array.min': 'Chọn ít nhất 1 ngày trong tuần.',
    }),
    driver_id: Joi.number().integer().optional().allow(null),
    co_driver_id: Joi.number().integer().optional().allow(null),
    is_active: Joi.boolean().optional(),
  }),

  // Invoice
  // Note: total_price/ticket_price are accepted for backward-compat with the
  // client payload but are NOT trusted — the server recomputes both from
  // Trip.price (see invoiceController.create) so a tampered client value
  // can never change what gets charged.
  createInvoice: Joi.object({
    total_price: Joi.number().optional(),
    payment_method: Joi.string().valid('cash', 'momo').required(),
    // Chỉ có tác dụng khi người gọi là staff/admin (đặt vé hộ khách) — xem
    // invoiceController.create. Khách hàng gửi field này sẽ bị từ chối 403.
    customer_id: Joi.number().integer().optional(),
    tickets: Joi.array().items(
      Joi.object({
        trip_id: Joi.number().integer().required(),
        seat_number: Joi.number().integer().min(1).required(),
        passenger_name: Joi.string().min(2).required(),
        passenger_phone: Joi.string().pattern(/^(0[3|5|7|8|9])+([0-9]{8})$/).required(),
        ticket_price: Joi.number().optional(),
        pickup_type: Joi.string().valid('station', 'shuttle').default('station'),
        pickup_address: Joi.when('pickup_type', {
          is: 'shuttle',
          then: Joi.string().trim().min(5).max(255).required().messages({
            'string.min': 'Địa chỉ đón phải có ít nhất 5 ký tự.',
            'any.required': 'Vui lòng nhập địa chỉ để xe trung chuyển đón.',
            'string.empty': 'Vui lòng nhập địa chỉ để xe trung chuyển đón.',
          }),
          otherwise: Joi.any().strip(),
        }),
        pickup_note: Joi.string().trim().max(255).allow('', null).optional(),
      })
    ).min(1).required(),
  }),

  updateInvoiceStatus: Joi.object({
    payment_status: Joi.string().valid('pending', 'paid', 'refunded').required(),
  }),

  // Quầy vé — đặt vé hộ khách
  resolveCustomer: Joi.object({
    full_name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Họ tên phải có ít nhất 2 ký tự.',
      'any.required': 'Họ tên là bắt buộc.',
    }),
    phone: Joi.string().pattern(/^(0[3|5|7|8|9])+([0-9]{8})$/).required().messages({
      'string.pattern.base': 'Số điện thoại không đúng định dạng Việt Nam.',
      'any.required': 'Số điện thoại là bắt buộc.',
    }),
    email: Joi.string().email().optional().messages({
      'string.email': 'Email không đúng định dạng.',
    }),
  }),

  // Ticket printing (quầy vé)
  printTicket: Joi.object({
    reason: Joi.string().min(3).max(255).optional().messages({
      'string.min': 'Lý do in lại phải có ít nhất 3 ký tự.',
    }),
  }),

  // Tài xế
  createIncident: Joi.object({
    type: Joi.string().valid('delay', 'breakdown', 'accident', 'other').required(),
    delay_minutes: Joi.number().integer().min(1).max(1440).optional(),
    note: Joi.string().max(500).allow('', null).optional(),
    notify_passengers: Joi.boolean().optional(),
  }),

  createUnavailability: Joi.object({
    start_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
      'string.pattern.base': 'Ngày bắt đầu phải theo định dạng YYYY-MM-DD.',
    }),
    end_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
      'string.pattern.base': 'Ngày kết thúc phải theo định dạng YYYY-MM-DD.',
    }),
    reason: Joi.string().max(255).allow('', null).optional(),
  }),

  setBoarded: Joi.object({
    boarded: Joi.boolean().required(),
  }),
}

module.exports = schemas
