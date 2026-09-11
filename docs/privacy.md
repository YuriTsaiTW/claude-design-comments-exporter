# Privacy Policy for Comments Exporter for Claude Design

Last updated: 2026-09-11

## Summary

This extension does not collect, store, or transmit any personal data to the developer or to any third party. Everything it does happens inside your browser.

## What the extension accesses

When you click the extension button on a Claude Design project page (`https://claude.ai/design/p/…`) and choose to export, the extension:

- reads the URL of the current tab to find the project id (only on `claude.ai`);
- asks Claude Design, using your existing signed-in session, for the project's official export archive and the list of comments on the project;
- processes those files in memory to add `comments.json`, `comments.md`, and `data-comment-id` markers;
- hands the resulting zip file to Chrome's download manager.

The requests go only to `https://claude.ai`, the same service you are already signed in to. No data is sent anywhere else.

## What is stored

Only the progress of the current export (status text and, when finished, the file name and a count of comments) is kept in Chrome's session storage so the popup can show it. It is cleared when you close the browser or start a new export. Nothing is written to sync storage, cookies, or any server.

## Third-party services, analytics, tracking

None. The extension contains no analytics, telemetry, advertising, or crash reporting.

## Your data on your device

The exported zip file is saved wherever Chrome saves downloads. You control and can delete it like any other file.

## Changes

If these practices ever change, this page and the extension's store listing will be updated before the change ships.

## Contact

yuri.hh.tsai@viewsonic.com

---

# 隱私權政策（繁體中文）

最後更新：2026-09-11

**摘要**：本擴充功能不會蒐集、儲存或傳送任何個人資料給開發者或第三方。所有處理都在你的瀏覽器內完成。

**存取內容**：只有在你於 Claude Design 專案頁（`https://claude.ai/design/p/…`）點擊按鈕並選擇匯出時，擴充功能才會讀取當前分頁網址取得專案 id（僅限 `claude.ai`）、以你既有的登入狀態向 Claude Design 取得官方匯出檔與留言清單、在記憶體內加上 `comments.json`、`comments.md` 與 `data-comment-id` 標記，然後交給 Chrome 下載。所有請求只發往 `https://claude.ai`。

**儲存內容**：只有本次匯出的進度（狀態文字、完成後的檔名與留言數）暫存在 Chrome 的 session storage 供 popup 顯示，關閉瀏覽器或重新匯出即清除。不寫入 sync storage、cookie 或任何伺服器。

**第三方服務與追蹤**：無。沒有分析、遙測、廣告或錯誤回報。

**聯絡方式**：yuri.hh.tsai@viewsonic.com
