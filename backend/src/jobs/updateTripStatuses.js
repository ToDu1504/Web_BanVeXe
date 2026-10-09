const { Op } = require('sequelize')
const { Trip } = require('../models')

const CHECK_INTERVAL_MS = Number(process.env.TRIP_STATUS_CHECK_INTERVAL_MS) || 60 * 1000
// Chuyến đã phân công tài xế do tài xế tự bấm "Hoàn thành"; nếu họ quên, job
// tự đóng chuyến sau arrival_time + số phút này.
const AUTO_COMPLETE_GRACE_MINUTES = Number(process.env.TRIP_AUTO_COMPLETE_GRACE_MINUTES) || 180

// Moves trips along their lifecycle based on the clock:
//   scheduled → ongoing   once departure_time has passed
//   scheduled/ongoing → completed once arrival_time has passed
// Cancelled trips are never touched.
//
// Chuyến ĐÃ có tài xế (driver_id) do tài xế điều khiển bằng nút Bắt đầu/Hoàn
// thành: job không tự chuyển scheduled → ongoing, và chỉ tự completed khi đã
// quá arrival_time + AUTO_COMPLETE_GRACE_MINUTES. Chuyến chưa có tài xế giữ
// nguyên hành vi tự động theo giờ.
const updateTripStatuses = async () => {
  const now = new Date()
  const graceCutoff = new Date(now.getTime() - AUTO_COMPLETE_GRACE_MINUTES * 60 * 1000)

  const [completed] = await Trip.update(
    { status: 'completed' },
    {
      where: {
        status: { [Op.in]: ['scheduled', 'ongoing'] },
        arrival_time: { [Op.ne]: null, [Op.lte]: now },
        [Op.or]: [
          { driver_id: null },
          { arrival_time: { [Op.lte]: graceCutoff } },
        ],
      },
    },
  )

  const [ongoing] = await Trip.update(
    { status: 'ongoing' },
    {
      where: {
        status: 'scheduled',
        departure_time: { [Op.lte]: now },
        driver_id: null,
      },
    },
  )

  return { ongoing, completed }
}

const startUpdateTripStatusesJob = () => {
  const run = async () => {
    try {
      const { ongoing, completed } = await updateTripStatuses()
      if (ongoing || completed) {
        console.log(`🕒 Cập nhật trạng thái chuyến: ${ongoing} đang chạy, ${completed} đã hoàn thành.`)
      }
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái chuyến xe:', error.message)
    }
  }
  run()
  setInterval(run, CHECK_INTERVAL_MS)
}

module.exports = { updateTripStatuses, startUpdateTripStatusesJob }
