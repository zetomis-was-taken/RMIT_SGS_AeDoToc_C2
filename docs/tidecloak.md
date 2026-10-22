# TideCloak cho Citizen Data Guard

Tài liệu này hướng dẫn chạy TideCloak local bằng Docker cho dự án, tạo realm đầu tiên và cấu hình app để tích hợp.

> TideCloak là IAM tương thích Keycloak, bổ sung các lớp Tide (BYOiD, quorum governance, tamper-proof authorization, E2EE). Bản đang dùng là `tideorg/tidecloak-dev` — **chỉ dành cho development/demo**, không dùng làm production.

## 1. Yêu cầu

- Docker Desktop đang chạy (Windows/macOS) hoặc Docker Engine + Compose (Linux).
- Kết nối Internet: TideCloak cần liên hệ Tide Fabric để kích hoạt license và thực hiện enrollment.
- Trình duyệt để hoàn tất bước tạo realm và liên kết tài khoản Tide.
- Một tài khoản Tide (có thể tạo trong lúc enrollment). License developer miễn phí hỗ trợ tối đa 100 user.

Kiểm tra môi trường:

```bash
docker --version
docker compose version
```

## 2. Các file đã được tạo

| File | Mục đích |
| --- | --- |
| `docker-compose.yml` | Stack TideCloak, volume lưu H2 database và realm keys |
| `.env.example` | Mẫu cấu hình; copy thành `.env` |
| `docs/tidecloak.md` | Hướng dẫn này |

## 3. Khởi động TideCloak

Từ thư mục gốc của repo:

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up -d
docker compose ps
```

Xem log đến khi server sẵn sàng:

```bash
docker compose logs -f tidecloak
```

Khi thấy Keycloak khởi động xong, mở:

**http://localhost:8080**

Đăng nhập bằng master admin trong `.env` (mặc định `admin` / `password`). Nếu đổi mật khẩu trong `.env`, phải đổi **trước lần chạy đầu tiên**; sau khi database đã tạo, biến bootstrap không còn tác dụng.

## 4. Tạo realm và liên kết Tide

Đây là các bước bắt buộc, phải làm trong trình duyệt (không tự động hóa được):

1. Sau khi đăng nhập, trang **Set up this realm** hiện ra.
2. Nhập tên dự án (ví dụ `citizen-data-guard`) và email liên hệ, chấp nhận điều khoản, bấm **Set up realm**.
   - Bước này tạo realm, Tide keys, app mẫu và admin user đầu tiên.
3. Ở thẻ **Link your Tide account**, bấm **Open the link to enroll**.
4. Trong Tide enclave, chọn **Create an account**, đặt username/password và làm theo hướng dẫn (bao gồm email khôi phục).
5. Quay lại tab cũ. Wizard tự phát hiện enrollment hoàn tất và đưa vào **tide-console** với quyền admin đầu tiên.

> Chưa hoàn tất enrollment thì realm chưa có admin thực sự và app chưa đăng nhập được.

Ghi lại:

- **Realm name**: dùng trong URL `http://localhost:8080/realms/<realm>`.
- **TideCloak URL**: `http://localhost:8080`.
- Tài khoản Tide đã enroll: dùng để đăng nhập tide-console.

## 5. Tạo app client cho Citizen Data Guard

1. Trong tide-console, vào **Apps** → **Add an app**.
2. Nhập tên app (ví dụ `citizen-data-guard-web`) và URL nơi app chạy:
   - Next.js local: `http://localhost:3000`
   - Có thể thêm origin khác cho từng môi trường demo.
3. Mở app vừa tạo → tab **Credentials** → mục **Tide adapter** → tải **tidecloak.json**.
4. Đặt file `tidecloak.json` vào thư mục gốc của app (không commit file này; thêm vào `.gitignore` của app).

File này chứa realm, client ID, adapter config và các endpoint Tide. App sẽ dùng nó để khởi tạo TideCloak adapter.

### Kiểm tra nhanh bằng test client

1. Trong tide-console, tạo thêm một app với URL `https://test.tidecloak.com`.
2. Mở https://test.tidecloak.com.
3. Điền:
   - TideCloak URL: `http://localhost:8080`
   - Realm: realm vừa tạo
   - Client: client ID của app test
4. Bấm **Save** → **Sign in** và hoàn tất đăng nhập.

Nếu đăng nhập thành công, server + realm + client đã hoạt động.

## 6. Lệnh thường dùng

