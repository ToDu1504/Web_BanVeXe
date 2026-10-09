const { Op } = require('sequelize')
const { TripIncident, Trip, Route, Vehicle, User } = require('../models')
const { getPagination, buildPaginationMeta } = require('../utils/pagination')
const { mapDbError } = require('../utils/dbErrors')

const tripIncidentController = {
  // @desc    Danh sách sự cố tài xế báo — lọc theo trạng thái xử lý; phân trang
  //          opt-in khi có `page`.
  // @route   GET /api/trip-incidents?status=open|resolved&from=&to=&page=&limit=
  // @access  Private/Staff/Admin
  getAll: async (req, res) => {
    try {
      const { status, from, to } = req.query
      const where = {}
      if (status === 'open') where.resolved_at = null
      if (status === 'resolved') where.resolved_at = { [Op.ne]: null }
      if (from || to) {
        where.created_at = {
          ...(from ? { [Op.gte]: new Date(from) } : {}),
          ...(to ? { [Op.lte]: new Date(to) } : {}),
        }
      }

      const include = [
        { model: Trip, include: [Route, Vehicle] },
        { model: User, as: 'Reporter', attributes: ['id', 'full_name', 'phone'] },
        { model: User, as: 'Resolver', attributes: ['id', 'full_name'] },
      ]
      const order = [['created_at', 'DESC']]

      if (!req.query.page) {
        const incidents = await TripIncident.findAll({ where, include, order })
        return res.status(200).json(incidents)
      }

      const { page, limit, offset } = getPagination(req.query)
      const { rows, count } = await TripIncident.findAndCountAll({
        where, include, order, limit, offset, distinct: true,
      })
      return res.status(200).json({ data: rows, pagination: buildPaginationMeta(page, limit, count) })
    } catch (error) {
      console.error('Lỗi trip incident getAll:', error)
      return res.status(500).json({ message: 'Lỗi máy chủ khi tải danh sách sự cố.' })
    }
  },

  // @desc    Đánh dấu một sự cố đã xử lý
  // @route   PUT /api/trip-incidents/:id/resolve
  // @access  Private/Staff/Admin
  resolve: async (req, res) => {
    try {
      const incident = await TripIncident.findByPk(req.params.id)
      if (!incident) {
        return res.status(404).json({ message: 'Không tìm thấy sự cố.' })
      }
      if (incident.resolved_at) {
        return res.status(400).json({ message: 'Sự cố này đã được xử lý trước đó.' })
      }

      incident.resolved_at = new Date()
      incident.resolved_by = req.user.id
      await incident.save()
      return res.status(200).json(incident)
    } catch (error) {
      console.error('Lỗi trip incident resolve:', error)
      const dbError = mapDbError(error)
      if (dbError) return res.status(dbError.status).json({ message: dbError.message })
      return res.status(500).json({ message: 'Lỗi máy chủ khi cập nhật sự cố.' })
    }
  },
}

module.exports = tripIncidentController
