import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const RSS_URL_EN =
  "https://news.google.com/rss/search?q=autonomous+driving&hl=en-US&gl=US&ceid=US:en";
const RSS_URL_JA =
  "https://news.google.com/rss/search?q=%E8%87%AA%E5%8B%95%E9%81%8B%E8%BB%A2&hl=ja&gl=JP&ceid=JP:ja";

/* ==== 分類ルール(英語・カタカナ・漢字に対応) ==== */
const PLATFORMERS = [
  { key: "uber", label: "Uber", words: ["uber", "ウーバー"] },
  { key: "didi", label: "DiDi", words: ["didi", "滴滴", "ディディ"] },
  { key: "grab", label: "Grab", words: ["grab", "グラブ"] },
  { key: "lyft", label: "Lyft", words: ["lyft", "リフト"] },
  { key: "ola", label: "Ola", words: ["ola cabs", " ola ", "オラキャブズ"] },
  { key: "bolt", label: "Bolt", words: ["bolt technology", "ボルト(配車)"] },
  { key: "careem", label: "Careem", words: ["careem", "カリーム"] },
];

const ADK_MAKERS = [
  { key: "waymo", label: "Waymo", words: ["waymo", "ウェイモ"] },
  { key: "mobileye", label: "Mobileye", words: ["mobileye", "モービルアイ", "モビルアイ"] },
  { key: "nvidia", label: "NVIDIA", words: ["nvidia", "エヌビディア"] },
  { key: "zoox", label: "Zoox", words: ["zoox", "ズークス"] },
  { key: "weride", label: "WeRide", words: ["weride", "文远知行", "ウィーライド"] },
  { key: "ponyai", label: "Pony.ai", words: ["pony.ai", "pony ai", "小马智行", "ポニーエーアイ"] },
  { key: "apollo", label: "Baidu Apollo", words: ["apollo go", "baidu", "百度", "バイドゥ"] },
];

const OEM_MAKERS = [
  { key: "toyota", label: "トヨタ", words: ["toyota", "トヨタ", "豊田"] },
  { key: "honda", label: "ホンダ", words: ["honda", "ホンダ", "本田"] },
  { key: "nissan", label: "日産", words: ["nissan", "日産", "ニッサン"] },
  { key: "tesla", label: "Tesla", words: ["tesla", "テスラ"] },
  { key: "byd", label: "BYD", words: ["byd", "比亚迪", "ビーワイディー"] },
  { key: "jaguar", label: "Jaguar", words: ["jaguar", "ジャガー"] },
  { key: "lucid", label: "Lucid", words: ["lucid", "ルーシッド", "ルシッド"] },
  { key: "gac", label: "GAC", words: ["gac motor", " gac ", "広汽", "広汽汽車"] },
];

const PROMO_WORDS = ["test drive", "pilot", "demo", "trial", "launch", "expands", "expansion",
  "試乗", "実証実験", "実証", "デモ", "拡大", "開始"];

function matchMaker(title, list) {
  const lower = title.toLowerCase();
  for (const m of list) {
    for (const w of m.words) {
      if (lower.includes(w.toLowerCase()) || title.includes(w)) return m;
    }
  }
  return null;
}

function classify(item) {
  const title = item.title || "";

  const platformer = matchMaker(title, PLATFORMERS);
  if (platformer) return { category: "platformer", folder: platformer.key, folderLabel: platformer.label };

  const adk = matchMaker(title, ADK_MAKERS);
  if (adk) return { category: "adk", folder: adk.key, folderLabel: adk.label };

  const oem = matchMaker(title, OEM_MAKERS);
  if (oem) return { category: "oem", folder: oem.key, folderLabel: oem.label };

  const lower = title.toLowerCase();
  const isPromo = PROMO_WORDS.some((w) => lower.includes(w.toLowerCase()) || title.includes(w));
  if (isPromo) {
    const country = item.lang === "ja" ? "japan" : "global";
    return { category: "promotion", folder: country, folderLabel: item.lang === "ja" ? "日本" : "海外" };
  }

  return { category: "other", folder: "other", folderLabel: "その他" };
}

/* ==== RSS取得・解析 ==== */
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
    const items = [...jaItems, ...enItems].map((it) => ({ ...it, ...classify(it) }));

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
