import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "デジタルアニメーションミュージアム | Digital Animation Museum",
  description:
    "ローディング画面やカーソルなど、画面上のデジタルアニメーションの歴史と操作感をブラウザで体験するミュージアム。",
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
