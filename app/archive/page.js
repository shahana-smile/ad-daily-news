"use client";
import { useEffect, useState } from "react";

const CATEGORY_LABELS = {
  adk: "ADK技術ニュース",
  oem: "OEMニュース",
  platformer: "プラットフォーマー",
  promotion: "走行プロモーション",
  other: "その他",
};

export default function ArchivePage() {
  const [view, setView] = useState("categories"); // categories | folders | articles
  const [index, setIndex] = useState(null);
  const [category, setCategory] = useState(null);
  const [folder, setFolder] = useState(null);
  const [folderLabel, setFolderLabel] = useState("");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/archive")
      .then((r) => r.json())
      .then((d) => {
        setIndex(d.index || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openCategory = (cat) => {
    setCategory(cat);
    setView("folders");
  };

  const openFolder = async (folderKey, label) => {
    setFolder(folderKey);
    setFolderLabel(label);
    setLoading(true);
    setView("articles");
    const res = await fetch(`/api/archive?category=${category}&folder=${folderKey}`);
    const data = await res.json();
    setArticles(data.items || []);
    setLoading(false);
  };

  const card = { border: "1px solid #EEEEEC", borderRadius: 12, padding: "14px 16px", marginBottom: 10, cursor: "pointer", background: "#fff" };
  const backBtn = { background: "none", border: "none", color: "#6B6B68", fontSize: 13, marginBottom: 16, cursor: "pointer", padding: 0 };

  return (
    <main style={{ fontFamily: "-apple-system, sans-serif", maxWidth: 640, margin: "0 auto", padding: "28px 20px 60px", color: "#17181A" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>ニュースアーカイブ</h1>
      <p style={{ fontSize: 13, color: "#6B6B68", marginBottom: 20 }}>
        これまでに取得したニュースを、カテゴリ・企業/国ごとに見返せます。
      </p>

      {loading && <div style={{ fontSize: 13, color: "#6B6B68" }}>読み込み中...</div>}

      {!loading && view === "categories" && index && (
        <div>
          {Object.keys(CATEGORY_LABELS).map((cat) => {
            const folders = index[cat] || [];
            const total = folders.reduce((s, f) => s + f.count, 0);
            if (total === 0) return null;
            return (
              <div key={cat} style={card} onClick={() => openCategory(cat)}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{CATEGORY_LABELS[cat]}</div>
                <div style={{ fontSize: 12, color: "#9A9A97", marginTop: 4 }}>
                  {folders.length}社/エリア ・ 合計{total}件
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && view === "folders" && index && (
        <div>
          <button style={backBtn} onClick={() => setView("categories")}>← カテゴリ一覧に戻る</button>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>{CATEGORY_LABELS[category]}</h2>
          {(index[category] || []).map((f) => (
            <div key={f.folder} style={card} onClick={() => openFolder(f.folder, f.folderLabel)}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{f.folderLabel}</div>
              <div style={{ fontSize: 12, color: "#9A9A97", marginTop: 4 }}>{f.count}件</div>
            </div>
          ))}
        </div>
      )}

      {view === "articles" && (
        <div>
          <button style={backBtn} onClick={() => setView("folders")}>← {CATEGORY_LABELS[category]}に戻る</button>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>{folderLabel}</h2>
          {!loading && articles.length === 0 && (
            <div style={{ fontSize: 13, color: "#6B6B68" }}>まだ記事がありません。</div>
          )}
          {articles.map((a, i) => (
            <div key={i} style={{ ...card, cursor: "default" }}>
              <div style={{ fontSize: 11, color: "#9A9A97", marginBottom: 4 }}>
                {a.lang === "ja" ? "🇯🇵" : "🇺🇸"} {a.source} ／ {a.date}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.5 }}>{a.title}</div>
              {a.link && (
                <a href={a.link} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-block", marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "#D6222A", textDecoration: "none" }}>
                  元記事を読む →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
