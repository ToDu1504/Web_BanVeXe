const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')
const bcrypt = require('bcryptjs')

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('customer', 'staff', 'admin', 'driver'),
    allowNull: false,
    defaultValue: 'customer',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  // Quên mật khẩu (migration 20261012000001): chỉ lưu sha256 của token, không lưu token gốc.
  password_reset_token_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  password_reset_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // JWT phát hành trước mốc này bị protect() từ chối — đổi/đặt lại mật khẩu là đăng xuất mọi phiên cũ.
  password_changed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(user.password, salt)
        // Bản ghi mới không cần mốc này (chưa có JWT nào để vô hiệu).
        if (!user.isNewRecord) user.password_changed_at = new Date()
      }
    },
  },
})

// Instance method to check password
User.prototype.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Không bao giờ lộ hash mật khẩu / token đặt lại ra JSON trả về client.
const SENSITIVE_FIELDS = ['password', 'password_reset_token_hash', 'password_reset_expires_at']
User.prototype.toJSON = function () {
  const values = this.get({ plain: true })
  SENSITIVE_FIELDS.forEach((field) => delete values[field])
  return values
}

module.exports = User
