import MainClient from "./MainClient";

/**
 * 메인 페이지 (서버 컴포넌트)
 * - 즉시 렌더링 (데이터 대기 없음)
 * - 클라이언트에서 Server Action으로 데이터 로드
 * - 빠른 페이지 전환, 점진적 로딩
 */
export default function MainPage() {
  return <MainClient />;
}
