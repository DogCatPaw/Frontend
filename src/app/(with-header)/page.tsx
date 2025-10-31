import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";

/**
 * 랜딩 페이지 (서버 컴포넌트)
 * - 정적 콘텐츠만 포함
 * - SEO 최적화
 * - 초기 로딩 속도 개선
 */
export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.text_box}>
        <div className={styles.title}>
          한 마리의 유기동물도,
          <br />
          반려동물도 <span className={styles.highlight}>잊히지 않도록</span>
        </div>
        <div className={styles.description}>
          DID를 통해 유기동물의 존재를 기록하고
          <br />
          입양과 후원을 연결하는 플랫폼
        </div>
        <Link href="/main" className={styles.button}>
          시작하기 →
        </Link>
        <div className={styles.tags}>
          #투명한 기부 ‧ #안전한 입양 ‧ #실시간 소통
        </div>
      </div>

      {/* 카드(그림자/데코) → 흰 프레임 → 이미지 */}
      <div className={styles.imageCard}>
        <span className={`${styles.decorate} ${styles.topRight}`} />
        <span className={`${styles.decorate} ${styles.bottomLeft}`} />

        <div className={styles.imageFrame}>
          <div className={styles.imageWrap}>
            <Image
              src="/images/home.jpg" // public/images/home.jpg
              alt="강아지"
              fill // 부모 크기 채우기
              sizes="(max-width: 900px) 100vw, 520px"
              priority
              className={styles.heroImage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
