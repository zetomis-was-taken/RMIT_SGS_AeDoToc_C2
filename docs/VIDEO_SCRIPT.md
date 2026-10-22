# Kịch bản video demo (2:00) — Citizen Consent Quorum

Định dạng: 1920×1080, 30 fps, 3600 frame. Lời đọc tiếng Anh (~290 từ, ~145 từ/phút).
Nguồn hình: **[R]** = cảnh dựng bằng Remotion (motion graphic). **[S]** = quay màn hình app (`npm run dev`, 1920×1080, zoom trình duyệt 125%).
Xuất `demo.mp4` H.264, CRF ~23, mục tiêu < 30 MB (giới hạn GitHub là 100 MB).

---

## 1. The possibility — 0:00–0:20 (frame 0–600)

| Thời gian | Hình | Chữ trên màn hình | Lời đọc (VO) |
|---|---|---|---|
| 0:00–0:06 | [R] Một công dân đứng giữa 3 quầy cơ quan, giấy tờ bay qua lại, mỗi quầy bắt nộp lại. | "Same paperwork. Every office." | "Every time a citizen applies for help, they hand the same documents to office after office." |
| 0:06–0:14 | [R] Hai khối "Agency A" ↔ "Agency B" nối bằng đường dữ liệu, ổ khóa ở giữa có 3 khe. | **Citizen Consent Quorum** | "We built Citizen Consent Quorum: agencies share citizen records, but a record opens only when the officer, a supervisor and the citizen all approve." |
| 0:14–0:20 | [S] Landing page `/`, bật lần lượt 3 công tắc của vault, cửa mở. | "Officer + Supervisor + Citizen" | "Three keys. No one opens it alone." |

## 2. The constraint — 0:20–0:38 (frame 600–1140)

| Thời gian | Hình | Chữ | VO |
|---|---|---|---|
| 0:20–0:30 | [R] Biểu tượng Admin và DBA phát sáng đỏ, tay chạm thẳng vào tủ hồ sơ. | "Insiders hold the keys." | "Today, sharing means trusting the other agency's admins. Any administrator can rewrite the access rules. Any DBA can read the database." |
| 0:30–0:38 | [R] Mũi tên chia sẻ dữ liệu co lại thành một chấm nhỏ. | "So agencies share almost nothing." | "So agencies share as little as possible, and citizens pay for it." |

## 3. The prototype — 0:38–1:40 (frame 1140–3000)

Quay theo trang `/app/demo` (Guided demo). Mỗi đoạn [S] thêm nhãn persona góc trên trái và highlight vùng kết quả bằng Remotion.

| Thời gian | Hình | Chữ | VO |
|---|---|---|---|
| 0:38–0:48 | [S] Officer An mở `/app/cases/C-1002`, bấm "Open anyway" → thẻ đỏ `OUT_OF_SCOPE`. | Attack 1: wrong officer | "Attack one. Officer An tries a case that isn't his. A role check would let him in. The policy says no." |
| 0:48–0:58 | [S] Admin Dung ở `/app/policy`: "Propose assignment" → "Approve my own" → `SELF_APPROVAL_BLOCKED`, trạng thái pending. | Attack 2: admin self-escalation | "Attack two. The admin grants himself access. TideCloak's change-request quorum keeps it pending: he can't approve his own change." |
| 0:58–1:05 | [S] Terminal `node scripts/dba-read.mjs` → các cột `enc:v1:…`. | Attack 3: direct DB read | "Attack three. The DBA reads the database directly. Ciphertext only." |
| 1:05–1:10 | [R] Chuyển cảnh: "Now the legitimate flow." | | "Now the real flow." |
| 1:10–1:25 | [S] An bấm "Request access" trên C-1001 (`LOCKED_NO_CONSENT`) → Supervisor Chi approve (1/2) → Citizen Hoa approve → granted, 15 phút. | Officer → Supervisor → Citizen | "An asks. His supervisor approves; that isn't enough. Hoa, the citizen, approves, and a fifteen-minute window opens." |
| 1:25–1:32 | [S] An bấm "Open record": tên, ID, thu nhập, địa chỉ hiện ra; Health = withheld. | Only what the purpose needs | "The record opens, with only the fields this purpose needs." |
| 1:32–1:40 | [S] `/app/tide`: token đã decode, 3 ORK, policy đã ký. Highlight "key split across 3 ORKs". | TideCloak: keys no admin holds | "Underneath, TideCloak splits the keys across independent nodes. No admin, agency or insider ever holds a whole one." |

## 4. What changes — 1:40–2:00 (frame 3000–3600)

| Thời gian | Hình | Chữ | VO |
|---|---|---|---|
| 1:40–1:48 | [S] Agency B bấm "Get result" → "Income eligible: yes". | One fact, not the file | "Agency B asks one question and gets one answer: income eligible, yes. Never the file." |
| 1:48–1:54 | [S] `/app/audit`, lọc Denied, "Verify chain" → "Chain intact". | Every attempt recorded | "Every attempt is logged in a chain that can't be quietly edited." |
| 1:54–2:00 | [R] Logo + tên dự án + "Built with TideCloak" + link repo. | Citizen Consent Quorum · Built with TideCloak | "Citizens approve once. Agencies finally share. Insiders can't cheat." |

---

## Ghi chú dựng (Claude + Remotion + skill edit video)

1. **Quay màn hình trước**: reset dữ liệu (Security lab → Reset demo data), quay từng đoạn [S] thành file riêng `s1_vault.mp4`, `s3_attack1.mp4`… để Remotion ghép bằng `<OffthreadVideo>` trong `<Series>`.
2. **Lời đọc**: thu giọng thật hoặc TTS, mỗi phần một file; lấy độ dài thật rồi chỉnh `durationInFrames` từng `<Series.Sequence>`. Phụ đề sinh bằng skill `remotion-captions` (whisper) từ file VO.
3. **Màu**: dùng token màu của app (xanh Tide `#2727e6`, đỏ cho violation, xanh lá cho granted) để cảnh [R] khớp với cảnh [S].
4. **Âm thanh**: nhạc nền -24 LUFS, duck khi có lời; tiếng "deny" nhẹ ở 3 attack, tiếng "unlock" khi record mở. Chuẩn hóa cả bài -14 LUFS.
5. **Kiểm tra**: tổng đúng 120 s; đọc thử VO cùng hình, cắt bớt chữ nếu lố. Xuất bằng `npx remotion render`, đặt `demo.mp4` ở gốc repo, cập nhật mục "Demo video" trong README.
