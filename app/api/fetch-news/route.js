import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 英語(アメリカ)と日本語(日本)、2つのGoogleニュース検索を使う
const RSS_URL_EN =
  "https://news.google.com/rss/search?q=autonomous+driving&hl=en-US&gl=US&ceid=US:en";
const RSS_URL_JA =
  "https://news.google.com/rss/search?q=%E8%87%AA%E5%8B%95%E9%81%8B%E8%BB%A2&hl=ja&gl=JP&ceid=JP:ja";

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!m) return "";
  return m[1].replace("<![CDATA[", "").replace("]]>", "").trim();
}

function parseRss(xml) {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return itemBlocks.map((block) => ({
    title: extractTag(block, "title"),
    link: extractTag(block, "link"),
    pubDate: extractTag(block, "pubDate"),
    source: extractTag(block, "source"),
  }));
}

async function fetchAndParse(url, lang) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ADDailyNewsBot/0.1)" },
  });
  if (!res.ok) throw new Error("RSS fetch failed (" + lang + "): " + res.status);
  const xml = await res.text();
  const items = parseRss(xml);
  return items.slice(0, 3).map((it) => ({
    title: it.title || "(タイトル不明)",
    source: it.source || "不明",
    date: it.pubDate || "不明",
    link: it.link || "",
    lang,
  }));
}

export async function GET() {
  try {
    const [jaItems, enItems] = await Promise.all([
      fetchAndParse(RSS_URL_JA, "ja"),
      fetchAndParse(RSS_URL_EN, "en"),
    ]);
    const items = [...jaItems, ...enItems];

    await redis.set("daily-news", {
      items,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (e) {
    console.error("fetch-news error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
