// Phân trang dùng chung cho mọi endpoint getAll — chỉ kích hoạt khi request có
// query `page` (opt-in). Không truyền `page` thì controller giữ nguyên hành vi
// cũ (trả mảng thô, không phân trang) — cần thiết vì nhiều nơi (dropdown chọn
// Route/Vehicle trong form, tính KPI ở Dashboard...) cần TOÀN BỘ danh sách,
// không phải 1 trang.
const getPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1)
  const limit = Math.max(parseInt(query.limit, 10) || 10, 1)
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

const buildPaginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(Math.ceil(total / limit), 1),
})

module.exports = { getPagination, buildPaginationMeta }
