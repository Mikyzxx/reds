"use client";

import {
  Download,
  File as FileIcon,
  FileArchive,
  FileText,
  Maximize2,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  MAX_CHAT_FILE_BYTES,
  uploadAttachment,
  type ChatAttachment,
  type ChatMessage,
} from "@/lib/chat";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function attachmentIcon(mime: string) {
  if (mime.includes("pdf") || mime.startsWith("text/")) return FileText;
  if (mime.includes("zip") || mime.includes("compressed")) return FileArchive;
  return FileIcon;
}

const isImage = (a: ChatAttachment) => a.mime.startsWith("image/");
const isVideo = (a: ChatAttachment) => a.mime.startsWith("video/");

function Attachment({
  attachment,
  onPreview,
}: {
  attachment: ChatAttachment;
  onPreview: (a: ChatAttachment) => void;
}) {
  if (isImage(attachment)) {
    return (
      <button
        onClick={() => onPreview(attachment)}
        title={`${attachment.name} — ver en grande`}
        className="block cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-40 max-w-full border border-line2 object-contain hover:border-cyan/50"
        />
      </button>
    );
  }
  if (isVideo(attachment)) {
    return (
      <div className="border border-line2">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={attachment.url}
          controls
          preload="metadata"
          className="max-h-40 w-full bg-black"
        />
        <div className="flex items-center gap-2 bg-field px-2 py-1">
          <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-fg2">
            {attachment.name} · {formatBytes(attachment.size)}
          </span>
          <button
            onClick={() => onPreview(attachment)}
            title="Ver en grande"
            className="flex-none cursor-pointer text-fg3 hover:text-cyan"
          >
            <Maximize2 size={11} strokeWidth={2} />
          </button>
          <a
            href={attachment.url}
            download={attachment.name}
            title="Descargar"
            className="flex-none text-fg3 hover:text-cyan"
          >
            <Download size={11} strokeWidth={2} />
          </a>
        </div>
      </div>
    );
  }
  const Icon = attachmentIcon(attachment.mime);
  return (
    <a
      href={attachment.url}
      download={attachment.name}
      className="flex items-center gap-2 border border-line2 bg-field px-2.5 py-2 hover:border-cyan/50"
    >
      <Icon size={14} strokeWidth={1.75} className="flex-none text-cyan/70" />
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg">
        {attachment.name}
      </span>
      <span className="flex-none font-mono text-[9px] text-fg3">
        {formatBytes(attachment.size)}
      </span>
    </a>
  );
}

/** Visor a pantalla completa (overlay) para imágenes y videos del chat. */
function Lightbox({
  attachment,
  onClose,
}: {
  attachment: ChatAttachment;
  onClose: () => void;
}) {
  const mediaBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const goFullscreen = () => {
    mediaBoxRef.current?.requestFullscreen?.().catch(() => {});
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex flex-none items-center gap-3 border-b border-line bg-panel px-4 py-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="min-w-0 truncate font-mono text-[11px] text-fg">
          {attachment.name}
        </span>
        <span className="flex-none font-mono text-[10px] text-fg3">
          {formatBytes(attachment.size)}
        </span>
        <div className="ml-auto flex flex-none items-center gap-2">
          <button
            onClick={goFullscreen}
            title="Pantalla completa"
            className="cursor-pointer border border-line2 p-1.5 text-fg2 hover:border-cyan hover:text-cyan"
          >
            <Maximize2 size={13} strokeWidth={2} />
          </button>
          <a
            href={attachment.url}
            download={attachment.name}
            title="Descargar"
            className="border border-line2 p-1.5 text-fg2 hover:border-cyan hover:text-cyan"
          >
            <Download size={13} strokeWidth={2} />
          </a>
          <button
            onClick={onClose}
            title="Cerrar (Esc)"
            className="cursor-pointer border border-line2 p-1.5 text-fg2 hover:border-red hover:text-red"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        ref={mediaBoxRef}
        className="flex min-h-0 flex-1 items-center justify-center bg-transparent p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo(attachment) ? (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <video
            src={attachment.url}
            controls
            autoPlay
            className="max-h-full max-w-full"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={attachment.url}
            alt={attachment.name}
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>
    </div>
  );
}

