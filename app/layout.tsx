import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "世界のローディング画面博物館",
  description:
    "9種類のローディング表現と、時代別展示室で待機画面の歴史をたどるデジタル博物館。",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#050807",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
