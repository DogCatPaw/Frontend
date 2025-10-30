"use client";

import styles from "./page.module.css";
import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import {
  getReviewDetail,
  type ServerReviewDetail,
} from "@/lib/api/review/detail";
import {
  getComment,
  type ServerComment,
  postComment,
  type ServerPostComment,
} from "@/lib/api/comment";
import { postLike, type ServerLike } from "@/lib/api/like";
import { BreedCode, BREED_LABEL } from "@/types";
import { getAccessToken } from "@/lib/api/auth";

// ==================== 이미지 src 정규화 유틸 ====================
function normalizeImageSrc(src?: string | null): string | null {
  if (!src) return null;

  // 공백/양끝 따옴표 제거
  const trimmed = src.trim().replace(/^['"]|['"]$/g, "");

  if (!trimmed) return null;

  console.log("🔍 [normalizeImageSrc] Input:", src, "→ Output:", trimmed);

  // S3 URL이나 HTTP URL은 그대로 반환
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // data URL 허용
  if (/^data:image\//i.test(trimmed)) {
    return trimmed;
  }

  // 루트 상대 경로
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  // 일반 상대경로 보정
  if (/^[\w\-./%]+$/.test(trimmed)) {
    return "/" + trimmed.replace(/^\/+/, "");
  }

  // 그 외는 불가 → null
  return null;
}

// (선택) 상대시간 표시 유틸: "2시간 전", "1일 전" 등
function formatRelative(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  return `${day}일 전`;
}

export default function ReviewDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // ========================== API ==========================
  const reviewIdNum = Number(id);

  // -------------------------- 좋아요 버튼 --------------------------
  const [liked, setLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(0);

  const onToggleLike = async () => {
    try {
      const res = await postLike(reviewIdNum);

      if (res.isSuccess) {
        setLiked(res.result.liked);
        setLikeCount(res.result.totalLikes ?? 0);
      } else {
        console.error("좋아요 실패:", res.message);
      }
    } catch (err) {
      console.error("좋아요 요청 중 오류 발생:", err);
    }
  };

  // -------------------------- 상세 데이터 --------------------------
  const [apiItems, setApiItems] = useState<ServerReviewDetail | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setApiError("");

        // Access Token 가져오기
        const accessToken = getAccessToken();

        // 글 상세 정보 가져오기
        const res = await getReviewDetail(Number(id), accessToken || undefined);
        const detail = (res as any).result ?? res;
        setApiItems(detail as ServerReviewDetail);

        // 좋아요 초기값 동기화
        setLiked(!!detail.liked);
        setLikeCount(
          typeof detail.likeCount === "number" ? detail.likeCount : 0
        );
      } catch (e: any) {
        console.error(e);
        setApiError(e?.message ?? "API 호출 실패");
        setApiItems(undefined);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // -------------------------- 댓글 작성 --------------------------
  const [commentText, setCommentText] = useState("");
  const [commentTextError, setCommentTextError] = useState("");

  const handlePostComment = async () => {
    if (!commentText.trim()) return alert("댓글을 입력하세요.");

    try {
      setCommentText(commentText);

      await postComment({
        storyId: reviewIdNum,
        comment: commentText,
      });

      setCommentText("");
      setReloadTrigger((n) => n + 1); // 댓글 등록 후 새로고침 트리거
    } catch (e: any) {
      console.error(e);
      setCommentTextError(e?.message ?? "댓글 등록 실패");
    } finally {
    }
  };

  // -------------------------- 댓글 조회 --------------------------
  const [commentItems, setCommentItems] = useState<ServerComment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  // 댓글 새로고침용 트리거
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setCommentLoading(true);
        setCommentError("");

        // 댓글 첫 페이지
        const { result } = await getComment({ storyId: reviewIdNum, size: 5 });
        setCommentItems(result.commentList);
        setNextCursor(result.nextCursor ?? null);
      } catch (e: any) {
        console.error(e);
        setCommentError(e?.message ?? "댓글 불러오기 실패");
      } finally {
        setCommentLoading(false);
      }
    })();
  }, [reviewIdNum, reloadTrigger]);

  // 댓글 더 보기
  async function loadMoreComments() {
    if (nextCursor == null) return;
    try {
      setCommentLoading(true);
      const { result } = await getComment({
        storyId: reviewIdNum,
        size: 5,
        cursor: nextCursor,
      });
      setCommentItems((prev) => [...prev, ...result.commentList]);
      setNextCursor(result.nextCursor ?? null);
    } catch (e: any) {
      console.error(e);
      setCommentError(e?.message ?? "댓글 더 불러오기 실패");
    } finally {
      setCommentLoading(false);
    }
  }

  // 최대 5장의 이미지 정규화
  const imageList = useMemo(() => {
    if (!apiItems?.images) return [];

    // 쉼표로 구분된 문자열을 배열로 변환
    const imagesStr = typeof apiItems.images === 'string'
      ? apiItems.images
      : String(apiItems.images);

    const imageArray = imagesStr.split(',').map(s => s.trim()).filter(Boolean);

    console.log("🖼️ [Review Detail] Images:", imageArray);

    return imageArray
      .map((s) => normalizeImageSrc(s))
      .filter(Boolean)
      .slice(0, 5) as string[];
  }, [apiItems]);

  return (
    <div className={styles.container}>
      <Link href="/review" className={styles.backButton}>
        ← 목록으로 돌아가기
      </Link>

      {loading && <p>로딩 중...</p>}
      {apiError && !loading && <p style={{ color: "crimson" }}>{apiError}</p>}

      {!apiItems ? null : (
        <article className={styles.card}>
          {/* ─── 프로필 + 이름/날짜) ─── */}
          <header className={styles.reviewHeader}>
            <div className={styles.profile}>
              <span className={styles.authorBadge} aria-hidden="true">
                {apiItems.memberName?.[0] ?? "·"}
              </span>
              <div className={styles.profileText}>
                <strong className={styles.authorName}>
                  {apiItems.memberName}
                </strong>
                <time className={styles.date}>
                  {apiItems.createdAt.slice(0, 10)}
                </time>
              </div>
            </div>
          </header>

          {/* ─── 큰 제목 ─── */}
          <h1 className={styles.title}>{apiItems.title}</h1>

          <div className={styles.petMeta}>
            {apiItems.petName} ・{" "}
            {BREED_LABEL[apiItems.breed as BreedCode]}
          </div>

          {/* 이미지 그리드 (최대 3장) */}
          <section className={styles.imageGallery}>
            {imageList.slice(0, 3).map((src, idx) => (
              <div className={styles.imageItem} key={`img-${idx}`}>
                <img
                  src={src}
                  alt={`${apiItems.title} 이미지 ${idx + 1}`}
                  className={styles.reviewImage}
                  onError={(e) => {
                    console.error("❌ [Image] Failed to load:", src);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ))}
          </section>

          {/* 글 */}
          <section className={styles.bodySection}>
            <p className={styles.content}>{apiItems.content}</p>

            <div className={styles.metaBar}>
              <button
                type="button"
                className={`${styles.likeButton} ${liked ? styles.liked : ""}`}
                onClick={onToggleLike}
                aria-pressed={liked}
                aria-label={liked ? "좋아요 취소" : "좋아요"}
              >
                <span className={styles.heart} aria-hidden="true">
                  {liked ? "❤" : "♡"}
                </span>
                <span className={styles.likeText}>
                  좋아요 {(likeCount ?? 0).toLocaleString()}
                </span>
              </button>

              <div className={styles.commentStat}>
                💬 댓글 {apiItems.commentCount ?? 0}
              </div>
            </div>
          </section>

          <hr className={styles.hr} />

          {/* 댓글 */}
          <section className={styles.commentWrite}>
            <div className={styles.commentHeader}>
              <h2 className={styles.commentTitle}>
                댓글 {apiItems.commentCount ?? 0}개
              </h2>
            </div>

            {/* 댓글 목록 */}
            {commentError && <p style={{ color: "crimson" }}>{commentError}</p>}
            <ul className={styles.commentList}>
              {commentItems.map((c) => (
                <li
                  className={styles.commentItem}
                  key={`c-${c.commentId}-${c.createdAt}`}
                >
                  <div className={styles.commentAvatar}>
                    {c.nickName?.[0] ?? "·"}
                  </div>
                  <div className={styles.commentBody}>
                    <div className={styles.commentMeta}>
                      <span className={styles.commentName}>{c.nickName}</span>
                      <span className={styles.dot}>·</span>
                      <time className={styles.commentDate}>
                        {formatRelative(c.createdAt)}
                      </time>
                    </div>
                    <p className={styles.commentText}>{c.savedComment}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* 댓글 더 보기 */}
            <div style={{ marginTop: 12 }}>
              {commentLoading ? (
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  불러오는 중…
                </span>
              ) : nextCursor != null ? (
                <button className={styles.submitBtn} onClick={loadMoreComments}>
                  댓글 더 보기
                </button>
              ) : commentItems.length > 0 ? (
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  마지막 댓글입니다
                </span>
              ) : null}
            </div>

            {/* 댓글 작성 */}
            <div className={styles.commentEditor}>
              <textarea
                className={styles.commentTextarea}
                placeholder="따뜻한 댓글을 남겨주세요!"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={100}
              />
              <div className={styles.editorFooter}>
                <span className={styles.counter}>{commentText.length}/100</span>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={handlePostComment}
                  disabled={!commentText.trim()}
                >
                  등록
                </button>
              </div>
            </div>
          </section>
        </article>
      )}
    </div>
  );
}
