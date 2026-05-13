import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "介護タクシー管理システム",
  description: "介護タクシーの予約・ルート・利用者管理システム",
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
