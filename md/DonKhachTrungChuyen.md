# Đặc tả: Đón khách bằng xe trung chuyển

> Trạng thái: **đã triển khai** (2026-10-09), tài liệu `CLAUDE.md`, `PROJECT_MAP.md`, `README.md`, `QuyTrinh.md` đã cập nhật.
> Khác với thiết kế ban đầu: (1) `driver/DriverTripDetail.jsx` chưa có khối tóm tắt riêng — tài xế xem cột "Lên xe tại" trong `TripPassengersDialog`; (2) tờ in đánh dấu "đã in" khi hộp thoại in đóng (`afterprint`), kể cả khi bấm Hủy trong hộp thoại in — in lại được từ dialog danh sách khách; (3) `GET /api/trips/:id` trả thêm `shuttle_cutoff_minutes`.

## 1. Bối cảnh & user story

Trước giờ xe chạy, hành khách lên xe theo một trong hai cách:

- **Tự đến bến** (mặc định): khách tự có mặt tại bến/văn phòng nhà xe.
- **Xe trung chuyển đón**: khách để lại địa chỉ, xe trung chuyển của nhà xe đến đón và chở về bến trước giờ chạy.

User story:

> Khách chọn "Xe trung chuyển đón" và nhập địa chỉ khi đặt vé. Chỉ chọn được ở tuyến có hỗ trợ trung chuyển và trước **mốc chốt**.
> **Đến mốc chốt** (`SHUTTLE_CUTOFF_MINUTES`, mặc định 120 phút trước giờ chạy):
> - Danh sách đón của chuyến bị khóa: khách không tự đổi được nữa.
> - Chuyến xuất hiện trong hàng chờ "Cần in danh sách đón" ở quầy.
> - Khách đi trung chuyển nhận email: "Danh sách đón đã chốt, xe trung chuyển dự kiến đón khoảng HH:mm, tài xế sẽ gọi trước".
>
> Nhân viên quầy in danh sách đón (theo từng chuyến hoặc gộp nhiều chuyến theo khung giờ) và đưa cho tài xế trung chuyển. Tài xế gọi từng khách theo SĐT trên giấy và tick "Đã đón".
> **Trước giờ chạy 30 phút**, email nhắc chuyến vẫn gửi như hiện tại. Nội dung ghi rõ cách lên xe của từng hành khách.

### Lý do chốt danh sách sớm (120 phút) thay vì in lúc email 30 phút

1. Ở mốc 30 phút, xe trung chuyển không kịp đón nhiều địa chỉ rồi về bến trước giờ chạy.
2. Mốc 30 phút trùng `CASH_HOLD_DEPARTURE_BUFFER_MINUTES`. Hóa đơn tiền mặt chưa trả bị hủy đúng lúc quầy in, nên tài xế có thể đi đón người không còn vé.
3. Email không đáng tin cho việc gấp:
   - Mail gửi cho **chủ hóa đơn**, không phải hành khách.
   - Khách tạo tại quầy dùng email `@quayve.local`, không bao giờ được gửi.
   - Server chưa cấu hình SMTP thì không gửi mail nào.

   Kênh chính là **tài xế trung chuyển gọi `passenger_phone`**, email chỉ là kênh phụ.

## 2. Phạm vi

**Trong phạm vi**
- Chọn hoặc đổi cách lên xe theo từng vé.
- Cấu hình trung chuyển theo tuyến.
- Khóa danh sách và gửi email ở mốc chốt.
- Hàng chờ in, in theo chuyến hoặc gộp theo khung giờ.
- Cảnh báo khi danh sách thay đổi sau lúc in.

**Ngoài phạm vi (để sau)**
- Trung chuyển trả khách ở điểm đến.
- Phụ phí trung chuyển (hiện miễn phí).
- Tài khoản và lịch làm việc cho tài xế trung chuyển.
- Trạng thái đón trong hệ thống (`picked_up`/`no_show`): hiện chỉ tick trên giấy, kết hợp điểm danh `boarded_at` của tài xế chính.
- Chia nhiều xe trung chuyển hoặc tối ưu lộ trình.

## 3. Quy tắc nghiệp vụ

