// Tiện ích ngày giờ theo múi giờ Việt Nam (UTC+7), không phụ thuộc timezone
// của process — dùng cho lịch tuần của tài xế và các kiểm tra theo "ngày".
const VN_OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

const pad = (n) => String(n).padStart(2, '0')

// Date → 'YYYY-MM-DD' theo giờ VN.
const toVNDateString = (date = new Date()) => {
  const d = new Date(new Date(date).getTime() + VN_OFFSET_MS)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

// 'YYYY-MM-DD' → Date lúc 00:00 / 23:59:59.999 giờ VN.
const startOfVNDay = (dateStr) => new Date(`${dateStr}T00:00:00+07:00`)
const endOfVNDay = (dateStr) => new Date(`${dateStr}T23:59:59.999+07:00`)

const isValidDateString = (str) => (
  typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str) && !Number.isNaN(startOfVNDay(str).getTime())
)

// Thứ 2 00:00 (giờ VN) của tuần chứa `date`. Tuần VN bắt đầu từ Thứ 2.
const startOfVNWeek = (date = new Date()) => {
  const base = new Date(date).getTime()
  const vn = new Date(base + VN_OFFSET_MS)
  const dayFromMonday = (vn.getUTCDay() + 6) % 7 // Mon=0 ... Sun=6
  return startOfVNDay(toVNDateString(new Date(base - dayFromMonday * DAY_MS)))
}

// Khoảng [Thứ 2 00:00, Chủ nhật 23:59:59.999] của tuần chứa weekStartStr
// (mặc định tuần hiện tại). Ngày không phải Thứ 2 được kéo về Thứ 2 cùng tuần.
const getVNWeekRange = (weekStartStr) => {
  const anchor = weekStartStr && isValidDateString(weekStartStr)
    ? startOfVNDay(weekStartStr)
    : new Date()
  const start = startOfVNWeek(anchor)
  const end = new Date(start.getTime() + 7 * DAY_MS - 1)
  return { start, end, weekStart: toVNDateString(start), weekEnd: toVNDateString(end) }
}

// Định dạng hiển thị cho email: "08:30 15/10/2026"
const formatVNDateTime = (date) => {
  if (!date) return ''
  const d = new Date(new Date(date).getTime() + VN_OFFSET_MS)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
}

module.exports = {
  DAY_MS,
  toVNDateString,
  startOfVNDay,
  endOfVNDay,
  isValidDateString,
  startOfVNWeek,
  getVNWeekRange,
  formatVNDateTime,
}
