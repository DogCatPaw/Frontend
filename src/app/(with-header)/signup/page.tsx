import SignupForm from "./SignupForm";

/**
 * 회원가입 페이지 (서버 컴포넌트)
 * - 정적 레이아웃만 제공
 * - 실제 회원가입 로직은 SignupForm (클라이언트 컴포넌트)
 */
export default function SignupPage() {
  return <SignupForm />;
}
