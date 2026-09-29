# Vòng chơi vận hành nhà thuốc

## Nền thực tế

Nguồn tham khảo, đọc ngày 30-09-2026:

- [Thông tư 02/2018/TT-BYT về GPP](https://vbpl.vn/boyte/Pages/vbpq-toanvan.aspx?ItemID=129485): bán lẻ thuốc gồm cung cấp trực tiếp kèm tư vấn dùng thuốc an toàn, hiệu quả; cơ sở được đánh giá theo nguyên tắc và tiêu chuẩn GPP. Cần kiểm tra văn bản sửa đổi và phạm vi áp dụng trước khi chuyển một chi tiết thành quy tắc pháp lý trong game.
- [Giới thiệu Long Châu](https://nhathuoclongchau.com.vn/chinh-sach/gioi-thieu): chuỗi nhấn mạnh nguồn hàng chính hãng, kiểm soát chất lượng, giá niêm yết, dược sĩ tư vấn và giao hàng.
- [Chính sách giao hàng Long Châu](https://nhathuoclongchau.com.vn/chinh-sach/chinh-sach-giao-hang) và [Pharmacity](https://www.pharmacity.vn/dich-vu-giao-hang): cả hai phân biệt thuốc kê đơn và không kê đơn trên kênh trực tuyến; đơn giao hàng có trạng thái, hạn hẹn và xử lý khiếu nại.
- [An Khang](https://www.nhathuocankhang.com/): giới thiệu cam kết hàng chính hãng, giao nhanh, đổi trả và kênh khiếu nại.

Các chuỗi trên chỉ là nguồn để hiểu quy trình chung. Game dùng tiệm và nhân vật hư cấu, không tái hiện nội bộ hay chính sách cụ thể của chuỗi nào.

## Core loop đã triển khai

1. Mỗi ngày từ ngày 2 xuất hiện một sự cố quản lý: điều kiện bảo quản, chứng từ nhà cung ứng, lịch ca, hoặc bài đăng phàn nàn.
2. Người chơi chọn một cách xử lý. Lựa chọn có chi phí và hệ số khách trong ngày; quyết định tắt rủi ro sớm có thể làm doanh số giảm, còn chạy theo doanh số làm điểm quản lý giảm. Chi phí được ghi vào sổ lãi lỗ.
3. Cuối ngày điểm quản lý vùng được cập nhật theo mục tiêu ngày, nợ lương, việc chuẩn bị mở cửa, hàng hết hạn và đơn giao trễ/huỷ. Bỏ qua sự cố cũng bị trừ điểm.
4. Từ ngày 10, nếu điểm xuống 15/100 hoặc nợ lương đạt 100 xu, có quyết định điều chuyển. Mô phỏng dừng cho tới khi người chơi nhận chi nhánh mới. Chi nhánh khởi đầu lại, số lần điều chuyển vẫn lưu.

Các con số là giá trị cân bằng game, không phải mức phạt hay ngưỡng thực tế. Lựa chọn sai về quy trình chỉ là hậu quả vận hành hư cấu; hệ thống bán hàng sẵn có vẫn giữ rào chắn an toàn cho khách cần đi khám.

## Bước mở rộng đáng làm tiếp

- **Kiểm tra theo chứng cứ thay vì một nút lựa chọn:** nhiệt độ bảo quản, lô hàng và chứng từ có trạng thái riêng; người chơi đối soát trong lúc khách và đơn giao tiếp tục đến. Cách này biến sự cố thành công việc quản lý thật sự.
- **Nhân sự có quan hệ và phản ứng:** đổi ca, mệt mỏi, nợ lương, nhân viên giỏi xin chuyển chi nhánh; các lời thoại drama xuất phát từ số liệu thực, không phát ngẫu nhiên vô cớ.
- **Đánh giá vùng công bằng hơn:** so sánh xu hướng nhiều ngày và giải thích từng khoản cộng/trừ; không phạt dược sĩ vì sao thấp do giá cửa hàng hay khách khó tính.
- **Kết cục khác nhau:** cứu tiệm qua kế hoạch phục hồi 2–3 ngày, bị điều chuyển, hoặc tự xin về cửa hàng nhỏ với vốn khác. Không dùng phá sản như thuật ngữ pháp lý nếu người chơi chỉ là quản lý chi nhánh.
