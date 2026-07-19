"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

export function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const value = draft.trim();
    if (value && !values.includes(value)) {
      onChange([...values, value]);
    }
    setDraft("");
  }

  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  return (
    <div className="flex flex-col gap-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm px-2.5 py-1 text-sm text-ink"
            >
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                aria-label={`Remove ${v}`}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-destructive/20 hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}
