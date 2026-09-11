# claude-design-comments-exporter

Chrome 擴充功能（Manifest V3），商店名稱 **Comments Exporter for Claude Design**：在 Claude Design 專案頁面一鍵下載官方匯出 zip，並額外加入

- `comments.json`：專案全部留言（含已解決），每則記錄所屬頁面、元素選擇器、元素描述、pin 座標、作者、時間、回覆與 `anchored` 旗標
- `comments.md`：依頁面分組的可讀版本
- 留言關聯到的元素在對應的 `*.dc.html` 內標上 `data-comment-id="<id1> <id2>"`（同一元素多則留言以空白分隔），其他位元組原樣保留

Claude Design 原生的下載不含留言，沒有專案權限的人拿到靜態檔就對不回留言指的元素。這個工具讓匯出檔自帶留言與錨點。

## 特色：開發時踩到的坑與解法

這個工具的難處不在 Chrome 擴充功能本身，而在 Claude Design 沒有公開文件，所有東西都是實測出來的。以下是遇到的痛點與最後怎麼解決，用白話說。

**痛點 1：匯出檔裡根本沒有留言**

Claude Design 的 Download 只給頁面 HTML 與圖片，留言留在雲端。沒有專案權限的人拿到檔案，看不到留言，更不知道留言指的是哪一塊。
→ 解法：從 Claude Design 的前端程式碼找出它自己讀留言用的 API。它走 ConnectRPC，原本以二進位 protobuf 傳輸，但實測發現同一個端點也接受 JSON，所以擴充功能用你的登入狀態直接要 JSON 回來，不必解 protobuf，也不必多裝任何函式庫。

**痛點 2：留言指的元素，在匯出檔裡找不到**

留言記錄的是「畫面渲染後」的位置，例如「第 2 個 div 底下的第 1 個 div 裡的圖片」。但匯出的 HTML 是模板：一個檔案裡同時寫了好幾個畫面狀態（輸入代碼、選角色、進入班級），執行時只顯示其中一個。直接拿位置去對，數到的是錯的元素，或整個對不到。
→ 解法：先把模板依它自己標的預設值靜態展開成「畫面上會長的樣子」，再去對位置，對到之後再映射回原始碼的那一行。

**痛點 3：設計師可能是切到別的畫面才留言的**

展開預設狀態只能對到預設畫面。設計師如果先點到「輸入代碼」那一步再留言，位置就指向另一張卡片，而留言本身沒有記錄當時在哪個狀態。
→ 解法：把該層所有可能的狀態都列出來（每個分支開或關、清單重複幾次），收集所有可能的元素。多於一個時，用留言描述裡附帶的文字片段去篩；還是分不出來，就把留言 id 標在每一個候選上，另加一個「多候選」記號，讓看檔案的人依留言內容判斷。誠實標出不確定，比猜錯好。

**痛點 4：有些留言用的是另一種定位法**

第二則真實留言的定位不是路徑，而是 `data-dc-tpl="643"` 這種編號，匯出檔裡完全沒有這個屬性。
→ 解法：匯出檔附的 support.js 就是 Claude Design 的執行期程式，讀它的原始碼發現這是「對模板元素從 0 開始依序編號」，規則很單純。用同樣規則對匯出檔編一次號，643 就對到了。連文字裡的 `{{ 變數 }}` 在畫面上會多包一層 `span` 這件事也一併照做，位置才不會差一格。

**痛點 5：改了 HTML，但一個位元組都不能多動**

匯出檔要拿去比對與審閱，如果工具重新排版整份 HTML，diff 會滿江紅，沒人看得出真正改了什麼。
→ 解法：用帶原始碼位置資訊的解析器找到元素的開始標籤，只在那個位置插入一個屬性，其餘原樣保留。每個測試都驗證「把插入的屬性拿掉後，與原檔逐字相同」。

**痛點 6：中文檔名在 zip 裡會變亂碼**

