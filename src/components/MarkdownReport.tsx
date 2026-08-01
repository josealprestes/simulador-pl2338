import React from "react";

/**
 * Simple Markdown renderer for report display.
 * Renders headings, bold, lists, and paragraphs.
 * No external dependencies — uses plain React elements with Tailwind classes.
 */
export function MarkdownReport({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-6 space-y-1 my-2">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed text-on-surface-variant">
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headings
    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={i} className="text-xl font-bold text-on-surface mt-6 mb-3">
          {renderInline(line.slice(2))}
        </h1>,
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={i} className="text-lg font-semibold text-on-surface mt-5 mb-2 border-b border-outline-variant/30 pb-1">
          {renderInline(line.slice(3))}
        </h2>,
      );
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={i} className="text-base font-semibold text-on-surface mt-4 mb-2">
          {renderInline(line.slice(4))}
        </h3>,
      );
      continue;
    }

    // List items
    if (line.match(/^[-*]\s+/)) {
      listItems.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }

    // Empty line — flush list
    if (line.trim() === "") {
      flushList();
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={i} className="text-sm leading-relaxed text-on-surface-variant my-1">
        {renderInline(line)}
      </p>,
    );
  }

  flushList();

  return <div className="prose-custom space-y-1">{elements}</div>;
}

/** Render inline markdown: **bold**, *italic*, and plain text. */
function renderInline(text: string): React.ReactNode {
  // Split on **bold** and *italic* patterns
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Try **bold** first
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Try *italic*
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

    const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity;
    const italicIdx = italicMatch ? remaining.indexOf(italicMatch[0]) : Infinity;

    if (boldIdx < italicIdx && boldMatch) {
      if (boldIdx > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, boldIdx)}</span>);
      }
      parts.push(
        <strong key={key++} className="font-semibold text-on-surface">
          {boldMatch[1]}
        </strong>,
      );
      remaining = remaining.slice(boldIdx + boldMatch[0].length);
    } else if (italicMatch) {
      if (italicIdx > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, italicIdx)}</span>);
      }
      parts.push(
        <em key={key++} className="italic text-on-surface-variant">
          {italicMatch[1]}
        </em>,
      );
      remaining = remaining.slice(italicIdx + italicMatch[0].length);
    } else {
      parts.push(<span key={key}>{remaining}</span>);
      break;
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
