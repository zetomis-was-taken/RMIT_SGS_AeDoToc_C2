# Citizen Data Guard

> **Protecting citizen data from unauthorized access, privilege abuse, and misuse across agencies.**

## 1. Overview

**Citizen Data Guard** là một lớp bảo vệ quyền truy cập dữ liệu công dân, hướng đến việc ngăn chặn hành vi truy cập và sử dụng dữ liệu vượt quá phạm vi công việc được giao — kể cả khi hành vi đó đến từ nhân viên nội bộ hoặc người có quyền quản trị hệ thống.

Dự án hướng đến việc kết hợp kiểm soát truy cập theo ngữ cảnh, bảo vệ dữ liệu bằng mã hóa và cơ chế phê duyệt nhiều bên cho các thao tác nhạy cảm. Mục tiêu là giảm sự phụ thuộc vào niềm tin tuyệt đối đối với một cá nhân hoặc một quản trị viên duy nhất.

## 2. Problem Statement

Trong các hệ thống dịch vụ công, dữ liệu cá nhân có thể được chia sẻ giữa nhiều cơ quan và bộ phận để phục vụ các quy trình nghiệp vụ khác nhau.

Tuy nhiên, quyền truy cập dữ liệu có thể bị lạm dụng theo nhiều cách:

- **Nhân viên truy cập trái phạm vi công việc:** Tra cứu hồ sơ của người không thuộc nhiệm vụ được giao hoặc xem những thông tin không cần thiết.

- **Dữ liệu bị sử dụng sai mục đích:** Một cơ quan hoặc nhân viên sử dụng dữ liệu đã được chia sẻ cho mục đích khác với mục đích ban đầu.

- **Quản trị viên tự ý nâng quyền:** Người có quyền quản trị thay đổi chính sách hoặc cấp thêm quyền để truy cập dữ liệu nhạy cảm.

- **Quản trị viên hạ tầng đọc dữ liệu trực tiếp:** Người có quyền truy cập máy chủ hoặc cơ sở dữ liệu tìm cách đọc thông tin nhạy cảm ngoài quy trình nghiệp vụ hợp lệ.

Các tình huống trên có một điểm chung: **quyền quản lý hệ thống hoặc quyền truy cập một phần dữ liệu có thể bị lợi dụng để vượt qua giới hạn truy cập dự kiến.**

Việc chỉ yêu cầu đăng nhập hoặc phân quyền theo vai trò là chưa đủ để giải quyết toàn bộ vấn đề này.

## 3. Core Scenario

### Dữ liệu công dân bị lạm dụng do vượt quyền truy cập

Một công dân nộp hồ sơ tại cơ quan A. Để xử lý hồ sơ, nhân viên được cấp quyền truy cập một số thông tin cá nhân cần thiết. Một phần dữ liệu có thể tiếp tục được chia sẻ với cơ quan B để xác minh điều kiện của hồ sơ.

Trong quá trình này, một nhân viên có thể tìm cách xem hồ sơ không thuộc nhiệm vụ của mình, sử dụng dữ liệu cho mục đích khác hoặc chia sẻ thông tin vượt phạm vi được phép. Nếu nhân viên đó có quyền quản trị, họ thậm chí có thể thử tự cấp thêm quyền truy cập. Trong khi đó, quản trị viên cơ sở dữ liệu có thể tìm cách đọc dữ liệu trực tiếp từ hệ thống lưu trữ.

Hệ thống cần trả lời ba câu hỏi:

1. Người yêu cầu có được phép truy cập dữ liệu này cho nhiệm vụ hiện tại không?

2. Ai có quyền thay đổi chính sách truy cập, và một cá nhân có thể tự ý thay đổi chính sách hay không?

3. Nếu dữ liệu được mã hóa, liệu người có quyền quản trị hạ tầng có thể tự giải mã dữ liệu nhạy cảm hay không?

**Mục tiêu:** Bảo vệ dữ liệu xuyên suốt quá trình truy cập và chia sẻ, thay vì chỉ kiểm tra danh tính tại thời điểm đăng nhập.

## 4. Proposed Solution

Citizen Data Guard đề xuất một lớp bảo vệ gồm các cơ chế sau.

### 4.1. Context-aware Access Control

