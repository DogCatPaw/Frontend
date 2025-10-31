import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.siteFooter} aria-label="사이트 푸터">
      <div className={styles.inner}>
        <p>© 2025 멍멍포. 모든 동물이 사랑받는 세상을 만들어가겠습니다.</p>
      </div>
    </footer>
  );
}
