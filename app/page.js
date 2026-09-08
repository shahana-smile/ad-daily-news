import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let data = null;
  try {
    data = await redis.get("daily-news");
  } catch (e) {
    data = null;
  }

  return (
    <main
      style={{
        fontFamily: "-apple-system, sans-serif",
        maxWidth: 640,
        margin: "0 auto",
        padding: "28px 20px 60px",
        color: "#17181A",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
        自動運転デイリーニュース
      </h1>
      <p style={{ fontSize: 13, color: "#6B6B68", marginBottom: 20 }}>
        Googleニュースから自動運転関連の最新ニュースを毎日自動取得します(最小構成版)。
      </p>

      {!data && (
        <div
          style={{
            border: "1px solid #EEEEEC",
            borderRadius: 10,
            padding: 16,
            fontSize: 13,
            color: "#6B6B68",
          }}
        >
          まだニュースが取得されていません。ブラウザで
          <code style={{ background: "#F5F5F4", padding: "2px 6px", borderRadius: 4 }}>
            /api/fetch-news
          </code>
          を開いて、1回手動で取得してみてください。
        </div>
      )}

      {data && (
        <>
          <p style={{ fontSize: 11.5, color: "#9A9A97", marginBottom: 14 }}>
            最終更新: {new Date(data.updatedAt).toLocaleString("ja-JP")}
          </p>
          {data.items.map((n, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #EEEEEC",
                borderRadius: 12,
                padding: "16px 18px",
                marginBottom: 12,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.05)",
                background: "#fff",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.5 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: "#9A9A97", marginTop: 6 }}>
                {n.source} ／ {n.date}
              </div>
              {n.link && (
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    marginTop: 10,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "#D6222A",
                    textDecoration: "none",
                  }}
                >
                  元記事を読む →
                </a>
              )}
            </div>
          ))}
        </>
      )}
    </main>
  );
        }
