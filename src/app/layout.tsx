import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletProvider";

export const metadata: Metadata = {
  title: "멍냥Paw - 모든 동물이 사랑받는 세상을 위하여",
  description:
    "DID를 통해 유기동물의 존재를 기록하고 입양과 후원을 연결하는 플랫폼",
  keywords: ["유기동물", "입양", "후원", "DID", "블록체인", "반려동물"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
