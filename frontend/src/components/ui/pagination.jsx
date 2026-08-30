import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Danh sách số trang rút gọn kiểu "1 ... 4 5 [6] 7 8 ... 20" quanh trang hiện tại.
function getPageNumbers(page, totalPages) {
  const delta = 1
  const pages = []
  const start = Math.max(2, page - delta)
  const end = Math.min(totalPages - 1, page + delta)

  pages.push(1)
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < totalPages - 1) pages.push('...')
  if (totalPages > 1) pages.push(totalPages)

  return pages
}

// pagination: { page, limit, total, totalPages } — theo đúng shape trả về từ
// utils/pagination.js phía backend.
export function Pagination({ pagination, onPageChange, className = '' }) {
  if (!pagination || pagination.totalPages <= 1) return null

  const { page, totalPages, total, limit } = pagination
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className={`flex flex-col items-center justify-between gap-3 sm:flex-row ${className}`}>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        Hiển thị {from}-{to} trên tổng {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers(page, totalPages).map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-[hsl(var(--muted-foreground))]">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