| # | Quy tắc |
|---|---|
| R1 | Chỉ chọn `pickup_type = 'shuttle'` khi đủ 3 điều kiện: `route.shuttle_enabled = true`, chuyến `scheduled`, và `departure_time − now > SHUTTLE_CUTOFF_MINUTES`. Vi phạm thì trả 400: "Tuyến này không hỗ trợ xe trung chuyển" / "Đã quá hạn đăng ký xe trung chuyển (trước giờ chạy N phút)". |
| R2 | Khi chọn `shuttle` thì `pickup_address` bắt buộc (5–255 ký tự). `pickup_note` không bắt buộc. Khi chọn `station` thì server xóa trắng cả hai. |
| R3 | Đổi cách lên xe sau khi đặt (`PUT /api/tickets/:id/pickup`): **khách hàng** chỉ đổi được vé của mình, vé phải `booked` và chuyến chưa qua mốc chốt. **Staff/admin** đổi được bất kỳ lúc nào trước khi xe chạy, nhưng chiều sang `shuttle` vẫn phải thỏa `shuttle_enabled`. Mỗi lần đổi đều ghi `pickup_updated_at = now`. |
| R4 | **Thanh toán**: danh sách đón chỉ gồm vé `booked` thuộc hóa đơn `paid`. `expireInvoices.js` hủy sớm hóa đơn `pending` (cả cash lẫn momo) có ít nhất một vé `shuttle` ngay khi chuyến của vé đó qua mốc chốt, để không tồn tại "khách trung chuyển chưa trả tiền" trên danh sách đã in. Nhân viên đặt hộ trung chuyển sau mốc chốt phải chuyển hóa đơn sang `paid` ngay; giao diện cảnh báo việc này. |
| R5 | **Khóa ở mốc chốt**: job `lockShuttleLists.js` chạy mỗi phút, **luôn chạy kể cả khi không có SMTP**. Job tìm chuyến `scheduled` có `departure_time ≤ now + SHUTTLE_CUTOFF_MINUTES` và `shuttle_locked_at IS NULL`, giành quyền xử lý bằng `UPDATE … WHERE shuttle_locked_at IS NULL` (cùng cách làm với `reminder_sent_at`). Sau đó, nếu đã cấu hình mail, job gửi **1 email cho mỗi hóa đơn** có vé trung chuyển đã thanh toán. Giờ đón dự kiến trong mail = `departure_time − SHUTTLE_PICKUP_LEAD_MINUTES`. Gửi mail không bao giờ làm job lỗi. |
| R6 | **Hàng chờ "Cần in"**: gồm các chuyến `scheduled` đã khóa, có ít nhất 1 vé trung chuyển hợp lệ (theo R4), và thỏa một trong hai điều kiện: `shuttle_list_printed_at IS NULL`, **hoặc** danh sách đã thay đổi sau lúc in (cờ `needs_reprint`). |
| R7 | `pickup_updated_at` được ghi mỗi khi một vé có thể **vào hoặc ra** danh sách: tạo vé `shuttle`, đổi cách lên xe theo bất kỳ chiều nào, hoặc hóa đơn có vé `shuttle` chuyển sang `paid` (`invoiceController.updateStatus` và luồng MoMo trong `paymentController`). `needs_reprint` = tồn tại vé của chuyến thỏa một trong hai: (a) `pickup_updated_at > shuttle_list_printed_at`; (b) `pickup_type = 'shuttle'` và `cancelled_at > shuttle_list_printed_at`. Một chuyến **bị hủy sau khi đã in** vẫn hiện trong hàng chờ với nhãn đỏ "Chuyến đã hủy – báo tài xế trung chuyển" cho tới khi nhân viên bấm "Đã xử lý" (`POST mark-printed` lại). |
| R8 | In xong thì frontend gọi `POST /api/shuttles/mark-printed { trip_ids }` để đặt `shuttle_list_printed_at = now`. In lại không bị giới hạn. Hiện chưa lưu nhật ký từng lần in vì đây là giấy nội bộ, không phải vé. |
| R9 | Danh sách đón hiển thị cho **staff/admin**. Tài xế chính và phụ thấy cột "Lên xe tại" trong `TripPassengersDialog` để biết khách nào đi trung chuyển mà chờ, nhưng không có nút in danh sách đón. |
| R10 | Hủy vé hoặc hủy chuyến **không cần cascade gì thêm**. Vé `cancelled` tự rời khỏi danh sách; R7 lo phần cảnh báo. Khi hủy vé thì **giữ nguyên** `pickup_type`/`pickup_address` để phục vụ R7(b). |
| R11 | **Đơn giá không đổi**: trung chuyển miễn phí, `ticket_price`/`total_price` vẫn tính từ `Trip.price` như cũ. |

