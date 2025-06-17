"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { WorkspaceTab } from "@/app/types";

interface Props {
  tab: WorkspaceTab | undefined;
}

import React, { useState, useEffect } from "react";
import { useWorkspaceContext } from "@/app/contexts/WorkspaceContext";

export default function TabContent({ tab }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tab?.content ?? "");

  // Get global tab state and updater
  const tabs = useWorkspaceContext(ws => ws.tabs);
  const setTabs = useWorkspaceContext(ws => ws.setTabs);

  useEffect(() => {
    setDraft(tab?.content ?? "");
    setEditing(false);
  }, [tab]);

  if (!tab) return null;

  const handleSave = () => {
    if (!tab) return;
    setTabs(tabs.map(t => t.id === tab.id ? { ...t, content: draft } : t));
    setEditing(false);
  };



  const handleCancel = () => {
    setDraft(tab.content ?? "");
    setEditing(false);
  };

  const buttonClass =
    "mb-1 py-2 px-4 rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-400 hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-500 shadow-sm transition-all text-xs font-medium opacity-80 hover:opacity-100 z-10";
  const cancelClass =
    "mb-1 py-2 px-4 rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-500 shadow-sm transition-all text-xs font-medium opacity-80 hover:opacity-100 z-10 ml-2";

  const renderEditArea = () => {
    if (tab.type === "markdown" || tab.type === "csv") {
      return (
        <textarea
          className="w-full h-full min-h-[300px] flex-1 p-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-neutral-50 dark:bg-neutral-900 text-sm font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-vertical"
          style={{ minHeight: "300px", height: "100%" }}
          value={draft}
          onChange={e => setDraft(e.target.value)}
        />
      );
    }
    return (
      <input
        className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-neutral-50 dark:bg-neutral-900 text-sm font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
        value={draft}
        onChange={e => setDraft(e.target.value)}
      />
    );
  };

  if (editing) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col">
          {renderEditArea()}
        </div>
        <div className="flex gap-2 mt-2">
          <button className={buttonClass} onClick={handleSave}>
            Save
          </button>
          <button className={cancelClass} onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  let content;
  switch (tab.type) {
    case "markdown":
      content = <MarkdownView markdown={draft} />;
      break;
    case "csv":
      content = <CsvView csv={draft} />;
      break;
    default:
      content = <pre className="whitespace-pre-wrap text-sm">{draft}</pre>;
  }

  return (
    <div className="relative">
      <div className="absolute right-0 top-0 z-10">
        <button
          className={buttonClass}
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      </div>
      <div>{content}</div>
    </div>
  );
}


// ──────────────────────────────────────────────────────────
// Markdown renderer (very minimal, no external deps)
// ──────────────────────────────────────────────────────────

function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <div className="markdown-body text-sm leading-6 prose dark:prose-invert max-w-none">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// CSV renderer (| delimited)
// ──────────────────────────────────────────────────────────

function CsvView({ csv }: { csv: string }) {
  const rows = useMemo(() => parseCsv(csv), [csv]);
  if (rows.length === 0 || (rows.length === 1 && rows[0].length === 1 && rows[0][0] === "")) {
    return null;
  }

  const header = rows[0];
  const dataRows = rows.slice(1);

  return (
    <div className="overflow-auto">
      <table className="table-auto w-full text-sm border-collapse">
        <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">
          <tr>
            {header.map((h, idx) => (
              <th key={idx} className="px-3 py-2 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {dataRows.map((row, rIdx) => (
            <tr key={rIdx} className="odd:bg-neutral-50 dark:odd:bg-neutral-900/40">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-2 whitespace-pre-wrap align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseCsv(src: string): string[][] {
  return src
    .trim()
    .split(/\n|\r\n/)
    .map((line) => line.split("|").map((s) => s.trim()));
}
