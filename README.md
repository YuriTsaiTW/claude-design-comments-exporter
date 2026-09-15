<p align="center"><img src="icons/icon-128.png" width="96" height="96" alt=""></p>

# Comments Exporter for Claude Design

讓 Claude Design 的匯出檔自帶留言。

## 解決什麼問題

Claude Design 的 Download 只給頁面，留言留在雲端。沒有專案權限的人拿到檔案，看不到設計師留了什麼，更不知道留言指的是畫面上哪一塊。這個 Chrome 擴充功能在專案頁多一顆按鈕，下載同一份官方 zip，並多給你三樣東西：

- `comments.json`：全部留言（含已解決），每則記錄所屬頁面、指向的元素、作者、時間、回覆
- `comments.md`：同一份資料依頁面分組，直接可讀
- 留言指向的元素在頁面 HTML 裡標上 `data-comment-id`，其他內容一個位元組都不動

## 使用

1. 到 [Chrome Web Store](https://chromewebstore.google.com/detail/fipkmheaflhlajpajmpppcjmpodabofi) 安裝。安裝時若看到「安全瀏覽強化防護功能不信任這個擴充功能」，那是新開發者帳號的通用標記，不是審查結果；按「繼續安裝」即可，程式碼全部公開在這個 repo
2. 開啟你有權限的 Claude Design 專案頁（`claude.ai/design/p/…`）
3. 點工具列圖示，按「下載 zip + comments」。popup 可以關掉，匯出在背景繼續
4. 拿到 `<專案名>-with-comments.zip`

只用你瀏覽器裡既有的 claude.ai 登入，不需要任何 API key，不連線到 claude.ai 以外的地方。

想用開發中的版本，`pnpm build` 後在 `chrome://extensions` 開啟開發人員模式、載入未封裝項目選 `dist/`。

## 三個難題

- **留言指的位置是「畫面上」的位置，匯出檔卻是模板。** 一個檔案裡同時寫著好幾個畫面狀態，直接對位置會數錯。工具先把模板展開成畫面會長的樣子，對到之後再映射回原始碼那一行。
- **設計師可能切到別的畫面才留言，而留言沒記錄當時的狀態。** 工具把該層所有可能的狀態列出來，用留言附帶的文字片段篩；還是分不出來就把每個候選都標上並註明「多候選」，讓看的人依留言內容判斷。誠實標出不確定，比猜錯好。
- **怎麼確定沒猜錯。** 拿真實專案的真實留言當回歸測試，工具算出「第幾行的哪個元素」，由專案負責人對照畫面確認。兩種不同定位法的留言都答對才算數。

## 已知限制

- 依賴 Claude Design 目前的匯出格式與內部 API，改版可能失效
- 沒有文字的元素（圖示、純容器）在多個畫面狀態下結構相同時，會標成多候選
- 存檔走 `data:` URL，zip 超過數十 MB 時記憶體佔用明顯上升

## 開發

需要 Node 24（`nvm use`）與 pnpm 9.15.1。沒有環境變數。

```bash
pnpm install
pnpm build            # 型別檢查 + 建置到 dist/
pnpm test:coverage    # Vitest，核心模組覆蓋率門檻 80%
pnpm lint
pnpm package          # 打包成上架用 zip 到 release/
```

留言透過 Claude Design 的 `ListComments` 端點以 JSON 取得，官方 zip 走 `…/projects/{id}/download`；元素定位用 parse5 加 css-select，只插入屬性不重新序列化；`data-dc-tpl` 錨點依 support.js 的前序編號規則還原；`data-comment-anchor` 沒被匯出時，改用留言描述裡的 `data-om-id` 序號（來源檔前序序號）加上描述的標籤、位置與子元素比對。細節見程式碼註解與 `tests/`。

上架 Chrome Web Store 的欄位與待辦見 [`CHROMEWEBSTORE.md`](CHROMEWEBSTORE.md)，隱私權政策見 [docs/privacy.md](docs/privacy.md)。本工具為獨立開發，與 Anthropic 無關。
