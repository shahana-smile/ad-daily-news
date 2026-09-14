import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 使い方:
//   /api/archive              → カテゴリ・企業/国の一覧(件数付き)を返す
//   /api/archive?category=adk&folder=waymo → その企業/国の記事一覧を返す
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const folder = searchParams.get("folder");

    if (category && folder) {
      const items = (await redis.get(`archive:${category}:${folder}`)) || [];
      return NextResponse.json({ ok: true, items });
    }

    const index = (await redis.get("archive:index")) || {};
    const summary = {};
    for (const cat of Object.keys(index)) {
      summary[cat] = [];
      for (const folderKey of Object.keys(index[cat])) {
        const items = (await redis.get(`archive:${cat}:${folderKey}`)) || [];
        summary[cat].push({
          folder: folderKey,
          folderLabel: index[cat][folderKey],
          count: items.length,
        });
      }
    }
    return NextResponse.json({ ok: true, index: summary });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
    }
