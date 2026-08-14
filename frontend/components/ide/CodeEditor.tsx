"use client";

import Editor, { type Monaco } from "@monaco-editor/react";
import { FileWarning } from "lucide-react";
import { useEffect, useRef } from "react";

export const NEXA_THEME = "nexa-dark";

export function defineNexaTheme(monaco: Monaco) {
  monaco.editor.defineTheme(NEXA_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "00e5ff" },
      { token: "string", foreground: "3ddc84" },
      { token: "number", foreground: "ffb300" },
      { token: "comment", foreground: "4a5866", fontStyle: "italic" },
      { token: "type", foreground: "b48bff" },
    ],
    colors: {
      "editor.background": "#0a0d12",
      "editor.foreground": "#e2ebf2",
      "editor.lineHighlightBackground": "#0e131b",
      "editorLineNumber.foreground": "#4a5866",
      "editorLineNumber.activeForeground": "#7d8b99",
      "editorCursor.foreground": "#00e5ff",
      "editor.selectionBackground": "#00e5ff33",
      "editorIndentGuide.background1": "#161d27",
      "editorWidget.background": "#0c1017",
      "editorWidget.border": "#1c2530",
      "input.background": "#0a0f15",
      "scrollbarSlider.background": "#1c253080",
      "scrollbarSlider.hoverBackground": "#1c2530",
    },
  });
}

export const EDITOR_OPTIONS = {
  fontFamily: "var(--font-jbmono), ui-monospace, monospace",
  fontSize: 13,
  minimap: { enabled: false },
  automaticLayout: true,
  scrollBeyondLastLine: false,
  renderLineHighlight: "all" as const,
  padding: { top: 8 },
};

export default function CodeEditor({
  path,
  content,
  notEditable,
  onChange,
  onSave,
}: {
  path: string;
  content: string;
  notEditable: "binary" | "too_large" | null;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  // El comando Ctrl/Cmd+S de Monaco se registra una vez; refs para no re-montar
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  if (notEditable) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-fg3">
        <FileWarning size={28} strokeWidth={1.5} />
        <span className="font-mono text-[11px] tracking-[2px]">
          {notEditable === "binary"
            ? "ARCHIVO BINARIO — NO EDITABLE"
            : "ARCHIVO DEMASIADO GRANDE (>1 MB)"}
        </span>
      </div>
    );
  }

  return (
    <Editor
      path={path}
      value={content}
      theme={NEXA_THEME}
      beforeMount={defineNexaTheme}
      onMount={(editor, monaco) => {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
          onSaveRef.current(),
        );
      }}
      onChange={(value) => onChange(value ?? "")}
      options={EDITOR_OPTIONS}
      loading={
        <span className="animate-nexapulse font-mono text-[11px] tracking-[2px] text-cyan">
          CARGANDO EDITOR…
        </span>
      }
    />
  );
}
