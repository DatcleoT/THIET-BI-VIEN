# 🔬 Hệ thống Quản lý Thiết bị Phòng Thí nghiệm (SEP HUST)
**Đơn vị áp dụng:** Trường Vật liệu - Đại học Bách khoa Hà Nội (HUST)

![HUST Material](https://via.placeholder.com/1200x300/b71a1c/ffffff?text=HUST+MATERIAL+-+LAB+MANAGEMENT+SYSTEM)

## 📖 Giới thiệu Dự án
Hệ thống Quản lý Thiết bị Phòng Thí nghiệm là một Web Application được thiết kế nhằm số hóa toàn bộ cơ sở dữ liệu về thiết bị, máy móc tại Trường Vật liệu - HUST. 

Hệ thống cung cấp một **"Bách khoa toàn thư" nội bộ**, giúp sinh viên dễ dàng tra cứu nguyên lý vật lý, ứng dụng và quy trình thao tác chuẩn (SOP) của các thiết bị công nghệ cao trước khi bước vào phòng Lab. Đồng thời, cung cấp cho Cán bộ quản lý công cụ mạnh mẽ để theo dõi tình trạng thiết bị theo thời gian thực (Real-time).

---

## ✨ Tính năng nổi bật

### 1. Phân quyền và Bảo mật đa tầng (Role-Based Access Control)
* **👩‍🎓 Sinh viên (Read-only):** Đăng nhập bằng email nội bộ, tra cứu tài liệu, quy trình và xem trạng thái máy móc.
* **🛠️ Người phụ trách (Instructor - CRUD):** Yêu cầu **Mã bảo mật nội bộ** khi đăng ký. Cán bộ có toàn quyền Thêm mới, Cập nhật thông số, Đổi trạng thái (Bảo trì/Báo lỗi) và Xóa thiết bị.
* **Bảo mật cấp CSDL (Row Level Security - RLS):** Ngăn chặn tuyệt đối các luồng tải ảnh/chỉnh sửa dữ liệu trái phép thông qua API giả mạo.

### 2. Quản lý Thiết bị Toàn diện
* Phân loại logic theo 7 nhóm chuyên môn sâu: *Phân tích & Đo lường, Cấu trúc Nano, Đo Quang học, Kiểm tra NDT, Từ tính & Điện, Hạt nhân & Môi trường, Giảng dạy.*
* **Nội dung chuẩn học thuật:** Dữ liệu máy móc được chuẩn hóa, mô tả chi tiết Nguyên lý hoạt động và Ứng dụng thực tiễn thay vì chỉ nêu thông số khô khan.
* Tìm kiếm và Lọc dữ liệu (Real-time Search) không có độ trễ.

### 3. Trải nghiệm người dùng (UI/UX) Hiện đại
* **Giao diện Single Page Application (SPA):** Điều hướng mượt mà không cần tải lại trang. Chế độ hiển thị thẻ Card nổi 3D hiện đại mang đậm bản sắc Đại học Bách khoa Hà Nội.
* **Toast Notification & Progress Bar:** Hệ thống thông báo trạng thái trượt xếp chồng thông minh và thanh tiến trình trực quan khi tải file lớn (Async Upload).
* Tương thích hoàn hảo trên cả máy tính và thiết bị di động (Responsive Web Design).

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

* **Frontend:** HTML5, CSS3 (Grid/Flexbox/Animations), Vanilla JavaScript (ES6+). Kiến trúc Lightweight (Không dùng Framework) giúp trang web tải tức thì.
* **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL).
* **Authentication:** Supabase Auth (Quản lý đăng nhập, khôi phục mật khẩu).
* **Storage:** Supabase Storage Bucket (Lưu trữ ảnh thiết bị và quy trình với RLS Policy bảo vệ).
* **Deployment:** GitHub Pages.

---

## ⚙️ Cấu trúc Cơ sở dữ liệu (Database Schema)

Hệ thống hoạt động dựa trên 2 bảng (Tables) chính trên PostgreSQL:
1. **`profiles`**: Lưu trữ hồ sơ người dùng (`id`, `full_name`, `role`).
2. **`devices`**: Quản lý thông tin thiết bị (`id`, `name`, `cat`, `status`, `description`, `steps`, `created_by`).

---

## 🚀 Hướng dẫn Cài đặt (Dành cho nhà phát triển)

Nếu bạn muốn clone dự án này về và chạy trên môi trường cục bộ (Localhost):

1. **Clone repository:**
   ```bash
   git clone [https://github.com/YourUsername/THIET-BI-VIEN.git](https://github.com/YourUsername/THIET-BI-VIEN.git)
   cd THIET-BI-VIEN
