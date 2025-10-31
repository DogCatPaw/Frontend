// src/lib/api/config.ts

/**
 * API Base URL with fallback
 * 환경변수가 없을 때 프로덕션 URL을 fallback으로 사용
 *
 * Ingress 동작 방식:
 * - 프론트엔드: http://puppypaw.site/api/adoption/home
 * - Ingress: /api/adoption/home (그대로 전달, prefix 제거 안함!)
 * - NestJS 백엔드 실제 경로: /api/adoption/home ✅
 *
 * 따라서 BASE_URL에 /api를 포함하지 않음!
 */

// 클라이언트(브라우저)용 - 외부 도메인 (/api prefix 제외!)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://puppypaw.site';

// 서버(SSR/Server Action)용 - 쿠버네티스 내부 서비스 (/api prefix 제외!)
export const API_BASE_URL_INTERNAL = process.env.API_BASE_URL_INTERNAL || 'http://dogcatpaw-api-gateway-service';

/**
 * Helper function to build full API URL
 * - 서버 사이드: 쿠버네티스 내부 서비스 URL 사용
 * - 클라이언트: 외부 도메인 URL 사용
 *
 * path는 항상 /api/... 형태로 시작해야 함
 * 예: getApiUrl('/api/adoption/home') → http://puppypaw.site/api/adoption/home
 */
export function getApiUrl(path: string): string {
  // path가 이미 전체 URL인 경우 그대로 반환
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // path가 /로 시작하지 않으면 추가
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // SSR vs CSR 감지: typeof window === 'undefined'이면 서버 사이드
  const isServer = typeof window === 'undefined';
  const baseUrl = isServer ? API_BASE_URL_INTERNAL : API_BASE_URL;

  return `${baseUrl}${normalizedPath}`;
}