## 4. Thay đổi database

Ban đầu được thêm bằng script `addShuttlePickup.js`; từ 2026-10-10 các cột này nằm trong migration baseline `backend/migrations/20261010000001-baseline.js` (xem `md/ThietKeDatabase.md`), script cũ đã xóa.

```sql
ALTER TABLE routes
  ADD COLUMN origin_station    VARCHAR(255) NULL,          -- địa chỉ bến/văn phòng xuất phát
  ADD COLUMN shuttle_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN shuttle_area_note VARCHAR(255) NULL;          -- "Nội thành Q1, Q3, Q5, Q10…"

ALTER TABLE tickets
  ADD COLUMN pickup_type       ENUM('station','shuttle') NOT NULL DEFAULT 'station',
  ADD COLUMN pickup_address    VARCHAR(255) NULL,
  ADD COLUMN pickup_note       VARCHAR(255) NULL,
  ADD COLUMN pickup_updated_at DATETIME NULL;

ALTER TABLE trips
  ADD COLUMN shuttle_locked_at       DATETIME NULL,        -- set bởi job ở mốc chốt (R5)
  ADD COLUMN shuttle_list_printed_at DATETIME NULL;        -- lần in gần nhất (R8)

CREATE INDEX idx_tickets_trip_pickup ON tickets (trip_id, pickup_type);
```

Vé cũ tự nhận `pickup_type = 'station'`. Tuyến cũ có `shuttle_enabled = false`, admin tự bật sau.

## 5. Biến môi trường (`backend/.env`)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `SHUTTLE_CUTOFF_MINUTES` | 120 | Mốc chốt danh sách, tính bằng số phút trước giờ chạy (R1, R3, R4, R5) |
| `SHUTTLE_PICKUP_LEAD_MINUTES` | 60 | Giờ đón dự kiến ghi trong email = giờ chạy − N phút |
| `SHUTTLE_CHECK_INTERVAL_MS` | 60000 | Chu kỳ chạy job `lockShuttleLists.js` |

Ràng buộc: `SHUTTLE_CUTOFF_MINUTES` > `SHUTTLE_PICKUP_LEAD_MINUTES` > `DEPARTURE_REMINDER_MINUTES`. Server log cảnh báo khi khởi động nếu cấu hình sai thứ tự.

## 6. Backend

| File | Thay đổi |
|---|---|
| `models/Route.js`, `Ticket.js`, `Trip.js` | Thêm các cột ở mục 4 |
| `utils/shuttle.js` (mới) | `SHUTTLE_CUTOFF_MINUTES`, `isPastShuttleCutoff(trip, now)`, `estimatePickupTime(trip)`, `assertShuttleAllowed(trip, route, { role })` (gom logic R1/R3, ném lỗi có `statusCode` 400) |
| `utils/joiSchemas.js` | Thêm `pickup_type`/`pickup_address`/`pickup_note` cho mỗi phần tử `createInvoice.tickets[]` (dùng `Joi.when` cho R2). Thêm schema mới `updateTicketPickup`. Thêm `origin_station`/`shuttle_enabled`/`shuttle_area_note` vào `createRoute`/`updateRoute`. Thêm schema `markShuttlePrinted { trip_ids: [int] min 1 }` |
| `controllers/invoiceController.create` | Trong transaction đang có: kiểm tra R1 cho từng vé `shuttle` (Route đã được load cùng Trip) và chuẩn hóa dữ liệu theo R2. Staff/admin đặt sau mốc chốt thì được phép |
| `controllers/invoiceController.updateStatus`, `controllers/paymentController.js` (đánh dấu đã thanh toán) | Khi `pending → paid`, ghi `pickup_updated_at = now` cho các vé `shuttle` của hóa đơn (R7) |
| `controllers/ticketController.updatePickup` (mới) | `PUT /api/tickets/:id/pickup`: kiểm tra quyền sở hữu (customer) và R3, ghi `pickup_updated_at` |
| `controllers/shuttleController.js` + `routes/shuttle.routes.js` (mới, mount `/api/shuttles`, `protect, authorize('staff','admin')`) | `GET queue?from&to`: các chuyến trong khung giờ, mặc định từ bây giờ đến +`SHUTTLE_CUTOFF_MINUTES`, kèm `shuttle_count`, `shuttle_locked_at`, `shuttle_list_printed_at`, `needs_reprint`, `is_cancelled_after_print`. `GET pickup-list?trip_ids=1,2` hoặc `?from&to`: dữ liệu in, gồm thông tin chuyến (tuyến, `origin_station`, giờ chạy, biển số, tài xế chính) và danh sách vé trung chuyển hợp lệ (R4), gom nhóm theo địa chỉ đã chuẩn hóa (trim, lowercase, gộp khoảng trắng) và sắp theo giờ chạy rồi địa chỉ. `POST mark-printed` (R8) |
| `controllers/tripController.getAll` | Thêm `shuttle_count` bằng một grouped query riêng, giống `open_incident_count` (không dùng `include` vì sẽ hỏng `limit`) |
| `controllers/tripController.getPassengers` | Trả thêm `pickup_type`, `pickup_address`, `pickup_note`, **kể cả cho tài xế** (đây là thông tin vận hành, không phải dữ liệu thanh toán) |
| `controllers/routeController.create` | Nhận thêm các trường mới. Tuyến chiều về tự tạo có `origin_station = null` và `shuttle_enabled = false` (khác bến) |
| `jobs/lockShuttleLists.js` (mới) | R5. Khởi động trong `server.js`, nâng tổng số job lên **5** |
| `jobs/expireInvoices.js` | Thêm nhánh R4: hủy hóa đơn `pending` có vé `shuttle` của chuyến đã qua mốc chốt. Giữ nguyên logic TTL kép hiện có |
| `jobs/sendDepartureReminders.js` + `services/mailService.js` | Email nhắc 30 phút ghi theo từng vé: "Xe trung chuyển đón tại {địa chỉ}" hoặc "Có mặt tại {origin_station}". Template mới `sendShuttleNotice` cho R5 |
| `scripts/seedData.js` | Bật trung chuyển và điền `origin_station` cho khoảng nửa số tuyến. Khoảng 20% vé mẫu (đã thanh toán) dùng `shuttle` với địa chỉ giả. Đánh dấu khóa/in cho chuyến quá khứ |

