HỆ THỐNG QUẢN LÝ THIẾT BỊ VÀ CƠ SỞ VẬT CHẤT PHÒNG THÍ NGHIỆM (SEP HUST)
Viện Vật lý Kỹ thuật - Đại học Bách khoa Hà Nội

Đây là hệ thống phần mềm quản lý thiết bị phòng thí nghiệm toàn diện (Laboratory Information Management System - LIMS) được thiết kế chuyên biệt cho Viện Vật lý Kỹ thuật (SEP), Đại học Bách khoa Hà Nội. Hệ thống cung cấp nền tảng quản trị tập trung cho hệ sinh thái máy móc đo lường phức tạp và quy trình vận hành tại 10 phòng thí nghiệm chuyên sâu của Viện.

1. TÍNH NĂNG CỐT LÕI
Hệ thống được phát triển theo kiến trúc hướng dịch vụ (Service-Oriented Architecture), cung cấp các phân hệ chính sau:

1.1. Quản trị Cơ sở vật chất và Thiết bị
Phân loại tự động: Tổ chức hệ sinh thái thiết bị theo 7 chuyên ngành nghiên cứu đặc thù (Phân tích & Đo lường, Cấu trúc Nano, Quang học, Kiểm tra NDT, Từ tính, Hạt nhân, Giảng dạy).

Hồ sơ Phòng thí nghiệm (Wiki Base): Số hóa thông tin 10 phòng thí nghiệm cấp Viện. Tích hợp giao diện hiển thị chuyên biệt dưới dạng Báo cáo tổng quan, bao gồm thông tin trưởng phòng, định hướng nghiên cứu và danh mục trang thiết bị.

Cẩm nang vận hành (SOP Viewer): Chuẩn hóa quy trình vận hành máy móc thành hệ thống Timeline dọc tích hợp hình ảnh minh họa cho từng thao tác, đảm bảo an toàn lao động trong PTN.

1.2. Giám sát Hoạt động và Tương tác
Sổ tay điện tử (Digital Logbook): Thay thế sổ ghi chép giấy truyền thống. Cho phép sinh viên và nghiên cứu viên ghi nhận thời gian sử dụng, mục đích thí nghiệm và báo cáo sự cố theo thời gian thực.

Hệ thống Thông báo (Broadcast): Tích hợp chuông thông báo (Notification Bell). Hỗ trợ Ban quản trị phát đi các thông báo khẩn cấp (lịch bảo trì, nội quy phòng lab) đến toàn bộ tài khoản trong hệ thống.

Trung tâm Hỗ trợ (Feedback Loop): Hệ thống thu nhận góp ý, báo lỗi thiết bị trực tiếp từ người dùng, tự động phân loại và chuyển đến hòm thư của Quản trị viên.

1.3. Quản lý Định danh và Phân quyền (RBAC)
Cơ chế xác thực an toàn, chia làm 3 cấp độ:

Sinh viên/Học viên: Quyền tra cứu SOP, tra cứu thông tin phòng lab, đặt lịch và ghi sổ tay sử dụng thiết bị.

Cán bộ phụ trách (Instructor): Cấp quyền thông qua Mã bảo mật nội bộ. Cho phép chỉnh sửa thông số máy, cập nhật quy trình vận hành và kiểm duyệt lịch sử.

Quản trị viên (Admin): Toàn quyền kiểm soát tài khoản người dùng, xử lý hòm thư phản hồi và phát thông báo hệ thống.

2. KIẾN TRÚC KỸ THUẬT VÀ CÔNG NGHỆ
Dự án được xây dựng hoàn toàn bằng kiến trúc Serverless, loại bỏ sự phụ thuộc vào máy chủ vật lý, tối ưu hóa tốc độ và chi phí vận hành.

Frontend: Thuần HTML5, CSS3 và Vanilla JavaScript (Module). Giao diện thiết kế theo triết lý "Luxury Dashboard", sử dụng bộ font tiêu chuẩn Be Vietnam Pro và thư viện Phosphor Icons.

Backend & Database: Supabase (PostgreSQL). Quản trị dữ liệu quan hệ, tích hợp Row Level Security (RLS) để bảo mật truy cập.

Authentication: Supabase Auth (JWT). Quản lý phiên đăng nhập và định danh người dùng.

Storage: Supabase Storage. Lưu trữ và phân phối tài nguyên hình ảnh thiết bị thông qua CDN nội bộ.

3. HƯỚNG DẪN CÀI ĐẶT (DÀNH CHO NHÀ PHÁT TRIỂN)
Vì ứng dụng không yêu cầu môi trường Node.js hay Build tools (Webpack/Vite), quá trình triển khai cực kỳ tinh gọn.

3.1. Cấu hình cục bộ
Sao chép kho lưu trữ (Clone repository):
git clone <đường-dẫn-repo>

Mở thư mục dự án và chạy file index.html thông qua tiện ích Live Server (trên VS Code) hoặc tải trực tiếp lên các dịch vụ hosting tĩnh (Vercel, GitHub Pages, Netlify).

3.2. Cấu hình Cơ sở dữ liệu (Supabase)
Hệ thống yêu cầu các bảng dữ liệu sau để hoạt động hoàn chỉnh:

profiles: Thông tin người dùng (id, full_name, role).

devices: Danh mục thiết bị và phòng thí nghiệm (id, name, cat, status, description, steps).

device_logs: Sổ tay sử dụng thiết bị (id, device_id, user_id, user_name, usage_date, start_time, end_time, purpose).

feedbacks: Hòm thư góp ý (id, user_id, user_name, subject, content, status).

notifications: Thông báo hệ thống (id, title, message).

Lưu ý: Các truy vấn SQL cấu trúc (Schema) và bộ dữ liệu khởi tạo đã được lưu trữ trong mã nguồn đi kèm để hỗ trợ việc tái tạo cơ sở dữ liệu trên các dự án mới.

4. TÀI LIỆU VÀ BẢN QUYỀN
Hệ thống được phát triển dưới dạng đồ án học thuật ứng dụng. Toàn bộ dữ liệu mô tả phòng thí nghiệm và quy trình vận hành thiết bị được tham chiếu từ các tài liệu hướng dẫn lưu hành nội bộ và cổng thông tin điện tử của Viện Vật lý Kỹ thuật - Đại học Bách khoa Hà Nội (sep.hust.edu.vn).

Mã nguồn mở và cho phép phát triển, tùy biến theo giấy phép MIT.
