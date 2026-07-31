"use client";

import { useState } from "react";
import { createNote, updateNote, deleteNote } from "@/lib/actions/notes";
import type { Note } from "@/lib/types";

export default function NotesView({
  notes,
  deckTitleById,
  initialNoteId,
}: {
  notes: Note[];
  deckTitleById: Map<string, string>;
  initialNoteId?: string;
}) {
  const [rawSelectedId, setSelectedId] = useState<string | null>(initialNoteId ?? notes[0]?.id ?? null);
  const [creating, setCreating] = useState(false);

  // If the selected note gets deleted (or isn't in the list at all), fall
  // back to the first note instead of showing a blank panel with no way back.
  const selectedId =
    rawSelectedId && notes.some((n) => n.id === rawSelectedId) ? rawSelectedId : (notes[0]?.id ?? null);
  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  async function handleNewNote() {
    setCreating(true);
    try {
      const id = await createNote("Untitled note");
      setSelectedId(id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex gap-8">
      <nav className="flex w-56 shrink-0 flex-col gap-1.5 rounded-xl border border-black/10 bg-card p-3 dark:border-white/10">
        {notes.length === 0 ? (
          <p className="px-1 py-1.5 text-sm text-zinc-400">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              deckTitle={note.deck_id ? deckTitleById.get(note.deck_id) : undefined}
              active={note.id === selectedId}
              onSelect={() => setSelectedId(note.id)}
              onDeleted={() => setSelectedId(null)}
            />
          ))
        )}
        <button
          onClick={handleNewNote}
          disabled={creating}
          className="mt-2 rounded-md border border-dashed border-black/20 px-2 py-1.5 text-left text-sm text-zinc-500 disabled:opacity-50 dark:border-white/20"
        >
          {creating ? "Creating…" : "+ New note"}
        </button>
      </nav>

      <div className="min-w-0 flex-1">
        {selectedNote ? (
          <NoteEditor key={selectedNote.id} note={selectedNote} />
        ) : (
          <p className="text-sm text-zinc-400">
            No notes yet — click &quot;+ New note&quot; to write one, or generate one next time you import
            slides.
          </p>
        )}
      </div>
    </div>
  );
}

function NoteRow({
  note,
  deckTitle,
  active,
  onSelect,
  onDeleted,
}: {
  note: Note;
  deckTitle?: string;
  active: boolean;
  onSelect: () => void;
  onDeleted: () => void;
}) {
  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${note.title || "Untitled note"}"? This can't be undone.`)) return;
    await deleteNote(note.id);
    onDeleted();
  }

  return (
    <div
      className={`flex items-center gap-0.5 rounded-md border px-1 ${
        active ? "" : "border-black/10 dark:border-white/10"
      }`}
      style={active ? { background: "var(--accent-btn-bg)", borderColor: "var(--accent-btn-border)" } : undefined}
    >
      <button
        onClick={onSelect}
        className={`min-w-0 flex-1 px-1 py-1.5 text-left text-sm ${
          active ? "font-medium" : "text-zinc-600 dark:text-zinc-400"
        }`}
        style={active ? { color: "var(--accent-btn-text)" } : undefined}
      >
        <span className="block truncate">{note.title || "Untitled note"}</span>
        {deckTitle && <span className="block truncate text-xs text-zinc-400">From: {deckTitle}</span>}
      </button>
      <button
        onClick={handleDelete}
        aria-label={`Delete ${note.title || "Untitled note"}`}
        className="shrink-0 self-start px-1 py-1.5 text-xs text-zinc-400 hover:text-red-500"
      >
        ×
      </button>
    </div>
  );
}

function NoteEditor({ note }: { note: Note }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateNote(note.id, title.trim() || "Untitled note", content);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setDirty(true);
        }}
        placeholder="Untitled note"
        className="rounded-md border border-black/15 px-3 py-2 text-lg font-semibold dark:border-white/15"
      />
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setDirty(true);
        }}
        rows={18}
        placeholder="Write your notes here…"
        className="w-full rounded-md border border-black/15 px-3 py-2 text-sm leading-relaxed dark:border-white/15"
      />
      <button
        onClick={handleSave}
        disabled={saving || !dirty}
        className="self-start rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        style={{ background: "var(--accent-btn-solid-bg)", color: "var(--accent-btn-solid-text)" }}
      >
        {saving ? "Saving…" : dirty ? "Save" : "Saved"}
      </button>
    </div>
  );
}
