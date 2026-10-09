import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Format tiền VND
export function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

// Format ngày giờ
export function formatDateTime(dateStr) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

// Format ngày
export function formatDate(dateStr) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

// ---- Ngày giờ theo múi giờ Việt Nam (dùng cho lịch tuần của tài xế) ----
const VN_TZ = 'Asia/Ho_Chi_Minh'

// Date/ISO → 'YYYY-MM-DD' theo giờ VN (en-CA cho đúng định dạng ISO).
export function toVNDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: VN_TZ }).format(new Date(date))
}

// Chỉ giờ:phút theo giờ VN, VD "08:30"
export function formatTime(dateStr) {
  if (!dateStr) return '--:--'
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: VN_TZ,
  }).format(new Date(dateStr))
}

// Cộng/trừ ngày trên chuỗi 'YYYY-MM-DD' (không phụ thuộc timezone trình duyệt).
export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Thứ 2 của tuần chứa dateStr (tuần VN bắt đầu từ Thứ 2).
export function getWeekStart(dateStr = toVNDateString()) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const dayFromMonday = (d.getUTCDay() + 6) % 7
  return addDays(dateStr, -dayFromMonday)
}

// 'YYYY-MM-DD' → 'dd/MM/yyyy'
export function formatDateString(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = String(dateStr).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// Tính thời gian di chuyển (phút → giờ phút)
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} phút`
  if (m === 0) return `${h} giờ`
  return `${h} giờ ${m} phút`
}

// Xuất báo cáo dạng CSV (mở được trực tiếp bằng Excel) — rows là mảng các
// mảng ô (hàng trống [] để ngăn cách các bảng con trong cùng 1 file).
export function exportToCsv(filename, rows) {
  const escapeCell = (value) => {
    const str = String(value ?? '')

    // Excel auto-detects short day/month strings like "09-08" and silently
    // reinterprets them as a real date (often swapping day/month, e.g. it
    // becomes "8-Sep" instead of the intended "ngày 09 tháng 08"). Force
    // those specific cells to literal text with the ="..." formula trick so
    // what's on screen matches exactly what the app displayed.
    if (/^\d{1,2}[-/]\d{1,2}$/.test(str)) {
      return `="${str}"`
    }

    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }

  // Các bảng con trong file có số cột khác nhau (VD: bảng tổng quan có 2
  // cột, bảng doanh thu theo ngày có 3 cột) — đệm thêm ô rỗng cho đều số
  // cột theo hàng dài nhất, để khi mở trong Excel không bị lởm chởm cột.
  const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const paddedRows = rows.map((row) => {
    const padded = [...row]
    while (padded.length < maxCols) padded.push('')
    return padded
  })

  // BOM để Excel nhận đúng encoding UTF-8 (hiển thị đúng tiếng Việt có dấu),
  // và dòng "sep=," để Excel luôn tách cột theo dấu phẩy — nếu không có dòng
  // này, Excel ở máy dùng vùng miền Việt Nam (mặc định dấu phân cách danh
  // sách là ";") sẽ dồn cả hàng vào 1 cột thay vì tách đúng.
  const csvContent = '﻿sep=,\r\n' + paddedRows.map((row) => row.map(escapeCell).join(',')).join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
