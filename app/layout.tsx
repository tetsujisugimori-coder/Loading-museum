import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "世界のローディング画面博物館",
  description:
    "CUIの回転文字からスケルトンスクリーンまで、9種類のローディング表現を動く展示でたどるデジタル博物館。",
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
