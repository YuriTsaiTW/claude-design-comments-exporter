# Chrome Web Store Listing — Comments Exporter for Claude Design

> Last Updated: 2026-09-11

這份檔案是上架 Chrome Web Store 要填的所有欄位與待辦，開發者後台的每個欄位都從這裡複製。完成一項就把狀態改掉。

## 上架前必做（狀態）

| 項目                                      | 狀態        | 備註                                                                                                                                                                                     |
| ----------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 名稱改成不暗示官方的形式                  | ✅ 已改     | `Comments Exporter for Claude Design`，manifest 與 popup 標題一致                                                                                                                        |
| manifest 描述 ≤ 132 字元                  | ✅ 已改     | 英文，127 字元                                                                                                                                                                           |
| 移除非必要權限 `tabs`                     | ✅ 已移除   | `host_permissions` 涵蓋 `claude.ai`，`tabs.query` 在該網域仍讀得到 `tab.url`；其他網站讀不到，正好當「不是專案頁」。**載入未封裝版本後要實測 popup 在專案頁按鈕可用、在其他頁 disabled** |
| 圖示 128×128                              | ✅ 就緒     | `icons/icon-128.png`，Claude 橘底白色泡泡，不含 Anthropic 商標圖形                                                                                                                       |
| 隱私權政策公開網址                        | ✅ 已上線   | https://yuritsaitw.github.io/claude-design-comments-exporter/privacy.html（GitHub Pages，來源 `main` 的 `docs/`）                                                                        |
| 截圖 1280×800 至少一張                    | ⬜ 未建立   | 需在真實 Claude Design 專案頁截圖，見「截圖規劃」                                                                                                                                        |
| 開發者帳號                                | ⬜ 待辦     | 一次性 5 美元；建議用團隊共用帳號而非個人帳號                                                                                                                                            |
| 打包 zip                                  | ✅ 腳本就緒 | `pnpm build && pnpm package` → `release/…zip`，只含 `dist/`，排除 source map                                                                                                             |
| 確認 Anthropic 使用條款對自動化存取的規定 | ⬜ 待辦     | 本工具以使用者自己的登入身分呼叫 Claude Design 未公開的內部端點；公開上架前先確認條款，或先選「不公開」                                                                                  |

## Store Listing

**Extension Name** [REQUIRED]

Comments Exporter for Claude Design

**Short Description** [REQUIRED]（132 字元內）

Download a Claude Design project as a zip with comments.json / comments.md and data-comment-id marks on the commented elements.

**Detailed Description** [REQUIRED]

Comments Exporter for Claude Design adds one button to Claude Design project pages: download the project's official export together with every comment left on it.

What you get
The same zip file Claude Design's own Download produces, plus two extra files at the root. comments.json lists every comment (including resolved ones) with the page it belongs to, the element it points at, the author, time, replies, and whether the element could be located in the exported page. comments.md is a readable version of the same list, grouped by page. Inside each exported page, the element a comment points at is marked with a data-comment-id attribute, so anyone opening the export can find exactly what the comment was about. Nothing else in the export is changed.

How to use it

1. Open a Claude Design project you have access to (claude.ai/design/p/…).
2. Click the extension icon and press "Download zip + comments".
3. You can close the popup; the export continues in the background and Chrome downloads <project>-with-comments.zip when it is done.

Privacy
The extension works entirely inside your browser with your existing Claude Design sign-in. It only talks to claude.ai, never to the developer or anyone else, and it has no analytics or tracking. See the privacy policy for details.

Notes
This is an independent tool and is not affiliated with or endorsed by Anthropic. It relies on how Claude Design currently exports projects and stores comments; if Claude Design changes, an update will be needed. Comments left on interactive prototypes while a non-default screen was showing may be marked as "ambiguous" with all candidate elements tagged, so a reviewer can pick the right one.

Support
Report problems or ask questions at the project's GitHub issues page (URL below).

**Detailed Description（繁體中文，另一語系）**

在 Claude Design 專案頁多一顆按鈕：下載官方匯出檔，並把專案上所有留言一起帶走。

會拿到什麼
與 Claude Design 自己的 Download 相同的 zip，根目錄多兩個檔案。comments.json 列出每一則留言（含已解決），包括所屬頁面、指向的元素、作者、時間、回覆，以及是否在匯出頁面裡找得到該元素。comments.md 是同一份資料依頁面分組的可讀版本。每個匯出頁面裡，留言指向的元素會標上 data-comment-id 屬性，打開匯出檔的人能直接找到留言在說哪裡。其他內容完全不動。

使用方式

1. 開啟你有權限的 Claude Design 專案（claude.ai/design/p/…）。
2. 點擴充功能圖示，按「下載 zip + comments」。
3. 可以關掉 popup，匯出在背景繼續，完成後 Chrome 會下載 <專案名>-with-comments.zip。

隱私
全部在你的瀏覽器內、用你既有的 Claude Design 登入完成。只連線 claude.ai，不會傳給開發者或任何人，沒有分析或追蹤。

說明
本工具為獨立開發，與 Anthropic 無關、亦未經其背書。它依賴 Claude Design 目前的匯出格式與留言儲存方式，Claude Design 改版時需要更新。在互動原型的非預設畫面留下的留言可能被標為「多候選」，所有候選元素都會標記，由審閱者判斷。

**Category** [REQUIRED]

Developer Tools

**Single Purpose** [REQUIRED]

Downloads a Claude Design project export together with its comments, marking the commented elements in the exported HTML.

**Primary Language** [REQUIRED]

English（另加 Traditional Chinese 語系）

## Graphics & Assets

