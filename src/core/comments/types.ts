/** 留言回覆（已正規化）。 */
export interface Reply {
  replyId: string;
  author: string;
  authorAccountUuid: string | null;
  body: string;
  createdAt: string;
}

/** 留言可能對應的來源元素位置（來源檔行號）。 */
export interface AnchorCandidate {
  tag: string;
  line: number;
}

/**
 * 已正規化的留言。`anchored` 與 `candidates` 不是 API 欄位，由 injectCommentIds 回填：
 * - anchored true：唯一命中，已標 data-comment-id
 * - candidates 多於一個：多個狀態下都可能是它，每個候選都標了 data-comment-id 與 data-comment-ambiguous
 * - candidates 為空：比對不到
 */
export interface Comment {
  commentId: string;
  projectId: string | null;
  filePath: string;
  elementSelector: string | null;
  elementDescriptor: string;
  pinX: number | null;
  pinY: number | null;
  body: string;
  author: string;
  authorAccountUuid: string | null;
  createdAt: string;
  resolvedAt: string | null;
  replies: Reply[];
  anchored: boolean;
  candidates: AnchorCandidate[];
}

/** Connect JSON 回應（proto3 JSON mapping，camelCase，預設值會被省略）。 */
export interface RawListCommentsResponse {
  comments?: unknown[];
  commentsReadAt?: string;
}