Quyền truy cập không chỉ dựa vào vai trò người dùng mà còn xem xét nhiệm vụ, hồ sơ được giao, loại dữ liệu và mục đích truy cập.

Ví dụ:

- Nhân viên A được xem hồ sơ X vì đang xử lý hồ sơ đó.

- Nhân viên A không được xem hồ sơ Y nếu không có nhiệm vụ hợp lệ liên quan.

- Cơ quan B chỉ nhận được các trường dữ liệu cần thiết để xác minh một điều kiện cụ thể.

### 4.2. Multi-party Approval

Các hành động có rủi ro cao, chẳng hạn cấp quyền truy cập diện rộng hoặc thay đổi chính sách bảo vệ dữ liệu, cần được nhiều người có thẩm quyền phê duyệt.

Một quản trị viên không được tự phê duyệt yêu cầu do chính mình khởi tạo để cấp quyền vượt phạm vi.

Cơ chế phê duyệt phải được bảo vệ để một cá nhân không thể tự ý thay đổi ngưỡng phê duyệt hoặc bỏ qua quy trình.

### 4.3. Data Protection and Key Separation

Dữ liệu nhạy cảm được mã hóa, đồng thời quyền quản trị hạ tầng được tách biệt khỏi quyền giải mã dữ liệu.

Mục tiêu là hạn chế khả năng quản trị viên cơ sở dữ liệu đọc thông tin nhạy cảm chỉ bằng quyền truy cập máy chủ hoặc bản ghi lưu trữ.

Mức độ bảo vệ thực tế phụ thuộc vào cách triển khai quản lý khóa, nơi dữ liệu được giải mã và quyền truy cập của các thành phần ứng dụng.

### 4.4. Purpose-bound Data Sharing

Khi một cơ quan cần thông tin từ cơ quan khác, hệ thống chỉ cung cấp dữ liệu cần thiết cho nghiệp vụ đã xác định.

Ví dụ, thay vì chia sẻ toàn bộ hồ sơ cá nhân, hệ thống có thể chỉ cung cấp kết quả xác minh một điều kiện nếu nghiệp vụ không cần các thông tin còn lại.

### 4.5. Auditable Access

Ghi nhận các sự kiện quan trọng như yêu cầu truy cập, quyết định cho phép hoặc từ chối, thay đổi quyền và các phê duyệt liên quan.

Nhật ký hỗ trợ kiểm tra và điều tra hành vi đáng ngờ. Tuy nhiên, chỉ có nhật ký không đồng nghĩa với việc hệ thống có thể ngăn chặn mọi hành vi sao chép hoặc tiết lộ dữ liệu.

## 5. Example User Flow

1. Nhân viên đăng nhập và yêu cầu truy cập hồ sơ công dân.

2. Hệ thống xác minh danh tính, vai trò, nhiệm vụ được giao và phạm vi dữ liệu cần thiết.

3. Nếu yêu cầu hợp lệ, hệ thống chỉ cung cấp phần dữ liệu được phép.

4. Nếu nhân viên yêu cầu xem hồ sơ ngoài phạm vi công việc, hệ thống từ chối và ghi nhận sự kiện.

5. Nếu quản trị viên muốn tự cấp quyền diện rộng, yêu cầu phải trải qua cơ chế phê duyệt nhiều bên.

6. Quản trị viên cơ sở dữ liệu có thể quản lý hạ tầng nhưng không mặc nhiên có quyền giải mã dữ liệu nhạy cảm.

7. Các quyết định truy cập và thay đổi chính sách được ghi nhận để phục vụ kiểm tra.

## 6. Role of TideCloak

Dự án dự kiến sử dụng TideCloak làm nền tảng liên quan đến danh tính, kiểm soát truy cập và các cơ chế bảo mật hoặc quản trị được nền tảng hỗ trợ.

Việc tích hợp cần xác minh cụ thể:

- TideCloak hỗ trợ những cơ chế nào có thể sử dụng trực tiếp.

- Cơ chế phê duyệt nhiều bên có thể bảo vệ những thao tác nào.

- Phần nào phải được triển khai ở tầng ứng dụng, backend hoặc hệ thống quản lý khóa.

- Làm thế nào để chứng minh các giới hạn truy cập không thể bị bỏ qua chỉ bằng cách thao tác với cơ sở dữ liệu hoặc tài khoản quản trị.

