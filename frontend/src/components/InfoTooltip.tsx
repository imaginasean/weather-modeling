import { useState, useRef, useEffect } from "react";
import "./InfoTooltip.css";

type Props = {
  term: string;
  definition: string;
  learnMoreUrl?: string;
};

export default function InfoTooltip({ term, definition, learnMoreUrl }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <span className="info-tooltip-wrap" ref={wrapRef}>
      <button
        type="button"
        className="info-tooltip-trigger"
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={`Learn about ${term}`}
      >
        ℹ️
      </button>
      {open && (
        <div className="info-tooltip-popover" role="tooltip">
          <strong>{term}</strong>
          <p>{definition}</p>
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="info-tooltip-learn"
            >
              Learn more
            </a>
          )}
        </div>
      )}
    </span>
  );
}
