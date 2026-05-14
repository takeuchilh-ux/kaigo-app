import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "送迎管理システム | マスターズスタッフ株式会社",
  description: "マスターズスタッフ株式会社の送迎管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="h-full bg-gray-50">{children}</body>
    </html>
  );
}
