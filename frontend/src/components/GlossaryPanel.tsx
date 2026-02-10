import { useEffect, useState } from "react";
import { fetchGlossary } from "../api/glossary";
import type { GlossaryResponse } from "../api/glossary";
import "./GlossaryPanel.css";

type Props = { onClose: () => void };

export default function GlossaryPanel({ onClose }: Props) {
  const [data, setData] = useState<GlossaryResponse | null>(null);

  useEffect(() => {
    fetchGlossary().then(setData).catch(() => setData(null));
  }, []);

  const byCategory = data?.by_category ?? {};

  return (
    <div className="glossary-overlay" role="dialog" aria-label="Glossary">
      <div className="glossary-panel">
        <div className="glossary-header">
          <h2>Glossary</h2>
          <button type="button" className="glossary-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="glossary-body">
          {!data ? (
            <p>Loading…</p>
          ) : (
            Object.entries(byCategory).map(([category, entries]) => (
              <section key={category} className="glossary-category">
                <h3>{category}</h3>
                <ul>
                  {entries.map((e) => (
                    <li key={e.term}>
                      <strong>{e.term}</strong> — {e.definition}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
