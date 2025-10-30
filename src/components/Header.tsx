"use client";

import styles from "./Header.module.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const navItems = [
    { href: "/", label: "소개하기" },
    { href: "/main", label: "홈" },
    { href: "/adopt", label: "입양" },
    { href: "/donation", label: "후원" },
    { href: "/shelter", label: "보호소" },
    { href: "/story", label: "스토리" },
    { href: "/review", label: "입양 후기" },
    { href: "/chat", label: "채팅" },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <h2 className={styles.logo}>멍냥Paw🐾</h2>
        <nav className={styles.userNav}>
          {/* 로그인 상태가 아닐 때만 지갑 연결 버튼 표시 */}
          {!isAuthenticated && (
            <div className={styles.walletButton}>
              <ConnectButton
                chainStatus="icon"
                showBalance={false}
                accountStatus={{
                  smallScreen: "avatar",
                  largeScreen: "full",
                }}
              />
            </div>
          )}
          {isLoading ? (
            // 로딩 중에는 아무것도 표시하지 않음 (깜빡임 방지)
            <div style={{ width: "120px" }}></div>
          ) : !isAuthenticated ? (
            <>
              <Link href="/login">로그인</Link>
              <Link href="/signup">회원가입</Link>
            </>
          ) : (
            <>
              <button onClick={handleLogout} className={styles.logoutBtn}>
                로그아웃
              </button>
              <Link href="/mypage" className={styles.userBox}>
                <strong>{user?.guardianInfo?.name || "사용자"}님</strong>
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className={styles.divider}></div>

      <nav className={styles.mainNav}>
        {navItems.map((item) => {
          // "/" 는 정확히 일치해야 활성화
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href} data-active={isActive}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