export default function ChatPanel({
  myUserId,
  messages,
  onSend,
  onClose,
  onUpload,
}: {
  myUserId: number;
  messages: ChatMessage[];
  onSend: (body: string, attachment?: ChatAttachment) => Promise<void>;
  onClose: () => void;
  onUpload: (file: File) => Promise<ChatAttachment>;
}) {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ChatAttachment | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickToBottomRef = useRef(true);

  // auto-scroll al fondo solo si el usuario ya estaba abajo (no robar scroll)
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const pickFile = (file: File | null) => {
    setError(null);
    if (file && file.size > MAX_CHAT_FILE_BYTES) {
      setError("El archivo supera los 20MB");
      return;
    }
    setPendingFile(file);
  };

  const submit = async () => {
    const body = text.trim();
    if ((!body && !pendingFile) || busy) return;
    setBusy(true);
    setError(null);
    try {
      let attachment: ChatAttachment | undefined;
      if (pendingFile) attachment = await onUpload(pendingFile);
      await onSend(body, attachment);
      setText("");
      setPendingFile(null);
      stickToBottomRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-[300px] flex-none flex-col border border-line2 bg-panel2">
      <div className="flex flex-none items-center gap-2 border-b border-line px-3 py-2.5">
        <span className="font-mono text-[10px] tracking-[3px] text-cyan">
          CHAT
        </span>
        <button
          onClick={onClose}
          title="Cerrar chat"
          className="ml-auto cursor-pointer text-fg3 hover:text-fg"
        >
          <X size={13} strokeWidth={2} />
        </button>
      </div>

      <div
        ref={listRef}
        onScroll={onListScroll}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
      >
        {messages.length === 0 && (
          <div className="py-6 text-center font-mono text-[10px] tracking-[2px] text-fg3">
            SIN MENSAJES AÚN
          </div>
        )}
        {messages.map((m) => {
          const mine = m.userId === myUserId;
          return (
            <div key={m.id} className="mb-3">
              <div className="mb-1 flex items-center gap-2">
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatarUrl}
                    alt={m.displayName}
                    className="h-5 w-5 flex-none border border-cyan/30 object-cover"
                  />
                ) : (
                  <span className="flex h-5 w-5 flex-none items-center justify-center border border-cyan/30 bg-cyan/10 font-mono text-[8px] text-cyan">
                    {m.initials}
                  </span>
                )}
                <span
                  className={`truncate font-mono text-[10px] ${mine ? "text-cyan" : "text-fg2"}`}
                >
                  {mine ? "tú" : m.displayName}
                </span>
                <span className="ml-auto flex-none font-mono text-[9px] text-fg3">
                  {formatTime(m.createdAt)}
                </span>
              </div>
              {m.body && (
                <div className="pl-7 text-[12.5px] leading-snug break-words text-fg">
                  {m.body}
                </div>
              )}
              {m.attachment && (
                <div className="mt-1 pl-7">
                  <Attachment attachment={m.attachment} onPreview={setPreview} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-none border-t border-line px-3 py-2.5">
        {error && (
          <div className="mb-2 border border-red/40 bg-red/10 px-2 py-1.5 font-mono text-[10px] text-red-hi">
            ✕ {error}
          </div>
        )}
        {pendingFile && (
          <div className="mb-2 flex items-center gap-2 border border-line2 bg-field px-2 py-1.5">
            <Paperclip size={11} className="flex-none text-cyan/70" />
            <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-fg2">
              {busy ? "SUBIENDO… " : ""}
              {pendingFile.name}
            </span>
            <button
              onClick={() => pickFile(null)}
              disabled={busy}
              className="cursor-pointer text-fg3 hover:text-red"
            >
              <X size={11} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(e) => {
              pickFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            title="Adjuntar archivo"
            className="flex-none cursor-pointer border border-line2 p-2 text-fg2 hover:border-cyan hover:text-cyan disabled:opacity-40"
          >
            <Paperclip size={13} strokeWidth={2} />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Escribe un mensaje…"
            className="min-w-0 flex-1 border border-line2 bg-field px-2.5 py-2 font-mono text-[12px] text-fg outline-none placeholder:text-fg3 focus:border-cyan/50"
          />
          <button
            onClick={() => void submit()}
            disabled={busy || (!text.trim() && !pendingFile)}
            title="Enviar"
            className="flex-none cursor-pointer border border-cyan/60 bg-cyan/10 p-2 text-cyan hover:bg-cyan/20 disabled:cursor-default disabled:border-line2 disabled:bg-transparent disabled:text-fg3"
          >
            <Send size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {preview && (
        <Lightbox attachment={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