### API mới / thay đổi

| Endpoint | Quyền | Ghi chú |
|---|---|---|
| `POST /api/invoices` | customer, staff, admin | `tickets[]` thêm `pickup_type`, `pickup_address`, `pickup_note` |
| `PUT /api/tickets/:id/pickup` | customer (vé của mình), staff, admin | `{ pickup_type, pickup_address?, pickup_note? }` |
| `GET /api/shuttles/queue?from&to` | staff, admin | Hàng chờ in (R6, R7) |
| `GET /api/shuttles/pickup-list?trip_ids=` hoặc `?from&to` | staff, admin | Dữ liệu tờ in |
| `POST /api/shuttles/mark-printed` | staff, admin | `{ trip_ids }` |
| `GET /api/trips` | staff, admin | Thêm `shuttle_count` |
| `GET /api/trips/:id/tickets` | staff, admin, driver | Thêm các trường pickup |
| `POST/PUT /api/routes` | admin | Thêm `origin_station`, `shuttle_enabled`, `shuttle_area_note` |
| `GET /api/trips/search`, `GET /api/trips/:id` | public | `Route` trả thêm 3 trường trên để form đặt vé biết tuyến có trung chuyển không |

## 7. Frontend

| File | Thay đổi |
|---|---|
| `api/shuttleApi.js` (mới), `api/ticketApi.js` | `getQueue`, `getPickupList`, `markPrinted`; `updatePickup(id, body)` |
| `customer/BookTicket.jsx` | Mỗi hành khách chọn bằng RadioGroup "Tự đến bến ({origin_station})" / "Xe trung chuyển đón". Chọn trung chuyển thì hiện ô địa chỉ, ghi chú, khu vực phục vụ và giờ đón dự kiến. Thêm checkbox "Áp dụng cho tất cả hành khách". Lựa chọn trung chuyển bị khóa và có tooltip giải thích khi tuyến không hỗ trợ hoặc đã qua mốc chốt. Trả tiền mặt + trung chuyển thì hiện nhắc "Thanh toán trước HH:mm, nếu không vé sẽ tự hủy" (R4). Zod dùng `superRefine` cho R2. Cài `radio-group` qua shadcn nếu chưa có |
| `customer/InvoiceHistory.jsx` | Hiển thị cách lên xe từng vé. Có nút "Đổi cách lên xe" mở Dialog, ẩn khi đã qua mốc chốt |
| `staff/ManageInvoice.jsx` | Hiển thị cách lên xe; staff đổi được (R3) |
| `staff/ShuttlePickups.jsx` (mới, `/staff/shuttles`, staff + admin, thêm vào sidebar `AdminLayout`) | Hàng chờ "Cần in" với badge số lượng, nhãn "Cần in lại" / "Chuyến đã hủy". Chọn khung giờ (2 giờ tới / hôm nay / tùy chọn). Chọn nhiều chuyến rồi bấm "In danh sách đón", in xong gọi `mark-printed` |
| `components/features/ShuttlePickupSheet.jsx` (mới) | Tờ in render **qua portal ra `document.body`**. Mỗi chuyến một khối: tuyến, giờ chạy, biển số, tài xế chính, bến. Cột: STT · Địa chỉ đón · Họ tên · SĐT · Ghế · Ghi chú · Đã đón ☐. Các vé cùng địa chỉ gộp thành một dòng. Chân trang có ô ký tài xế trung chuyển |
| `components/features/TripPassengersDialog.jsx` | Thêm cột "Lên xe tại" (Bến / 🚐 + địa chỉ). Staff/admin có thêm nút "In danh sách đón" dùng `ShuttlePickupSheet` cho chuyến đó |
| `staff/ViewTrips.jsx`, `admin/ManageTrips.jsx` | Badge "🚐 N" (`shuttle_count`) và trạng thái Đã khóa / Đã in |
| `admin/ManageRoutes.jsx`, `staff/ViewRoutes.jsx` | Form tạo/sửa thêm "Địa chỉ bến xuất phát", switch "Có xe trung chuyển" và "Khu vực phục vụ". Trang của staff chỉ xem |
| `components/features/TicketPrintView.jsx` | Thêm dòng "Lên xe tại" |
| `driver/DriverTripDetail.jsx` | Tóm tắt "N khách đi trung chuyển"; chi tiết xem trong `TripPassengersDialog` |