匯出檔的頁面名稱是中文，重新打包時若沒設 zip 的 UTF-8 旗標，其他工具解壓會看到亂碼。
→ 解法：打包後直接讀 zip 的檔頭驗證每個非 ASCII 檔名都有旗標，寫成自動化測試。

**痛點 7：怎麼確定自己沒猜錯**

逆向出來的規則可能只是剛好對上一個案例。
→ 解法：拿真實專案的真實留言當回歸測試：工具算出「這則留言指的是第幾行的哪個元素」，由專案負責人對照 Claude Design 畫面確認。兩則不同定位法的留言都答對後才算數。

## 環境需求

- Node.js 24（用 `nvm` 安裝，repo 有 `.nvmrc`）
- pnpm 9.15.1（`package.json` 的 `packageManager` 已釘版）
- Chrome 116 以上（需要 `chrome.storage.session` 與 MV3 service worker）
- 已在瀏覽器登入 claude.ai，且對目標專案有檢視權限
- 權限只要 `downloads`、`storage` 與 `https://claude.ai/*`；不需要 `tabs`，因為有 host permission 的網域本來就讀得到分頁網址

## 啟動方式

```bash
nvm use
pnpm install
pnpm build          # 型別檢查 + Vite 建置，輸出到 dist/
```

1. 打開 `chrome://extensions`，開啟右上角「開發人員模式」。
2. 點「載入未封裝項目」，選這個 repo 的 `dist/` 目錄。
3. 開啟任一個 Claude Design 專案頁（`https://claude.ai/design/p/<projectId>`）。
4. 點工具列的擴充功能圖示，按「下載 zip + comments」。popup 可以關掉，工作會在 service worker 背景繼續；再打開 popup 會接回進度。
5. 完成後 Chrome 會下載 `<原檔名>-with-comments.zip`。

開發時可用 `pnpm dev` 啟動 Vite（CRXJS 提供 HMR），一樣載入 `dist/`。

其他指令：

```bash
pnpm test              # Vitest
pnpm test:coverage     # 覆蓋率門檻 80%（src/core、popupReducer、exportJob）
pnpm lint
pnpm format
pnpm package           # 打包 dist/ 成上架用 zip 到 release/（排除 source map）
```

上架 Chrome Web Store 的欄位、權限說明、待辦與提交步驟見 [`CHROMEWEBSTORE.md`](CHROMEWEBSTORE.md)；隱私權政策原稿在 [`docs/privacy.md`](docs/privacy.md)。

## 環境變數

無。認證完全依賴瀏覽器既有的 claude.ai session cookie，不需要也不應該提供任何 API key。

## 運作方式

| 步驟         | 呼叫                                                                                                                                                                                                         | 執行位置                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| 下載官方 zip | `GET https://claude.ai/design/v1/design/projects/{projectId}/download`，`credentials: 'include'`，串流讀取並回報進度                                                                                         | service worker           |
| 取得留言     | `POST https://claude.ai/design/anthropic.omelette.api.v1alpha.OmeletteService/ListComments`，Connect 協定 JSON 編碼（`content-type: application/json`、`connect-protocol-version: 1`、body `{"projectId"}`） | service worker           |
| 注入屬性     | `parse5`（帶 source location）＋ `css-select` 定位元素，只在該 start tag 插入／改寫 `data-comment-id`                                                                                                        | service worker（純函式） |
| 重新打包     | `fflate`；非 HTML 的 entry 原封不動；非 ASCII 檔名保留 UTF-8 旗標                                                                                                                                            | service worker           |
| 存檔         | `chrome.downloads.download` 接 `data:application/zip;base64`                                                                                                                                                 | service worker           |

留言的 `elementSelector` 有兩種可能：Claude Design 建立留言時若能把 `data-comment-anchor="…"` 拼接進來源檔，就存 `[data-comment-anchor="…"]`；否則存預覽 DOM 的 CSS 路徑（實測看到的都是這種，形如 `#dc-root > div:nth-child(1) > … > img:nth-child(1)`）。

