import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

/** Search input that writes to the URL 300 ms after the user stops typing. */
export function SearchBox({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const [text, setText] = useState(value ?? "");
  const lastSent = useRef(value);

  // Follow outside changes (e.g. "Limpiar filtros") without undoing what the user is typing.
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setText(value ?? "");
    }
  }, [value]);

  useEffect(() => {
    const next = text.trim() === "" ? undefined : text;
    if (next === lastSent.current) return;
    const id = setTimeout(() => {
      lastSent.current = next;
      onChange(next);
    }, 300);
    return () => clearTimeout(id);
  }, [text, onChange]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Buscar tareas"
        aria-label="Buscar tareas"
        className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
          aria-label="Borrar búsqueda"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
