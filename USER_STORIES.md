# User Stories – nopCommerce

Tài liệu này phục vụ yêu cầu của thầy:
1. ✅ Dự án đã cài đặt và chạy được (xem `CLAUDE.md` để biết kiến trúc & cách chạy).
2. 📝 User Story cho toàn bộ chức năng (tài liệu này – **Phần 2**, đang viết theo mẫu, xem tiến độ ở **Phần 1**).
3. ⏱️ Estimate & chia việc để báo cáo thời gian hoàn thành bản đầy đủ (**Phần 3**).
4. 📤 Đưa vào Google Sheet (**Phần 4** – hướng dẫn export, vì mình chưa có quyền ghi trực tiếp vào Google Sheet của nhóm).

**Mẫu áp dụng** (theo https://thinhnotes.com/chuyen-nghe-ba/ba-viet-user-story/):

> **User Story:** Là một **[vai trò]**, tôi muốn **[hành động]**, để **[lợi ích]**.
>
> **Acceptance Criteria (AC):** liệt kê các điều kiện **đo lường được, test được, rõ ràng, phi kỹ thuật**.

Vai trò (role) dùng trong tài liệu: **Khách vãng lai (Guest)**, **Khách hàng (Customer)**, **Quản trị viên (Admin/Store Owner)**, **Vendor (nhà cung cấp)**.

---

## Phần 1: Tiến độ & phạm vi

nopCommerce có **~40 module chức năng** (đối chiếu từ `Nop.Web/Controllers` + `Nop.Web/Areas/Admin/Controllers` + `Nop.Services`). Không thể viết chi tiết hết trong 1 lần, nên tài liệu này:

- Viết **đầy đủ, chi tiết** cho **18 module lõi** (chiếm phần lớn giá trị nghiệp vụ – hành trình mua hàng đầu-cuối + các nghiệp vụ quản trị chính). → **Phần 2**.
- Liệt kê **toàn bộ module còn lại** (chưa viết chi tiết) trong bảng estimate ở **Phần 3**, để nhóm nhận việc và viết tiếp theo cùng mẫu này.

| Trạng thái | Số module | Ghi chú |
|---|---|---|
| ✅ Đã viết chi tiết (Phần 2) | 18 | Hành trình khách hàng + quản trị cốt lõi |
| 🔜 Chưa viết (Phần 3, có estimate) | ~22 | Module phụ trợ, plugin, cấu hình nâng cao |

---

## Phần 2: User Stories theo module (đã viết chi tiết)

### 2.1 Đăng ký & Đăng nhập tài khoản
*(`Nop.Web/Controllers/CustomerController.cs`, `Nop.Services/Customers`)*

**US-01 – Đăng ký tài khoản**
> Là một **Khách vãng lai**, tôi muốn **tạo tài khoản bằng email và mật khẩu**, để **lưu thông tin và theo dõi đơn hàng của mình**.

AC:
- Form yêu cầu tối thiểu: Họ tên, Email, Mật khẩu, Xác nhận mật khẩu.
- Mật khẩu phải thỏa quy tắc cấu hình tại Admin (độ dài tối thiểu, ký tự đặc biệt/số nếu bật) – hệ thống báo lỗi cụ thể nếu không đạt.
- Email đã tồn tại → hiển thị lỗi "Địa chỉ email đã được đăng ký" và không cho tạo trùng.
- Sau đăng ký thành công, nếu cấu hình "xác nhận email" đang bật → gửi email kích hoạt, tài khoản ở trạng thái chưa kích hoạt cho đến khi khách bấm link.
- Sau đăng ký thành công (không cần xác nhận email) → tự động đăng nhập và chuyển hướng theo cấu hình (trang chủ / trang chào mừng).

**US-02 – Đăng nhập**
> Là một **Customer**, tôi muốn **đăng nhập bằng email/mật khẩu (hoặc username nếu bật)**, để **truy cập tài khoản và lịch sử mua hàng**.

AC:
- Sai email/mật khẩu 1 lần → thông báo lỗi chung, không tiết lộ email có tồn tại hay không.
- Nhập sai quá số lần cho phép (cấu hình khoá tài khoản) → tài khoản bị khoá tạm thời theo thời gian cấu hình.
- Đăng nhập thành công → giỏ hàng ở chế độ khách (nếu có) được gộp vào giỏ hàng của tài khoản.
- Có tuỳ chọn "Ghi nhớ đăng nhập" (persistent cookie).
- Hỗ trợ đăng nhập ngoài (External Auth – ví dụ Facebook) nếu plugin tương ứng được bật.

**US-03 – Quên mật khẩu**
> Là một **Customer**, tôi muốn **đặt lại mật khẩu qua email**, để **khôi phục quyền truy cập khi quên mật khẩu**.

AC:
- Nhập email hợp lệ đã đăng ký → hệ thống gửi email chứa link đặt lại mật khẩu có thời hạn.
- Email không tồn tại → vẫn hiển thị thông báo "đã gửi email" (không lộ thông tin tài khoản).
- Link hết hạn hoặc đã sử dụng → báo lỗi, yêu cầu gửi lại yêu cầu mới.
- Đặt mật khẩu mới thành công → mật khẩu cũ không còn hiệu lực đăng nhập.

---

### 2.2 Hồ sơ khách hàng & Sổ địa chỉ
*(`CustomerController` – Info/Address, `Nop.Services/Common/AddressService`)*

**US-04 – Cập nhật thông tin cá nhân**
> Là một **Customer**, tôi muốn **chỉnh sửa họ tên, ngày sinh, số điện thoại, các trường tuỳ chỉnh (Customer Attributes)**, để **giữ hồ sơ của mình chính xác**.

AC:
- Các trường bắt buộc theo cấu hình Admin (ví dụ: bắt buộc số điện thoại) phải được validate trước khi lưu.
- Đổi email: nếu cấu hình yêu cầu xác nhận, email mới chỉ có hiệu lực sau khi khách bấm link xác nhận.
- Lưu thành công → hiển thị thông báo xác nhận, dữ liệu hiển thị đúng ngay sau khi tải lại trang.

**US-05 – Quản lý sổ địa chỉ**
> Là một **Customer**, tôi muốn **thêm/sửa/xoá nhiều địa chỉ giao hàng và thanh toán**, để **chọn nhanh khi checkout mà không phải nhập lại**.

AC:
- Thêm địa chỉ mới yêu cầu tối thiểu: Họ tên, Quốc gia, Địa chỉ, Thành phố, SĐT (theo cấu hình bắt buộc từng trường).
- Xoá một địa chỉ đang được dùng làm địa chỉ mặc định của đơn hàng cũ → không ảnh hưởng dữ liệu đơn hàng đã đặt (đơn cũ vẫn giữ bản sao địa chỉ tại thời điểm đặt).
- Danh sách địa chỉ hiển thị đầy đủ và cho phép chọn nhanh ở bước checkout.

---

### 2.3 Duyệt & tìm kiếm sản phẩm
*(`CatalogController`, `Nop.Services/Catalog/ProductService`, `Search*`)*

**US-06 – Xem danh mục sản phẩm**
> Là một **Khách vãng lai**, tôi muốn **xem danh sách sản phẩm theo danh mục (Category)**, để **tìm sản phẩm mình cần**.

AC:
- Trang danh mục hiển thị: ảnh, tên, giá, nút thêm giỏ hàng (nếu cho phép mua nhanh).
- Hỗ trợ phân trang, sắp xếp (theo tên/giá/mới nhất/nổi bật) và bộ lọc theo thuộc tính kỹ thuật (Specification Attribute), khoảng giá, nhà sản xuất.
- Sản phẩm hết hàng: hiển thị đúng trạng thái (ẩn / hiển thị kèm nhãn "Hết hàng" / cho đặt hàng trước) theo cấu hình `Inventory Method` của sản phẩm.
- Danh mục con hiển thị đúng cấu trúc cha–con.

**US-07 – Tìm kiếm sản phẩm**
> Là một **Khách vãng lai**, tôi muốn **tìm kiếm sản phẩm theo từ khoá**, để **tìm nhanh sản phẩm mong muốn mà không cần duyệt từng danh mục**.

AC:
- Ô tìm kiếm có gợi ý tự động (autocomplete) sau khi gõ đủ số ký tự tối thiểu (mặc định 3).
- Kết quả tìm theo tên, mô tả ngắn, mô tả đầy đủ, tag, SKU tuỳ theo cấu hình tìm kiếm nâng cao.
- Không có kết quả → hiển thị thông báo "Không tìm thấy sản phẩm phù hợp" thay vì trang trắng/lỗi.
- Từ khoá tìm kiếm được ghi log (Search Term) phục vụ báo cáo "Top Search Terms" cho Admin.

**US-08 – Xem chi tiết sản phẩm & đánh giá**
> Là một **Customer**, tôi muốn **xem chi tiết sản phẩm và đọc/viết đánh giá (review)**, để **quyết định mua hàng dựa trên trải nghiệm của người khác**.

AC:
- Trang chi tiết hiển thị: ảnh (nhiều ảnh), giá, thuế (nếu bật hiển thị giá gồm/không gồm thuế), thuộc tính lựa chọn (màu/size...), số lượng tồn kho (nếu cấu hình hiển thị).
- Gửi đánh giá yêu cầu tối thiểu: điểm số (1–5 sao), tiêu đề, nội dung; nếu cấu hình "chỉ khách đã mua mới được review" thì khách chưa mua sẽ không thấy form hoặc bị chặn gửi.
- Đánh giá mới gửi ở trạng thái **chờ duyệt** nếu Admin bật kiểm duyệt, chỉ hiển thị công khai sau khi Admin duyệt.
- Sản phẩm có biến thể (Attribute Combination) → giá/tồn kho/ảnh cập nhật tương ứng khi khách chọn tổ hợp thuộc tính khác nhau.

---

### 2.4 Giỏ hàng & Danh sách yêu thích
*(`ShoppingCartController`, `ShoppingCartType.ShoppingCart/Wishlist`)*

**US-09 – Thêm/sửa/xoá sản phẩm trong giỏ hàng**
> Là một **Customer**, tôi muốn **thêm sản phẩm vào giỏ, thay đổi số lượng hoặc xoá**, để **chuẩn bị đơn hàng trước khi thanh toán**.

AC:
- Thêm sản phẩm có thuộc tính bắt buộc mà chưa chọn đủ → chặn thêm vào giỏ và báo rõ thuộc tính còn thiếu.
- Số lượng vượt tồn kho (khi `Inventory Method = Track stock` và không cho phép đặt trước) → báo lỗi "Không đủ hàng trong kho", giới hạn số lượng tối đa có thể thêm.
- Cập nhật số lượng về 0 hoặc bấm "Xoá" → sản phẩm biến mất khỏi giỏ và tổng tiền được tính lại ngay.
- Giỏ hàng hiển thị đúng: đơn giá, thành tiền, giảm giá áp dụng (nếu có), tổng cộng.

**US-10 – Áp mã giảm giá / Gift card trong giỏ hàng**
> Là một **Customer**, tôi muốn **nhập mã giảm giá (coupon code) hoặc gift card**, để **được giảm giá trước khi thanh toán**.

AC:
- Mã hợp lệ và đủ điều kiện (giá trị đơn tối thiểu, hạn dùng, giới hạn số lần dùng) → tổng tiền giỏ hàng cập nhật giảm trừ ngay, hiển thị dòng "Discount" riêng.
- Mã hết hạn / đã dùng hết lượt / không đủ điều kiện → hiển thị thông báo lỗi cụ thể theo từng nguyên nhân, không áp giảm giá.
- Gift card hợp lệ → trừ vào tổng thanh toán, nếu số dư gift card lớn hơn tổng đơn thì phần dư được giữ lại cho lần mua sau.

**US-11 – Danh sách yêu thích (Wishlist)**
> Là một **Customer**, tôi muốn **lưu sản phẩm vào wishlist**, để **xem lại và mua sau mà không mất giỏ hàng hiện tại**.

AC:
- Thêm vào wishlist không ảnh hưởng số lượng/nội dung giỏ hàng đang có.
- Từ wishlist có thể chuyển từng sản phẩm (hoặc tất cả) sang giỏ hàng bằng một thao tác.
- Có thể chia sẻ wishlist qua link công khai (nếu tính năng "Share wishlist" được bật).

---

### 2.5 Checkout & Thanh toán
*(`CheckoutController`, `Nop.Services/Orders/OrderProcessingService`, `Payments`)*

**US-12 – Thực hiện checkout (khách đã đăng nhập hoặc guest checkout)**
> Là một **Customer**, tôi muốn **hoàn tất các bước checkout (địa chỉ giao hàng → phương thức vận chuyển → phương thức thanh toán → xác nhận)**, để **đặt hàng thành công**.

AC:
- Nếu `Anonymous checkout` được bật, khách vãng lai có thể đặt hàng không cần đăng ký tài khoản.
- Không chọn đủ địa chỉ giao hàng/thanh toán bắt buộc → không cho sang bước tiếp theo.
- Danh sách phương thức vận chuyển hiển thị đúng theo cấu hình Shipping Method khả dụng cho địa chỉ đã chọn, kèm phí ship tương ứng.
- Danh sách phương thức thanh toán chỉ hiển thị các phương thức đang bật (Payment Method Active) và phù hợp điều kiện (ví dụ ẩn COD nếu đơn có sản phẩm tải về).
- Trang xác nhận cuối cùng hiển thị đầy đủ: sản phẩm, số lượng, giá, thuế, phí ship, giảm giá, tổng cộng — khớp với giỏ hàng trước đó.
- Đặt hàng thành công → tạo Order với trạng thái ban đầu **Pending**, gửi email xác nhận đơn hàng cho khách và (tuỳ cấu hình) cho Admin.

**US-13 – Thanh toán trực tuyến**
> Là một **Customer**, tôi muốn **thanh toán online qua cổng thanh toán được tích hợp (ví dụ PayPal/Manual/Check-Money Order)**, để **hoàn tất đơn hàng ngay lập tức**.

AC:
- Thanh toán thành công → trạng thái thanh toán đơn hàng (`Payment Status`) chuyển thành **Paid**, khách được chuyển đến trang "Đặt hàng thành công".
- Thanh toán thất bại/bị huỷ giữa chừng → đơn hàng không bị đánh dấu đã thanh toán, khách được thông báo lỗi và có thể thử lại.
- Với phương thức cần xác nhận thủ công (COD, Check/Money Order) → đơn hàng vẫn được tạo với `Payment Status = Pending`, chờ Admin xác nhận thanh toán.

---

### 2.6 Đơn hàng & Lịch sử mua hàng
*(`OrderController`, `Nop.Services/Orders`)*

**US-14 – Xem lịch sử & chi tiết đơn hàng**
> Là một **Customer**, tôi muốn **xem danh sách đơn hàng đã đặt và chi tiết từng đơn**, để **theo dõi tình trạng xử lý/giao hàng**.

AC:
- Danh sách đơn hàng hiển thị: mã đơn, ngày đặt, trạng thái đơn (`Pending/Processing/Complete/Cancelled`), tổng tiền.
- Chi tiết đơn hàng hiển thị sản phẩm, địa chỉ giao/nhận, phương thức thanh toán/vận chuyển, mã vận đơn (nếu Admin đã nhập).
- Đơn hàng ở trạng thái cho phép huỷ (theo cấu hình) → khách có nút "Huỷ đơn hàng"; đơn đã giao/đã huỷ thì không hiển thị nút này.
- Khách chỉ xem được đơn hàng của chính mình (không truy cập được đơn của khách khác qua URL).

**US-15 – Yêu cầu trả hàng/hoàn tiền (Return Request)**
> Là một **Customer**, tôi muốn **gửi yêu cầu trả hàng cho sản phẩm đã nhận**, để **được đổi/hoàn tiền khi sản phẩm không như mong đợi**.

AC:
- Chỉ sản phẩm thuộc đơn hàng đã hoàn tất (theo cấu hình `Return Request` cho phép) mới có nút "Yêu cầu trả hàng".
- Form yêu cầu chọn: sản phẩm, số lượng trả, lý do trả hàng (Return Reason), hành động mong muốn (Return Action – đổi hàng/hoàn tiền), ghi chú.
- Sau khi gửi → yêu cầu ở trạng thái **Pending**, khách nhận email xác nhận đã ghi nhận yêu cầu.
- Khách xem được danh sách và trạng thái các yêu cầu trả hàng của mình (Pending/Received/ReturnAuthorized/RefundedItems/Cancelled...).

---

### 2.7 Nội dung (CMS) & Blog
*(`TopicController`, `BlogController`, `Nop.Services/Cms`, `Nop.Services/Blogs`)*

**US-16 – Xem trang nội dung tĩnh (Topic)**
> Là một **Khách vãng lai**, tôi muốn **xem các trang thông tin (Giới thiệu, Chính sách đổi trả, Điều khoản...)**, để **hiểu chính sách của cửa hàng trước khi mua**.

AC:
- Trang chỉ hiển thị nếu Topic được đánh dấu "Published" và (nếu giới hạn theo store) thuộc store hiện tại.
- Topic có thể hiển thị dạng trang riêng (URL SEO-friendly) hoặc dạng popup tuỳ cấu hình.
- Truy cập Topic chưa publish qua URL trực tiếp → trả về 404, không lộ nội dung.

**US-17 – Đọc & bình luận Blog**
> Là một **Customer**, tôi muốn **đọc bài viết blog và để lại bình luận**, để **tương tác với cửa hàng và cập nhật thông tin**.

AC:
- Danh sách blog hiển thị bài mới nhất, hỗ trợ lọc theo tag/tháng.
- Gửi bình luận yêu cầu nội dung không rỗng; nếu cấu hình yêu cầu duyệt → bình luận chờ Admin duyệt trước khi hiển thị công khai.
- Khách chưa đăng nhập mà cấu hình yêu cầu đăng nhập để bình luận → được điều hướng đến trang đăng nhập.

---

### 2.8 [Admin] Quản lý danh mục sản phẩm
*(`Areas/Admin/Controllers/ProductController`, `CategoryController`, `ManufacturerController`)*

**US-18 – Tạo/sửa sản phẩm**
> Là một **Store Owner**, tôi muốn **tạo và chỉnh sửa thông tin sản phẩm (giá, tồn kho, ảnh, thuộc tính, SEO)**, để **đưa sản phẩm lên bán trên storefront**.

AC:
- Trường bắt buộc tối thiểu: Tên sản phẩm; thiếu tên → không cho lưu, báo lỗi rõ ràng.
- Có thể gán sản phẩm vào 1 hoặc nhiều Category/Manufacturer, thiết lập giá, giá khuyến mãi (kèm ngày bắt đầu/kết thúc), thuế (Tax Category).
- Thiết lập `Inventory Method` (không theo dõi tồn kho / theo dõi tồn kho / theo dõi theo thuộc tính) → ảnh hưởng trực tiếp đến khả năng mua trên storefront (đã kiểm chứng ở US-09).
- Sản phẩm ở trạng thái "Published = false" → không hiển thị trên storefront dù đã lưu thành công trong Admin.
- Upload ảnh sản phẩm → ảnh hiển thị đúng thứ tự (Display Order) trên trang chi tiết.

---

### 2.9 [Admin] Quản lý đơn hàng
*(`Areas/Admin/Controllers/OrderController`)*

**US-19 – Xử lý đơn hàng**
> Là một **Store Owner**, tôi muốn **xem danh sách đơn hàng, lọc theo trạng thái, và cập nhật trạng thái xử lý/giao hàng/thanh toán**, để **vận hành việc giao hàng và chăm sóc khách hàng**.

AC:
- Bộ lọc theo: khoảng ngày đặt, trạng thái đơn, trạng thái thanh toán, trạng thái vận chuyển, mã đơn, khách hàng.
- Đánh dấu "Đã giao hàng" (Ship) → cập nhật `Shipping Status`, có thể nhập mã vận đơn (Tracking Number), hệ thống tự gửi email thông báo cho khách nếu cấu hình bật.
- Đánh dấu "Đã thanh toán" (Mark as Paid) cho phương thức thủ công → `Payment Status` chuyển **Paid**, ghi log vào Order Notes.
- Huỷ đơn hàng → hoàn lại tồn kho (nếu sản phẩm có theo dõi tồn kho) theo cấu hình, ghi lại lịch sử thay đổi trạng thái.
- Hoàn tiền một phần/toàn phần (Refund/Partial Refund) → chỉ khả dụng nếu payment gateway hỗ trợ; số tiền hoàn không được vượt tổng đã thanh toán.

---

### 2.10 [Admin] Quản lý khách hàng
*(`Areas/Admin/Controllers/CustomerController`, `CustomerRoleController`)*

**US-20 – Quản lý tài khoản khách hàng & vai trò**
> Là một **Store Owner**, tôi muốn **xem/sửa thông tin khách hàng, khoá/mở tài khoản, và gán Customer Role (Registered/Guest/VIP...)**, để **quản lý quyền và phân nhóm khách hàng cho mục đích khuyến mãi/chăm sóc**.

AC:
- Khoá tài khoản (`Active = false`) → khách không thể đăng nhập storefront, nhận thông báo lỗi phù hợp khi thử đăng nhập.
- Gán/gỡ Customer Role → ảnh hưởng ngay đến quyền lợi liên quan (ví dụ Discount/Product chỉ áp dụng cho role đó).
- Đổi email khách hàng từ Admin → hệ thống kiểm tra trùng lặp như khi khách tự đổi (US-04).
- Có thể "Đăng nhập với tư cách khách hàng" (Impersonate) để hỗ trợ debug, hành động này được ghi vào Activity Log.

---

### 2.11 [Admin] Khuyến mãi (Discount)
*(`Areas/Admin/Controllers/DiscountController`, `Nop.Services/Discounts`)*

**US-21 – Tạo chương trình giảm giá**
> Là một **Store Owner**, tôi muốn **tạo mã giảm giá áp dụng cho toàn đơn hàng, sản phẩm cụ thể, danh mục hoặc nhà sản xuất**, để **chạy chương trình khuyến mãi thúc đẩy doanh số**.

AC:
- Chọn loại giảm giá (`DiscountType`: toàn đơn / theo SKU / theo danh mục / theo NSX / phí ship / tổng phụ) → phạm vi áp dụng trên storefront khớp đúng lựa chọn.
- Có thể thiết lập: giảm theo % hoặc số tiền cố định, giá trị đơn tối thiểu, ngày bắt đầu/kết thúc, giới hạn số lần sử dụng (tổng và theo từng khách hàng), yêu cầu Coupon Code.
- Discount hết hạn hoặc ngoài phạm vi ngày hiệu lực → không áp dụng được ở storefront dù mã đúng.
- Có thể gắn thêm điều kiện nâng cao qua Discount Requirement Rule (ví dụ: giới hạn theo Customer Role, đã từng mua sản phẩm X...).

---

### 2.12 [Admin] Vận chuyển & Thuế
*(`ShippingController`, `TaxController`, plugin `Shipping.FixedByWeightByTotal`, `Tax.FixedOrByCountryStateZip`)*

**US-22 – Cấu hình phương thức vận chuyển & thuế**
> Là một **Store Owner**, tôi muốn **cấu hình các phương thức vận chuyển (phí cố định/theo cân nặng) và quy tắc tính thuế theo quốc gia/bang**, để **tính đúng phí ship và thuế khi khách checkout**.

AC:
- Bật/tắt từng Shipping Method → chỉ method đang bật mới hiển thị ở bước checkout (đã kiểm chứng US-12).
- Cấu hình phí ship theo khoảng cân nặng/giá trị đơn → hệ thống tính đúng phí tương ứng khi tổng cân nặng giỏ hàng thay đổi.
- Cấu hình thuế theo Quốc gia/Bang/Zip cho từng Tax Category → giá hiển thị/tổng thanh toán phản ánh đúng mức thuế theo địa chỉ khách chọn.
- Đơn hàng có sản phẩm miễn thuế (Tax Exempt) → không cộng thuế cho dòng sản phẩm đó dù cấu hình thuế chung đang bật.

---

### 2.13 [Admin] Báo cáo (Reports)
*(`Areas/Admin/Controllers/ReportController`)*

**US-23 – Xem báo cáo bán hàng**
> Là một **Store Owner**, tôi muốn **xem báo cáo doanh thu, sản phẩm bán chạy, khách hàng chi tiêu nhiều nhất, và sản phẩm sắp hết hàng**, để **ra quyết định kinh doanh (nhập hàng, khuyến mãi, chăm sóc khách VIP)**.

AC:
- Báo cáo hỗ trợ lọc theo khoảng thời gian; tổng số liệu khớp với dữ liệu Order thực tế trong khoảng đó.
- Báo cáo "Best sellers" sắp xếp được theo số lượng bán hoặc doanh thu.
- Báo cáo "Low stock" chỉ hiển thị sản phẩm có tồn kho ≤ ngưỡng cấu hình (Minimum Stock Quantity).
- Số liệu chỉ tính đơn hàng hợp lệ (không tính đơn đã huỷ) trừ khi báo cáo ghi rõ là bao gồm cả đơn huỷ.

---

### 2.14 [Admin] Cửa hàng & Đa cửa hàng (Multi-store)
*(`StoreController`, `Nop.Services/Stores`)*

**US-24 – Quản lý nhiều cửa hàng (Store)**
> Là một **Store Owner**, tôi muốn **cấu hình nhiều Store (tên miền/ngôn ngữ/tiền tệ khác nhau) trên cùng một hệ thống**, để **vận hành nhiều thương hiệu/thị trường từ một back-office duy nhất**.

AC:
- Sản phẩm/Category/Discount/Topic có thể giới hạn hiển thị theo Store cụ thể (Limited to stores) hoặc hiển thị ở tất cả store.
- Khách truy cập domain của Store A không thấy dữ liệu giới hạn riêng cho Store B.
- Mỗi Store có cấu hình riêng: đồng tiền mặc định, ngôn ngữ mặc định, theme.

---

### 2.15 Bản tin (Newsletter) & Marketing Email
*(`NewsletterController`, `Nop.Services/Messages/NewsLetterSubscriptionService`, plugin `Misc.Brevo/Omnisend`)*

**US-25 – Đăng ký/huỷ nhận bản tin**
> Là một **Khách vãng lai**, tôi muốn **đăng ký hoặc huỷ đăng ký nhận email khuyến mãi**, để **chủ động kiểm soát việc nhận thông tin marketing**.

AC:
- Đăng ký bằng email → nếu cấu hình yêu cầu xác nhận (double opt-in), trạng thái là "chưa kích hoạt" cho đến khi bấm link xác nhận trong email.
- Email đã đăng ký trước đó, đăng ký lại → không tạo bản ghi trùng, cập nhật lại trạng thái "Active".
- Link huỷ đăng ký trong email marketing → huỷ ngay lập tức không cần đăng nhập.

---

### 2.16 Vendor (Nhà cung cấp bên thứ 3)
*(`VendorController`, `Areas/Admin/Controllers/VendorController`)*

**US-26 – Vendor quản lý sản phẩm của mình**
> Là một **Vendor**, tôi muốn **đăng nhập vào một khu vực quản trị giới hạn để quản lý sản phẩm do mình cung cấp**, để **tự vận hành gian hàng mà không cần quyền truy cập toàn hệ thống**.

AC:
- Vendor chỉ thấy/sửa được sản phẩm gán cho Vendor đó, không thấy sản phẩm của Vendor khác.
- Vendor không có quyền truy cập các mục ngoài phạm vi được cấp (Customer, Settings hệ thống...).
- Trang thông tin Vendor công khai (Vendor Page) hiển thị đúng danh sách sản phẩm & mô tả Vendor.

---

### 2.17 Recently Viewed / Compare Products
*(`ProductController` – Compare/RecentlyViewed)*

**US-27 – So sánh sản phẩm & sản phẩm đã xem**
> Là một **Khách vãng lai**, tôi muốn **thêm sản phẩm vào danh sách so sánh và xem lại sản phẩm mình đã xem gần đây**, để **dễ dàng đối chiếu trước khi quyết định mua**.

AC:
- Danh sách so sánh hiển thị song song các thuộc tính kỹ thuật (Specification Attribute) của từng sản phẩm.
- Vượt quá số lượng sản phẩm so sánh tối đa (nếu cấu hình giới hạn) → thông báo rõ và không thêm được sản phẩm mới cho đến khi bớt sản phẩm cũ.
- "Sản phẩm đã xem gần đây" chỉ hiển thị nếu tính năng được bật trong cấu hình Catalog Settings.

---

### 2.18 GDPR & Quyền riêng tư dữ liệu
*(`Nop.Services/Gdpr`, `CustomerController` – GDPR tools)*

**US-28 – Xuất/xoá dữ liệu cá nhân theo GDPR**
> Là một **Customer**, tôi muốn **yêu cầu xuất toàn bộ dữ liệu cá nhân của mình hoặc yêu cầu xoá tài khoản**, để **thực hiện quyền riêng tư dữ liệu theo quy định (GDPR)**.

AC:
- Yêu cầu xuất dữ liệu → hệ thống tạo file chứa thông tin cá nhân, đơn hàng, địa chỉ liên quan đến tài khoản đó.
- Yêu cầu xoá tài khoản → được ghi nhận và xử lý theo quy trình Admin duyệt (không xoá cứng ngay lập tức nếu đơn hàng liên quan cần lưu trữ theo luật kế toán).
- Mọi thao tác export/xoá đều được ghi vào GDPR Log kèm thời điểm thực hiện.

---

## Phần 3: Bảng Estimate & Phân chia công việc

**Mục tiêu:** tính ra "khoảng thời gian nhóm sẽ có bản **full user stories** cho toàn bộ chức năng" để báo cáo thầy vào ngày mai.

**Đơn vị:** 1 story point ≈ 0.5 ngày làm việc/người cho 1 người **đã đọc code module đó** (đọc code + viết US + AC theo mẫu, không gồm review).
**Size:** S = 1 điểm · M = 2 điểm · L = 3 điểm.

| # | Module | Size | Điểm | Trạng thái |
|---|---|---|---|---|
| 1–18 | *(18 module đã liệt kê ở Phần 2)* | – | – | ✅ Đã xong (~24 điểm, xem log) |
| 19 | Checkout Attribute / Customer Attribute (thuộc tính đơn hàng, hồ sơ tuỳ biến) | S | 1 | 🔜 |
| 20 | Gift Card (tạo, phát hành, dùng) | S | 1 | 🔜 |
| 21 | Recurring Payment (thanh toán định kỳ) | M | 2 | 🔜 |
| 22 | Affiliate (chương trình cộng tác viên) | M | 2 | 🔜 |
| 23 | Forums (plugin `Misc.Forums`) | L | 3 | 🔜 |
| 24 | Private Messages (nhắn tin nội bộ khách hàng) | S | 1 | 🔜 |
| 25 | Polls (bình chọn) | S | 1 | 🔜 |
| 26 | Back in Stock Subscription | S | 1 | 🔜 |
| 27 | Product Tags / So sánh nâng cao | S | 1 | 🔜 |
| 28 | SEO (Slug/Sitemap/Meta) – Admin | M | 2 | 🔜 |
| 29 | Widget & Menu (quản lý khối nội dung, menu động) | M | 2 | 🔜 |
| 30 | Message Template & Email Account (cấu hình email hệ thống) | M | 2 | 🔜 |
| 31 | Plugin management (cài/gỡ/cấu hình plugin) – Admin | M | 2 | 🔜 |
| 32 | Payment plugins riêng lẻ (PayPal Commerce, Manual, Check/MO) | M | 2 | 🔜 |
| 33 | Shipping plugin (UPS, Pickup In Store) | M | 2 | 🔜 |
| 34 | Tax plugin (Avalara, Fixed/Country-State-Zip) | M | 2 | 🔜 |
| 35 | Multi-Factor Authentication (Google Authenticator) | S | 1 | 🔜 |
| 36 | External Auth (Facebook login) | S | 1 | 🔜 |
| 37 | Reminders / Reminder Rules (nhắc nhở tự động) | M | 2 | 🔜 |
| 38 | Price Lists (bảng giá riêng theo khách hàng/nhóm) | M | 2 | 🔜 |
| 39 | RFQ – Request for Quote | M | 2 | 🔜 |
| 40 | Localization (đa ngôn ngữ) – Admin & Storefront | M | 2 | 🔜 |
| 41 | Security/Access Control (ACL, Permission) – Admin | M | 2 | 🔜 |
| 42 | Schedule Tasks (tác vụ nền tự động) – Admin | S | 1 | 🔜 |

**Tổng điểm còn lại:** 33 điểm ≈ **16.5 ngày-người**.

### Cách quy đổi ra thời gian thực tế để báo cáo

| Số thành viên tham gia viết US | Tổng ngày làm việc thực tế (giả định làm song song, không trùng module) |
|---|---|
| 1 người | ~17 ngày làm việc |
| 2 người | ~9 ngày làm việc |
| 3 người | ~6 ngày làm việc |
| 4 người | ~5 ngày làm việc |

> ⚠️ Số liệu trên **giả định** không có buổi review chung. Thực tế nên cộng thêm **20% buffer** cho việc thống nhất mẫu/rà soát chéo giữa các thành viên, và 0.5 ngày để tổng hợp lại thành 1 file/sheet hoàn chỉnh cuối cùng.

**Đề xuất báo cáo thầy (điền số thành viên thực tế của nhóm vào cột trên):**
> "Nhóm có **N** thành viên, mỗi người nhận **[X điểm]** module theo bảng phân chia. Dự kiến hoàn thành bản đầy đủ user stories cho toàn bộ chức năng sau **[Y] ngày làm việc** kể từ hôm nay."

### Gợi ý chia việc (nếu nhóm 4 người, ~8 điểm/người)
- **Người A:** #19, #20, #26, #27, #35, #36, #42 (đăng ký/tài khoản/tiện ích nhỏ)
- **Người B:** #23, #24, #25, #30, #40 (nội dung/cộng đồng/đa ngôn ngữ)
- **Người C:** #21, #22, #37, #38, #39 (thanh toán nâng cao/giá/CTV)
- **Người D:** #28, #29, #31, #32, #33, #34, #41 (cấu hình hệ thống/plugin/bảo mật)

---

## Phần 4: Đưa vào Google Sheet

Mình **chưa được cấp quyền ghi trực tiếp vào Google Sheets** trong phiên làm việc này (cần bạn/nhóm xác thực Google Sheets qua `claude mcp`/`/mcp` hoặc kết nối trên claude.ai trước). Hai cách để đưa nội dung trên vào Sheet:

1. **Copy thủ công:** copy từng bảng ở Phần 3 (dạng Markdown table) dán vào Google Sheets — Sheets tự nhận diện dấu `|` khi dán dạng "Paste special > Split text to columns", hoặc dùng https://tabletomarkdown.com/convert-markdown-to-html/ trung gian.
2. **Export CSV rồi Import:** nếu bạn muốn, mình có thể xuất riêng bảng estimate (Phần 3) và bảng user story (Phần 2, dạng: Module | US ID | User Story | Acceptance Criteria) ra file `.csv` trong thư mục dự án để bạn kéo vào Google Drive → Google Sheets bằng "File > Import".

Nếu muốn mình xuất luôn file CSV, nói mình biết để mình tạo (không cần quyền Google, chỉ là file cục bộ để bạn upload).
