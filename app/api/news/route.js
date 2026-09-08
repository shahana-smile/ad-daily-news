import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 学習アプリなど、他の場所からも読み込めるようにするための
// 「読み取り専用」の窓口。ここでは取得はせず、保存済みのデータを返すだけ。
export async function GET() {
  try {
    const data = await redis.get("daily-news");
    return NextResponse.json(data || { items: [], updatedAt: null }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return NextResponse.json(
      { items: [], updatedAt: null, error: String(e) },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