留言的 selector 也可能是 `#dc-root [data-dc-tpl="643"] :is(span,p,…) > :is(span,p,…)` 這種形式：`data-dc-tpl` 是 support.js 在執行期對模板元素做前序走訪編的流水號（從 0 起算，`helmet` 子樹與 `sc-if`／`sc-for` 本身都占號），工具用同樣規則對來源檔編號；文字裡的 `{{ … }}` 在執行期會變成 `span.sc-interp`，工具在虛擬 DOM 也補上，選到它時映射回所在的來源元素。

定位分三層：

1. **直接比對**：在來源檔上用 selector 找（`data-comment-anchor` 或作者手寫的 selector）。
2. **狀態窮舉＋文字消歧**：把 selector 拆成一段段 `tag:nth-child(n)`，逐層列舉「這一層的子節點在各種互動狀態下會長什麼樣」（`sc-if` 開或關、`sc-for` 從 0 次到需要的序號），收集所有可能對應的來源元素。多於一個候選時，用 `elementDescriptor` 的 `text: "…"` 片段篩選；能篩到唯一就當作命中。
3. **css-select 兜底與候選全標**：拆不成鏈的 selector（含 `data-dc-tpl`、`:is()`、後代選擇器）改在展開後的虛擬 DOM 上用 css-select 找。：仍分不出來的，每個候選元素都標 `data-comment-id`，並加上 `data-comment-ambiguous="<id>"`；`comments.json` 的 `candidates` 列出各候選的標籤與來源檔行號，`comments.md` 標 `(ambiguous: N 個候選，第 … 行)`，由審閱的人依留言內容判斷。

三層都對不到的留言仍會寫進 `comments.json`／`comments.md`，`anchored` 為 `false`、`candidates` 為空，Markdown 標 `(unanchored)`。

## 已知限制

- 留言沒有記錄設計師當時的互動狀態。同一條路徑在不同 `sc-if` 分支指向結構相同的元素時（例如三張卡片各有一顆按鈕），只能靠描述裡的文字片段區分；圖示、純容器分不出來就會標成多候選，需要人看留言內容判斷。
- 狀態列舉每一層最多 512 種組合，超過就只看預設狀態；`sc-for` 最多試到序號或 32 次。
- 存檔走 `data:` URL，zip 超過數十 MB 時記憶體佔用會明顯上升。
- 圖示原稿在 `icons/icon.svg`，PNG 由 Pillow 從 1024px 縮製。
- 匯出檔內部結構與 API 都是逆向 Claude Design 前端 bundle 得到的，Claude Design 改版可能失效。

## 已驗證事實（2026-09-10）

- `ListComments` 端點以 `application/json` 呼叫可用：假 projectId 回 `{"code":"not_found","message":"project not found"}`；`GetMe` 回 200 的 camelCase JSON。
- REST 轉譯路徑 `/design/v1/omelette/projects/{id}/comments` 回 `404 page not found`，未掛載。
- 官方下載端點以假 projectId 回 `Not Found`，路徑存在。
- 真實專案的留言（2026-09-10 實測）`elementSelector` 是預覽 DOM 的 CSS 路徑，不是 `data-comment-anchor`；匯出檔裡也沒有任何 `data-comment-anchor`／`data-om-id`。`elementDescriptor` 另帶 `dom:` 路徑與 `[data-om-id="<hash>:<n>"]`，`<n>` 的編號規則未解，目前不使用。
- 以真實第 10 頁與第 2 頁的真實留言做回歸測試：第 10 頁命中 `uploads/user-document.svg` 那個 `<img>`（第 74 行）；第 2 頁的 `data-dc-tpl="643"` 留言命中等待畫面「1 of 10 answered」的 `<span>{{ waitCountLabel }}</span>`（第 604 行）。

## 依賴安全紀錄

- `fflate` 釘在 0.8.3：CVE-2026-45820（`unzipSync` 解析畸形 ZIP64 無窮迴圈）已修補。
- `css-select` 7.x 相依的 `nth-check`／`css-what` 已在修補版本之後。
- 安裝後 `pnpm audit --prod` 無已知漏洞。
