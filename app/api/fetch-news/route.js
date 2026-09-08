import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const RSS_URL =
  "https://news.google.com/rss/search?q=autonomous+driving&hl=en-US&gl=US&ceid=US:en";

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

export async function GET() {
  try {
    const res = await fetch(RSS_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ADDailyNewsBot/0.1)" },
    });
    if (!res.ok) throw new Error("RSS fetch failed: " + res.status);

    const xml = await res.text();
    const allItems = parseRss(xml);

    const top3 = allItems.slice(0, 3).map((it) => ({
      title: it.title || "(タイトル不明)",
      source: it.source || "不明",
      date: it.pubDate || "不明",
      link: it.link || "",
    }));

    await redis.set("daily-news", {
      items: top3,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, count: top3.length, items: top3 });
  } catch (e) {
    console.error("fetch-news error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
