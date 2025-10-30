import LoginForm from "./LoginForm";
import styles from "./page.module.css";

/**
 * 로그인 페이지 (서버 컴포넌트)
 * - 정적 레이아웃만 제공
 * - 실제 로그인 로직은 LoginForm (클라이언트 컴포넌트)
 */
export default function LoginPage() {
  return (
    <div className={styles.container}>
      <LoginForm />
    </div>
  );
}