## 8. Kế hoạch triển khai

1. Model + `addShuttlePickup.js` + `package.json` script + `utils/shuttle.js` + env + seed
2. Joi + `invoiceController.create` + `ticketController.updatePickup` + `routeController`
3. Job `lockShuttleLists.js` + nhánh R4 trong `expireInvoices.js` + nội dung email
4. `shuttleController` + routes + `shuttle_count` + các trường pickup trong `getPassengers`
5. Frontend: `BookTicket`, `InvoiceHistory`, `ManageInvoice`, `ManageRoutes`/`ViewRoutes`
6. Frontend: `ShuttlePickupSheet`, `ShuttlePickups`, `TripPassengersDialog`, badge trong danh sách chuyến, `TicketPrintView`, màn tài xế
7. Kiểm tra (mục 9) và cập nhật tài liệu

## 9. Checklist kiểm tra

- [ ] Đặt vé trung chuyển ở tuyến chưa bật → 400; ở tuyến đã bật nhưng chuyến còn < 120 phút → 400 (customer), OK (staff).
- [ ] `shuttle` không có địa chỉ → 400; `station` gửi kèm địa chỉ → server lưu NULL.
- [ ] Khách đổi cách lên xe sau mốc chốt → 400; staff đổi được và `needs_reprint` bật lên nếu danh sách đã in.
- [ ] Hóa đơn tiền mặt `pending` có vé trung chuyển bị hủy khi qua mốc chốt; ghế được trả lại `available_seats`.
- [ ] Job khóa chạy đúng 1 lần mỗi chuyến kể cả khi không có SMTP; có SMTP thì mỗi hóa đơn nhận 1 mail; email `@quayve.local`/seed không bị gửi.
- [ ] Hàng chờ chỉ gồm vé đã thanh toán; in xong thì chuyến rời hàng chờ; hủy 1 vé trung chuyển sau khi in thì chuyến quay lại với nhãn "Cần in lại"; hủy chuyến sau khi in thì hiện nhãn đỏ.
- [ ] In gộp 3 chuyến cho ra 3 khối; cùng địa chỉ thì gộp 1 dòng; tờ in không bị cắt khi mở từ Dialog.
- [ ] Tài xế thấy cột "Lên xe tại" nhưng không thấy dữ liệu thanh toán hay nút in danh sách đón.
- [ ] `npm run lint` + `npm run build` (frontend), `node --check` các file backend đã sửa, `npm run db:add-shuttle` chạy 2 lần không lỗi.
