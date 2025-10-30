import "./globals.css"; // 전역 스타일
import FloatingButton from "@/components/FloatingButton";

export default function NoHeaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <FloatingButton />
    </>
  );
}