Không giả định rằng TideCloak tự động giải quyết toàn bộ chính sách nghiệp vụ, mã hóa dữ liệu đầu cuối hoặc bảo vệ khóa giải mã. Những khả năng đó phải được xác minh và triển khai phù hợp.

## 7. MVP Scope

MVP tập trung vào một quy trình nghiệp vụ mô phỏng với dữ liệu công dân giả lập.

### Must-have

- Đăng nhập và phân biệt nhân viên với quản trị viên.

- Quản lý hồ sơ và phạm vi dữ liệu được phép truy cập.

- Backend thực thi chính sách truy cập; không chỉ ẩn dữ liệu trên giao diện.

- Từ chối truy cập hồ sơ ngoài phạm vi nhiệm vụ.

- Cơ chế phê duyệt nhiều bên cho ít nhất một thao tác nhạy cảm.

- Nhật ký ghi nhận quyết định truy cập và thay đổi quyền.

- Demo tích hợp TideCloak bằng các cơ chế thực sự được hỗ trợ.

### Stretch Goals

- Mã hóa trường dữ liệu nhạy cảm và tách biệt quyền quản trị cơ sở dữ liệu khỏi quyền giải mã.

- Chia sẻ dữ liệu theo từng trường hoặc chỉ trả về kết quả xác minh.

- Bổ sung kịch bản kiểm thử quyền truy cập trực tiếp vào cơ sở dữ liệu.

- Chứng minh quản trị viên không thể tự sửa chính sách hoặc vượt qua cơ chế phê duyệt.

## 8. Demo Acceptance Criteria

MVP chỉ được xem là đáp ứng các mục tiêu tương ứng khi có thể chứng minh bằng kiểm thử:

- Nhân viên được truy cập hồ sơ thuộc nhiệm vụ của mình.

- Yêu cầu truy cập hồ sơ ngoài phạm vi bị backend từ chối.

- Một quản trị viên không thể tự cấp cho mình quyền nhạy cảm mà không qua cơ chế phê duyệt bắt buộc.

- Dữ liệu được chia sẻ chỉ chứa các trường được cho phép.

- Nếu tuyên bố quản trị viên hạ tầng không thể đọc dữ liệu nhạy cảm, phải chứng minh bằng cơ chế mã hóa và quản lý khóa thực tế, không chỉ bằng thông báo từ chối trên giao diện.

- Các hành động bảo mật quan trọng được ghi nhận và có thể kiểm tra.

## 9. Threat Model and Limitations

Citizen Data Guard hướng đến việc giảm rủi ro truy cập trái phép và lạm dụng quyền nội bộ. Dự án không tuyên bố loại bỏ mọi nguy cơ rò rỉ dữ liệu.

Các giới hạn cần được thừa nhận:

- Người dùng được cấp quyền hợp lệ vẫn có thể chụp ảnh, sao chép hoặc tiết lộ dữ liệu họ đã xem.

- Nếu ứng dụng cần giải mã dữ liệu để xử lý, các thành phần có quyền tiếp cận dữ liệu sau giải mã vẫn có thể tạo ra rủi ro.

- Nhật ký kiểm toán không tự ngăn chặn hành vi lạm dụng.

- Cơ chế phê duyệt nhiều bên không hiệu quả nếu một quản trị viên vẫn có thể sửa cấu hình hoặc bỏ qua cơ chế đó.

- Dữ liệu giả lập trong MVP không chứng minh rằng giải pháp đã sẵn sàng triển khai trong hệ thống hành chính công thực tế.

## 10. Project Vision

**Citizen Data Guard hướng đến một mô hình trong đó quyền quản trị hệ thống không đồng nghĩa với quyền kiểm soát tuyệt đối dữ liệu công dân.**

Bằng cách kết hợp kiểm soát truy cập theo ngữ cảnh, phê duyệt nhiều bên, bảo vệ dữ liệu và khả năng kiểm toán, dự án hướng đến việc xây dựng một hệ thống đáng tin cậy hơn mà không cần đặt toàn bộ niềm tin vào một cá nhân duy nhất.

> **Core principle:** Access should be limited by legitimate purpose, sensitive changes should require accountable authorization, and infrastructure control should not automatically grant unrestricted access to private data.
