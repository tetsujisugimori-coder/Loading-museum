import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DIGITAL MOTION ARCHIVE",
  description:
    "ローディング、カーソル、起動画面、UIアニメーションなど、デジタル上の動きの歴史を収集・再現するアーカイブ。",
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
