// ==================== 이미지 src 정규화 유틸 ====================

/**
 * 배열의 첫 번째 요소를 반환하거나 단일 값을 그대로 반환
 */
function pickFirst<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v.length ? v[0] : null;
  return v ?? null;
}

/**
 * next/image가 허용하는 형태로 이미지 src를 정규화
 * @param srcIn - 원본 이미지 src (문자열, 배열, null, undefined)
 * @returns 정규화된 src 또는 null
 */
export function normalizeImageSrc(
  srcIn?: string | string[] | null
): string | null {
  let src = pickFirst(srcIn);
  if (!src) return null;

  // 공백/양끝 따옴표 제거 (e.g. "'123'" -> 123)
  src = src.trim().replace(/^['"]|['"]$/g, "");

  // data URL 허용
  if (/^data:image\//i.test(src)) return src;

  // 절대 URL 허용
  if (/^https?:\/\//i.test(src)) return src;

  // 루트 상대 경로 허용
  if (src.startsWith("/")) return src;

  // 일반적인 상대경로 보정 (예: images/foo.jpg -> /images/foo.jpg)
  if (/^[\w\-./]+$/.test(src)) {
    return "/" + src.replace(/^\/+/, "");
  }

  // 그 외는 사용 불가 → 폴백
  return null;
}