| Asset                          | Dimensions  | Status         | Filename                                                                      |
| ------------------------------ | ----------- | -------------- | ----------------------------------------------------------------------------- |
| Store Icon [REQUIRED]          | 128×128 PNG | ✅ Ready       | `store-assets/store-icon-128.png`（圖形 96×96 置中、16px 透明邊，依商店建議） |
| Screenshot 1 [REQUIRED]        | 1280×800    | ⬜ Not created | `store-assets/screenshot-1-popup.png`                                         |
| Screenshot 2 [RECOMMENDED]     | 1280×800    | ⬜ Not created | `store-assets/screenshot-2-result.png`                                        |
| Screenshot 3 [RECOMMENDED]     | 1280×800    | ⬜ Not created | `store-assets/screenshot-3-marked-html.png`                                   |
| Small Promo Tile [RECOMMENDED] | 440×280     | ⬜ Not created | `store-assets/promo-small.png`                                                |
| Marquee Promo Tile             | 1400×560    | ⬜ Not created |                                                                               |

### 截圖規劃

1. Claude Design 專案頁開著、popup 打開、按鈕可用的畫面（idle 狀態）。用有留言的專案，畫布上看得到留言圖釘。
2. 匯出完成的 popup（success 狀態）與 Chrome 下載列。
3. 解壓後的 `comments.md` 與被標上 `data-comment-id` 的 HTML 並排（編輯器截圖）。

截圖裡不要出現他人姓名、真實客戶內容，用測試專案。視窗設成 1280×800 再截，不要事後縮放。

## Permissions Justification

| Permission            | Type             | Justification                                                                                                                                                                                                                                                 |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `downloads`           | permissions      | Saves the generated `<project>-with-comments.zip` to the user's download folder after the user clicks "Download zip + comments". Used for nothing else.                                                                                                       |
| `storage`             | permissions      | Keeps the progress of the current export (status text, final file name, comment counts) in `chrome.storage.session` so the popup can be closed and reopened while the export runs in the background. Cleared when the browser closes. No sync storage.        |
| `https://claude.ai/*` | host_permissions | Needed to (1) read the current tab's URL on claude.ai to find the project id, and (2) request the project's official export archive and its comment list from Claude Design using the user's existing sign-in. The extension makes requests to no other host. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

The extension reads project content and comments from claude.ai on the user's request, processes them in memory, and writes the result to a local file. Nothing is transmitted off-device except the requests to claude.ai itself, which use the user's own session.

| Data Type                    | Collected? | Transmitted Off-Device? | Purpose                                                                                              | Shared with Third Parties? |
| ---------------------------- | ---------- | ----------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------- |
| Personally identifiable info | No         | No                      | —                                                                                                    | No                         |
| Health info                  | No         | No                      | —                                                                                                    | No                         |
| Financial info               | No         | No                      | —                                                                                                    | No                         |
| Authentication info          | No         | No                      | Existing claude.ai cookies are sent by the browser to claude.ai only; the extension never reads them | No                         |
| Personal communications      | No         | No                      | Comment text is read from claude.ai and written into the local zip only                              | No                         |
| Location                     | No         | No                      | —                                                                                                    | No                         |
| Web history                  | No         | No                      | Only the current tab URL on claude.ai is read, at the moment the popup opens                         | No                         |
| User activity                | No         | No                      | —                                                                                                    | No                         |
| Website content              | No         | No                      | Project export and comments are processed locally into the downloaded zip                            | No                         |

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]

https://yuritsaitw.github.io/claude-design-comments-exporter/privacy.html

來源是 `docs/privacy.md`，由 GitHub Pages 發佈，已驗證回 200。

## Distribution

**Visibility**: Unlisted（建議先不公開，只給拿到連結的人；確認 Anthropic 條款與 Claude Design 改版頻率後再考慮 Public）
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED]：待定（建議用團隊名稱，不用個人）

**Contact Email** [REQUIRED]：yuri.hh.tsai@viewsonic.com（會公開顯示，可改成團隊信箱）

**Support URL / Email** [RECOMMENDED]：https://github.com/YuriTsaiTW/claude-design-comments-exporter/issues

**Homepage URL** [RECOMMENDED]：https://github.com/YuriTsaiTW/claude-design-comments-exporter

## 提交步驟

1. `pnpm build && pnpm package`，確認 `release/` 的 zip 只含 `dist/` 內容、沒有 `.map`。
2. 在 `chrome://extensions` 載入未封裝的 `dist/`，實測：專案頁按鈕可用、非 claude.ai 頁 disabled、關掉 popup 後匯出仍完成、下載檔案可解壓。
3. 上傳 zip，逐欄貼上本檔內容，勾資料揭露表單（全部 No），填隱私政策網址。
4. 選 Unlisted，送審。

## Version History

| Version | Date       | Changes                                                                       | Status |
| ------- | ---------- | ----------------------------------------------------------------------------- | ------ |
| 0.1.0   | 2026-09-11 | 首版：下載官方 zip、加入 comments.json／comments.md、三層元素定位、多候選標記 | Draft  |

## Review Notes

### Known Issues / Limitations

- 依賴 Claude Design 未公開的內部端點與匯出格式，改版即失效；審查員可能要求說明資料來源，描述已寫明「with your existing Claude Design sign-in」。
- 名稱含「Claude Design」是描述用途的必要指涉（nominative use），已避免「Claude Design Comments Exporter」這種像官方產品的排列，並在描述聲明非官方。若審查以商標理由退回，備案名稱：`Design Comments Exporter`。
- 在互動原型非預設畫面留下的留言可能標成多候選，屬已知限制，描述已說明。

### Rejection History

（尚無）
