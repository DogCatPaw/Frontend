"use client";

import styles from "./main-list-skeleton.module.css";

export default function MainListSkeleton() {
    return (
        <article className={styles.container} aria-busy="true">
            {/* 이미지 자리 */}
            <div className={`${styles.block} ${styles.image} ${styles.shimmer}`} />

            {/* 본문 */}
            <div className={styles.body}>
                {/* 제목 */}
                <div className={`${styles.block} ${styles.line} ${styles.shimmer}`} />

            </div>
        </article>
    );
}
