import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatDateTime } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Tờ in "Danh sách đón khách" cho tài xế trung chuyển (md/DonKhachTrungChuyen.md).
// Mỗi chuyến một khối, các vé cùng địa chỉ gộp thành một nhóm. Chỉ render khi
// có `entries` (dữ liệu từ GET /api/shuttles/pickup-list) và tự gọi
// window.print() ngay sau khi mount.
//
// Portal ra document.body (không nằm trong Dialog cuộn) để không bị cắt khi in,
// cùng mẫu với manifest ở TripPassengersDialog. Hộp thoại in đóng (in hay hủy
// đều như nhau với trình duyệt) thì hỏi nhân viên đã in xong chưa rồi gọi
// `onDone(printed)` — nơi gọi chỉ đánh dấu đã in (POST /api/shuttles/mark-printed)
// khi printed = true.
export default function ShuttlePickupSheet({ entries, onDone }) {
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (!entries) return undefined
    setAsking(false)
    const handleAfterPrint = () => setAsking(true)
    window.addEventListener('afterprint', handleAfterPrint, { once: true })
    const timer = setTimeout(() => window.print(), 150)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  if (!entries) return null

  const sheet = (
    <div className="shuttle-print-area hidden print:block p-6 text-black">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .shuttle-print-area, .shuttle-print-area * { visibility: visible; }
          .shuttle-trip-block { page-break-inside: avoid; margin-bottom: 24px; }
        }
      `}</style>
      <p className="text-center text-lg font-bold">DANH SÁCH ĐÓN KHÁCH — XE TRUNG CHUYỂN</p>
      <p className="text-center text-xs mb-4">In lúc {formatDateTime(new Date())}</p>

      {entries.map(({ trip, estimated_pickup_time: pickupTime, stops, passenger_count: total }) => {
        let index = 0
        return (
          <div key={trip.id} className="shuttle-trip-block space-y-2">
            <div className="grid grid-cols-2 gap-y-1 text-xs border border-black p-2">
              <span className="font-bold col-span-2 text-sm">{trip.Route?.origin} → {trip.Route?.destination}</span>
              <span>Khởi hành: {formatDateTime(trip.departure_time)}</span>
              <span>Giờ đón dự kiến: {formatDateTime(pickupTime)}</span>
              <span>Xe: {trip.Vehicle?.license_plate}</span>
              <span>Tài xế: {trip.Driver?.full_name || '..............'}{trip.Driver?.phone ? ` – ${trip.Driver.phone}` : ''}</span>
              <span className="col-span-2">Về bến: {trip.Route?.origin_station || trip.Route?.origin}</span>
              <span className="col-span-2 font-bold">Tổng số khách cần đón: {total} · {stops.length} điểm đón</span>
            </div>

            {total === 0 ? (
              <p className="text-xs italic">Chuyến này không có khách đi trung chuyển.</p>
            ) : (
              <table className="w-full text-xs border-collapse border border-black">
                <thead>
                  <tr>
                    <th className="border border-black p-1 w-8">STT</th>
                    <th className="border border-black p-1">Địa chỉ đón</th>
                    <th className="border border-black p-1">Họ tên</th>
                    <th className="border border-black p-1">SĐT</th>
                    <th className="border border-black p-1 w-10">Ghế</th>
                    <th className="border border-black p-1">Ghi chú</th>
                    <th className="border border-black p-1 w-14">Đã đón</th>
                  </tr>
                </thead>
                <tbody>
                  {stops.flatMap((stop) => stop.passengers.map((p, i) => {
                    index += 1
                    return (
                      <tr key={p.id}>
                        <td className="border border-black p-1 text-center">{index}</td>
                        {i === 0 && (
                          <td className="border border-black p-1 font-semibold" rowSpan={stop.passengers.length}>
                            {stop.address}
                          </td>
                        )}
                        <td className="border border-black p-1">{p.passenger_name}</td>
                        <td className="border border-black p-1">{p.passenger_phone}</td>
                        <td className="border border-black p-1 text-center font-bold">{p.seat_number}</td>
                        <td className="border border-black p-1">{p.pickup_note || ''}</td>
                        <td className="border border-black p-1 text-center">☐</td>
                      </tr>
                    )
                  }))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}

      <div className="mt-6 flex justify-between text-xs">
        <span>Nhân viên quầy: ................................</span>
        <span>Tài xế trung chuyển ký nhận: ................................</span>
      </div>
    </div>
  )

  const answer = (printed) => {
    setAsking(false)
    onDone?.(printed)
  }

  return (
    <>
      {createPortal(sheet, document.body)}
      <AlertDialog open={asking} onOpenChange={(open) => !open && answer(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đã in xong danh sách đón?</AlertDialogTitle>
            <AlertDialogDescription>
              Chọn "Đã in" để ghi nhận và gỡ chuyến khỏi hàng chờ. Nếu bạn đã hủy hoặc máy in lỗi, chọn "Chưa in" — chuyến vẫn nằm trong hàng chờ để in lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => answer(false)}>Chưa in</AlertDialogCancel>
            <AlertDialogAction onClick={() => answer(true)}>Đã in</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
