"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faTrash,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import type { WorkspaceTab } from "@/app/types";
import React, { useState, useEffect } from "react";

interface Props {
  tabs: WorkspaceTab[];
  selectedTabId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export default function Sidebar({
  tabs,
  selectedTabId,
  onSelect,
  onRename,
  onDelete,
  onAdd,
}: Props) {
  // Local handler to add a default tab if none exist
  const handleAddDefaultTab = () => {
    onAdd();
  };

  return (
    <div className="flex flex-col h-full px-3 py-4 space-y-2 relative">
      <ul className="space-y-1 overflow-y-auto max-h-[60vh] pr-1">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === selectedTabId}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </ul>

      <button
        onClick={handleAddDefaultTab}
        className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
      >
        <FontAwesomeIcon icon={faPlus} className="h-4 w-4" /> Add tab
      </button>

      <div className="flex-1" />
      {/* Reset Button sticky at the bottom of the sidebar */}
      <button
        onClick={() => {
          localStorage.removeItem('workspaceState');
          window.location.reload();
        }}
        className="w-full mb-1 py-2 rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-500 shadow-sm transition-all text-xs font-medium opacity-80 hover:opacity-100 z-10"
        style={{ position: 'sticky', bottom: 0 }}
        title="Reset workspace to default"
      >
        <span className="flex items-center justify-center gap-2">
          <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
          Reset Workspace
        </span>
      </button>
    </div>
  );
}

interface ItemProps {
  tab: WorkspaceTab;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

function TabItem({ tab, isActive, onSelect, onRename, onDelete }: ItemProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(tab.name ?? "");

  // Sync draftName with tab.name when editing starts or tab changes
  useEffect(() => {
    if (editing) {
      setDraftName(tab.name ?? "");
    }
  }, [editing, tab.name]);

  const saveName = () => {
    const trimmed = typeof draftName === "string" ? draftName.trim() : "";
    if (trimmed && trimmed !== tab.name) {
      onRename(tab.id, trimmed);
    }
    setEditing(false);
  };

  return (
    <li
      className={`group relative flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${isActive ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50" : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900/40 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
      onClick={() => onSelect(tab.id)}
    >
      {editing ? (
        <input
          className="w-full bg-transparent outline-none border-none text-sm"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveName();
            }
            if (e.key === "Escape") {
              setDraftName(tab.name);
              setEditing(false);
            }
          }}
          autoFocus
        />
      ) : (
        <span className="truncate mr-6 select-none">{tab.name}</span>
      )}

      {/* Hover controls */}
      {!editing && (
        <div className="absolute right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="group-hover:text-neutral-500 group-hover:dark:text-neutral-300"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
          </button>
          <button
            className="group-hover:text-neutral-500 group-hover:dark:text-neutral-300"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(tab.id);
            }}
          >
            <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </li>
  );
}