```bash
# Trạng thái
docker compose ps

# Log
docker compose logs -f tidecloak

# Dừng (giữ dữ liệu)
docker compose down

# Khởi động lại
docker compose up -d

# XÓA TOÀN BỘ realm, user, Tide enrollment và keys
docker compose down -v
```

`down -v` xóa volume `citizen-data-guard_tidecloak-data`; lần chạy sau phải làm lại từ bước 4 và enroll Tide từ đầu. Chỉ dùng khi muốn reset demo sạch.

## 7. Cấu hình cho app

Ứng dụng chưa được scaffold trong repo. Khi bắt đầu code app, chọn một trong các SDK chính thức:

- Next.js: https://docs.tide.org/Languages/NextJS/tidecloak-nextjs-intro
- React: https://docs.tide.org/Languages/React/tidecloak-react-intro
- JavaScript: https://docs.tide.org/Languages/JavaScript/tidecloak-js-intro
- C# / ASP.NET: https://docs.tide.org/Languages/CSharp/tidecloak-csharp-intro

Luồng tích hợp dự kiến:

1. App đọc `tidecloak.json` và khởi tạo TideCloak adapter.
2. Người dùng đăng nhập qua Tide (không lưu password trong app).
3. Backend xác thực token/session và **thực thi policy ở backend**, không chỉ ẩn UI.
4. Các thao tác nhạy cảm (cấp quyền diện rộng, đổi policy) đi qua quorum approval của TideCloak.
5. Các trường nhạy cảm dùng E2EE theo hướng dẫn TideCloak nếu muốn demo “DBA chỉ thấy ciphertext”.

Các điểm cần **tự kiểm chứng**, không mặc định TideCloak làm sẵn:

- Quorum áp dụng cho những action nào và ai là approver.
- Phần policy nghiệp vụ nào phải nằm ở backend.
- E2EE có thực sự bảo vệ trường dữ liệu trước quản trị viên hạ tầng trong cách triển khai của nhóm hay không.
- Cách chứng minh các giới hạn không thể bị bỏ qua bằng quyền admin hoặc truy cập DB trực tiếp.

## 8. Troubleshooting

**Cổng 8080 đã bị chiếm**

Đổi trong `.env`:

```dotenv
TIDECLOAK_PORT=8081
```

Sau đó chạy lại `docker compose up -d` và dùng `http://localhost:8081`. Nếu đổi port, phải cập nhật lại URL/origin trong app client.

**Trang web không tải được**

```bash
docker compose ps
docker compose logs --tail=200 tidecloak
```

Lần chạy đầu cần thời gian pull image (~340 MB) và vài chục giây để Keycloak khởi động.

**Quên mật khẩu master admin**

Mật khẩu bootstrap chỉ có tác dụng khi database trống. Nếu đã đổi và quên, cách nhanh nhất cho môi trường demo là reset bằng `docker compose down -v` rồi làm lại từ đầu (mất realm và enrollment).

**Enrollment Tide bị treo**

- Kiểm tra kết nối Internet và tường lửa.
- Giữ tab enrollment mở đến khi hoàn tất.
- Xem log container để biết lỗi mạng/Tide Fabric.
- Có thể đóng trình duyệt và mở lại link enrollment từ tide-console nếu wizard còn hiển thị.

**Không đăng nhập được từ máy khác trong LAN**

Mặc định cổng chỉ bind `127.0.0.1`. Đặt `TIDECLOAK_BIND_ADDRESS=0.0.0.0` trong `.env`, mở lại stack, và dùng địa chỉ IP của máy chạy Docker. Cần cấu hình hostname/origin tương ứng; chỉ làm khi thực sự cần demo qua LAN.

**Lỗi “invalid redirect URI”**

Origin phải khớp chính xác, bao gồm scheme, host và port. `http://localhost:3000` khác `http://127.0.0.1:3000`. Cập nhật URL của app trong tide-console.

## 9. Lưu ý production

Cấu hình này phục vụ demo/local development:

- Dùng H2 và image `tidecloak-dev`.
- Không có TLS, không có backup tự động, master admin mặc định yếu.
- Chưa cấu hình database bên ngoài, clustering hay reverse proxy.

Khi cần triển khai thật, xem hướng dẫn deploy và license của Tide, dùng database được hỗ trợ, TLS, secret manager, backup realm keys và quy trình offboarding/Ragnarok. Không tái sử dụng `.env` demo cho môi trường thật.
