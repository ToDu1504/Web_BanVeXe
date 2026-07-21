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
    role: Joi.string().valid('customer', 'staff', 'admin').default('customer'),
  }),

  updateUserRole: Joi.object({
    role: Joi.string().valid('customer', 'staff', 'admin').required(),
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
  }),

  updateRoute: Joi.object({
    origin: Joi.string().min(2).optional(),
    destination: Joi.string().min(2).optional(),
    distance_km: Joi.number().positive().optional(),
    duration_min: Joi.number().integer().positive().optional(),
    base_price: Joi.number().min(1000).optional(),
    is_active: Joi.boolean().optional(),
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
  }),

  updateTrip: Joi.object({
    route_id: Joi.number().integer().optional(),
    vehicle_id: Joi.number().integer().optional(),
    departure_time: Joi.string().isoDate().optional(),
    arrival_time: Joi.string().isoDate().optional().allow(null, ''),
    price: Joi.number().min(1000).optional(),
    available_seats: Joi.number().integer().min(0).optional(),
    status: Joi.string().valid('scheduled', 'ongoing', 'completed', 'cancelled').optional(),
  }),

  // Invoice
  createInvoice: Joi.object({
    total_price: Joi.number().required(),
    payment_method: Joi.string().valid('cash', 'banking', 'momo').required(),
    tickets: Joi.array().items(
      Joi.object({
        trip_id: Joi.number().integer().required(),
        seat_number: Joi.number().integer().min(1).required(),
        passenger_name: Joi.string().min(2).required(),
        passenger_phone: Joi.string().pattern(/^(0[3|5|7|8|9])+([0-9]{8})$/).required(),
        ticket_price: Joi.number().required(),
      })
    ).min(1).required(),
  }),

  updateInvoiceStatus: Joi.object({
    payment_status: Joi.string().valid('pending', 'paid', 'refunded').required(),
  }),
}

module.exports = schemas
