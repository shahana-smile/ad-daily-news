export const metadata = {
  title: "自動運転デイリーニュース",
  description: "自動運転関連の最新ニュースを毎日自動で取得する最小構成アプリ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, background: "#FAFAF9" }}>{children}</body>
    </html>
  );
}
