"use client";

import styles from "./FloatingButton.module.css";
import Link from "next/link";

export default function FloatingButton() {
  return (
    <Link href="/pet/register" className={styles.floating}>
      DID<br/>발급
    </Link>
  );
}