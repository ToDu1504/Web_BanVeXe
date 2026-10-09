const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'momo'),
    allowNull: false,
    defaultValue: 'cash',
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'refunded'),
    allowNull: false,
    defaultValue: 'pending',
  },
  // Thời điểm hóa đơn chuyển sang 'paid' (CHECK chk_invoices_paid_at: đã/hoàn
  // tiền thì phải có). Ghi ở invoiceController.updateStatus và paymentController.
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'invoices',
  timestamps: true,
})

module.exports = Invoice
