"use client";

import Editor, { type Monaco } from "@monaco-editor/react";
import { FileWarning } from "lucide-react";
import { useEffect, useRef } from "react";

export const NEXA_THEME = "nexa-dark";

/** Tema + diagnósticos. Cada archivo abierto es un modelo suelto (sin tsconfig
 * ni node_modules), así que la validación semántica de TS/JS marcaría en rojo
 * todos los imports; se deja solo la validación de sintaxis. */
export function configureMonaco(monaco: Monaco) {
  defineNexaTheme(monaco);
  const ts = monaco.languages.typescript;
  for (const defaults of [ts.typescriptDefaults, ts.javascriptDefaults]) {
    defaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });
    defaults.setCompilerOptions({
      jsx: ts.JsxEmit.ReactJSX,
      allowJs: true,
      allowNonTsExtensions: true,
      target: ts.ScriptTarget.ESNext,
    });
  }
}

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

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function ImageViewer({
  path,
  base64,
  size,
}: {
  path: string;
  base64: string;
  size: number;
}) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const mime = IMAGE_MIME[ext] ?? "image/png";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 overflow-auto p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:${mime};base64,${base64}`}
        alt={path}
        className="max-h-[85%] max-w-full border border-line2 bg-panel2 object-contain"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #161d27 25%, transparent 25%, transparent 75%, #161d27 75%), linear-gradient(45deg, #161d27 25%, transparent 25%, transparent 75%, #161d27 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 8px 8px",
        }}
      />
      <span className="font-mono text-[10px] tracking-[2px] text-fg3">
        {path.split("/").pop()} · {formatBytes(size)} · solo lectura
      </span>
    </div>
  );
}

export default function CodeEditor({
  path,
  content,
  notEditable,
  imageSize,
  onChange,
  onSave,
}: {
  path: string;
  content: string;
  notEditable: "binary" | "too_large" | "image" | null;
  imageSize?: number;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  // El comando Ctrl/Cmd+S de Monaco se registra una vez; refs para no re-montar
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  if (notEditable === "image") {
    return <ImageViewer path={path} base64={content} size={imageSize ?? 0} />;
  }

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
      beforeMount={configureMonaco}
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
