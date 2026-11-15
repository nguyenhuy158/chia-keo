export type HelpTopic = {
  id: string;
  title: string;
  steps: string[];
};

export type HelpGroup = {
  id: string;
  title: string;
  topics: HelpTopic[];
};

export const HELP_GROUPS: HelpGroup[] = [
  {
    id: "basics",
    title: "Chia tiền cơ bản",
    topics: [
      {
        id: "create-game",
        title: "Tạo cuộc chơi và thêm người",
        steps: [
          'Ở thanh bên trái, gõ tên vào ô "Tạo cuộc chơi" rồi bấm +. Trên điện thoại, bấm nút ☰ ở góc trái header để mở danh sách cuộc chơi.',
          '"Tạo sẵn số người" tạo nhanh Người 1, Người 2... để vào việc ngay. Đổi tên sau.',
          'Trong "Người tham gia", nhập tên. Muốn có QR nhận tiền thì nhập thêm ngân hàng, số tài khoản và tên chủ tài khoản.',
          "Danh bạ lưu những người hay đi cùng. Lần sau chỉ cần tick chọn.",
        ],
      },
      {
        id: "add-expense",
        title: "Thêm khoản chi và chia tiền",
        steps: [
          'Ở mục "Khoản chi", nhập nội dung, số tiền, chọn người trả rồi chọn chia cho ai.',
          "Chia đều: mỗi người một phần bằng nhau. Theo phần: mỗi người một số phần, ví dụ 1:2:3. Số tiền: nhập số cụ thể cho từng người, tổng phải khớp.",
          'Chọn "Danh mục" (không bắt buộc) để xem chi tiêu theo nhóm.',
          "Muốn đổi thứ tự các khoản chi, kéo biểu tượng ⠿ bên trái mỗi dòng.",
        ],
      },
      {
        id: "read-balance",
        title: "Đọc bảng cân bằng và ai chuyển cho ai",
        steps: [
          '"Cân bằng" cho từng người: Nhận là người được trả lại, Trả là người còn nợ, Đủ là không nợ.',
          '"Đã trả" là số tiền người đó ứng trước. "Phải chịu" là phần của họ.',
          "Phần chuyển khoản có 4 kiểu: Nhiều chiều (chuyển thẳng từng cặp, ít lượt nhất), Gom 1 người (ai cũng chuyển về người ứng nhiều nhất, chỉ một QR), Chọn người (gom về người bạn chọn), Tắt (không hiện chuyển khoản).",
        ],
      },
    ],
  },
  {
    id: "payment-share",
    title: "Thanh toán và chia sẻ",
    topics: [
      {
        id: "share-link",
        title: "Gửi link cho cả nhóm",
        steps: [
          'Ở trang cuộc chơi, bấm nút ⋯ trên header rồi chọn "Tạo link share".',
          "Gửi link cho nhóm. Ai mở cũng xem được tổng kết, bảng chia, ảnh và QR mà không cần đăng nhập. Người xem chỉ đọc, không sửa được.",
          '"Tắt link" để ngừng chia sẻ tạm thời. "Đổi link" tạo link mới và link cũ hết hiệu lực.',
        ],
      },
      {
        id: "qr-paid",
        title: "Chuyển khoản bằng QR và ghi nhận đã trả",
        steps: [
          "Mỗi khoản cần chuyển có QR nếu người nhận đã nhập tài khoản ngân hàng.",
          '"Nhắc" copy tin nhắc nợ để gửi cho người còn nợ.',
          '"Đã trả" ghi nhận khoản trả nợ, số dư của hai người được cân lại.',
        ],
      },
      {
        id: "sepay",
        title: "Thanh toán qua SePay trên link chia sẻ",
        steps: [
          'Nếu người nhận dùng tài khoản đã nối SePay, người trả mở link chia sẻ và bấm "Thanh toán".',
          "Chuyển khoản đúng nội dung có mã CK được hiển thị. Ứng dụng tự kiểm tra và ghi khoản trả nợ khi tiền về, không cần bấm thêm.",
          "Chuyển thiếu thì khoản vẫn ở trạng thái chờ. Đủ tiền mới được ghi là đã trả.",
        ],
      },
      {
        id: "copy-email",
        title: "Copy, email và ảnh tổng kết",
        steps: [
          'Nút "Copy" lấy tổng kết dạng ảnh hoặc chữ để dán vào Zalo, nhóm chat.',
          'Trong menu ⋯ có "Email cho tôi" để gửi tóm tắt về hộp thư.',
          'Mục "Xem trước" (bấm Xem): chọn nền, bật hoặc tắt QR và avatar, rồi "Copy ảnh" hoặc "Lưu về máy".',
        ],
      },
      {
        id: "collaborators",
        title: "Mời người khác cùng sửa",
        steps: [
          'Mở mục "Chia sẻ cuộc chơi" (bấm Xem), nhập email của người cần mời.',
          "Họ đăng nhập là thấy cuộc chơi và sửa được mọi thứ, trừ xóa cuộc chơi. Email chưa từng đăng nhập vẫn mời được.",
        ],
      },
    ],
  },
  {
    id: "advanced",
    title: "Tính năng nâng cao",
    topics: [
      {
        id: "ai-input",
        title: "Nhập nhanh bằng AI",
        steps: [
          'Mở "Nhập nhanh bằng AI" ở mục Khoản chi và mô tả khoản chi bằng lời.',
          "Kiểm tra lại gợi ý trước khi lưu. Tính năng này chỉ dùng được khi máy chủ đã bật AI.",
        ],
      },
      {
        id: "income-transfer",
        title: "Khoản thu và trả nợ",
        steps: [
          'Tab "Khoản thu" dành cho tiền vào, ví dụ được hoàn tiền. Khoản thu được trừ vào tổng chi.',
          'Tab "Trả nợ" ghi lại ai đã chuyển cho ai. Khoản trả nợ không tính vào tổng chi.',
        ],
      },
      {
        id: "exclude",
        title: "Bỏ tính một khoản chi mà không xóa",
        steps: [
          'Ở dòng khoản chi, bấm ⋯ rồi chọn "Bỏ tính". Khoản vẫn nằm trong danh sách nhưng không tính vào tổng chi, số dư, thống kê và CSV.',
          'Muốn tính lại, bấm ⋯ rồi chọn "Tính lại".',
          "Khoản trả nợ không bỏ tính được.",
        ],
      },
      {
        id: "photos",
        title: "Ảnh hóa đơn",
        steps: [
          'Khi thêm hoặc sửa khoản chi, mở "Ảnh hóa đơn" để đính kèm ảnh.',
          'Mục "Ảnh" của cuộc chơi chứa tất cả ảnh, tối đa 60 ảnh mỗi cuộc. Bấm vào ảnh để xem to và sửa chú thích.',
        ],
      },
      {
        id: "edit-delete",
        title: "Sửa và xóa khoản chi",
        steps: [
          'Ở dòng khoản chi, bấm ⋯ rồi chọn "Sửa" hoặc "Xóa".',
          'Xóa xong có thông báo ngắn kèm nút "Hoàn tác" để lấy lại ngay.',
        ],
      },
    ],
  },
  {
    id: "manage",
    title: "Quản lý và công cụ phụ",
    topics: [
      {
        id: "close-reopen",
        title: "Đóng và mở lại cuộc chơi",
        steps: [
          "Cuộc chơi tự đóng khi mọi số dư về 0, và tự mở lại nếu số dư lệch trở lại.",
          'Bấm "Đóng" để đóng tay. Đóng tay thì giữ nguyên dù còn nợ.',
          'Cuộc đã đóng nằm ở thẻ "Đã đóng" ở thanh bên. Bấm Xem rồi "Mở lại" để chơi tiếp.',
        ],
      },
      {
        id: "monthly",
        title: "Lọc theo tháng và xuất CSV",
        steps: [
          'Ở thẻ "Đã đóng", bấm Xem rồi chọn tháng ở ô lọc.',
          'Bấm "Tải CSV" để lấy tổng chi, tổng theo danh mục, người đã chi và phần phải chịu của tháng đó.',
          "CSV chỉ tính các cuộc chơi do bạn tạo, tối đa 20 cuộc mỗi tháng.",
        ],
      },
      {
        id: "history-trash",
        title: "Lịch sử, thùng rác và nhân bản",
        steps: [
          'Mục "Lịch sử" (bấm Xem) cho xem lại các thay đổi. Một số thao tác, như xóa khoản chi, hoàn tác được.',
          'Xóa cuộc chơi sẽ đưa vào "Thùng rác" và giữ 30 ngày. Bạn có thể khôi phục hoặc xóa hẳn.',
          'Biểu tượng "Nhân bản" ở thẻ cuộc chơi tạo cuộc mới với cùng người và tài khoản, không có khoản chi.',
        ],
      },
      {
        id: "header-buttons",
        title: "Các nút trên header",
        steps: [
          "Logo: về trang chủ, xem các khoản cần tất toán gộp từ nhiều cuộc.",
          "Kho cầu: ghi số cầu nhập vào hoặc đã dùng, có lịch sử, không cho kho âm hoặc vượt trần.",
          "Thống kê vui: tổng chi, người trả nhiều nhất, khoản chi lớn nhất và ngày hay chơi nhất, gộp các cuộc đang chơi.",
          "Cài đặt: đổi tên hiển thị và tạo token MCP để dùng với Claude.",
          "Nút ☀: đổi giao diện sáng hoặc tối. Nút Thoát: đăng xuất.",
        ],
      },
    ],
  },
];
