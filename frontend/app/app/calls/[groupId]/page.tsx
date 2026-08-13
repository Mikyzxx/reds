"use client";

import { use, useCallback, useEffect, useState } from "react";
import {
  Check,
  Link2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ParticipantTile from "@/components/ParticipantTile";
import ShareStage from "@/components/ShareStage";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import type { Group } from "@/lib/types";

export default function CallRoomPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const router = useRouter();
  const id = Number(groupId);

  const [group, setGroup] = useState<Group | null>(null);
  const [copied, setCopied] = useState(false);
  const me = getStoredUser();

  const {
    status,
    error,
    peers,
    micOn,
    camOn,
    sharing,
    selfSpeaking,
    localCamStream,
    localScreenStream,
    toggleMic,
    toggleCam,
    toggleShare,
    sampleShareStats,
    shareVolume,
    setShareVolume,
    peerVolumes,
    setPeerVolume,
  } = useVoiceCall(id);

  useEffect(() => {
    api<Group[]>("/api/groups")
      .then((gs) => setGroup(gs.find((g) => g.id === id) ?? null))
      .catch(() => {});
  }, [id]);

  const total = peers.length + 1;
  const cols = total <= 1 ? 1 : total <= 4 ? 2 : 3;

  // pantalla activa: la mía o la de un peer (una a la vez)
  const sharingPeer = peers.find((p) => p.shareStreamId != null) ?? null;
  const peerScreenStream =
    sharingPeer?.videoStreams.find((s) => s.id === sharingPeer.shareStreamId) ??
    null;
  const shareActive = sharing || sharingPeer != null;

  const shareStream = sharing ? localScreenStream : peerScreenStream;
  const shareTrack = shareStream?.getVideoTracks()[0] ?? null;
  const sharingPeerId = sharing ? null : (sharingPeer?.userId ?? null);
  const sampleStats = useCallback(
    () =>
      shareTrack
        ? sampleShareStats(shareTrack, sharingPeerId)
        : Promise.resolve(null),
    [shareTrack, sharingPeerId, sampleShareStats],
  );

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const tiles = (
    <>
      <ParticipantTile
        initials={me?.initials ?? "?"}
        name={`Tú${me ? ` · ${me.display_name}` : ""}`}
        speaking={selfSpeaking}
        muted={!micOn}
        stream={localCamStream}
        avatarUrl={me?.avatar_url ?? null}
        mirror
        compact={shareActive}
      />
      {peers.map((p) => {
        const cameraStream =
          p.videoStreams.find((s) => s.id !== p.shareStreamId) ?? null;
        return (
          <ParticipantTile
            key={p.userId}
            initials={p.initials}
            name={p.displayName}
            label={
              p.connectionState !== "connected" &&
              p.connectionState !== "signaling"
                ? `· ${p.connectionState}`
                : p.connectionState === "signaling"
                  ? "· conectando"
                  : undefined
            }
            speaking={p.speaking}
            muted={p.muted}
            stream={p.camOn ? cameraStream : null}
            avatarUrl={p.avatarUrl}
            compact={shareActive}
            volume={peerVolumes[p.userId] ?? 1}
            onVolumeChange={(v) => setPeerVolume(p.userId, v)}
          />
        );
      })}
    </>
  );

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col px-6 py-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`h-2 w-2 rounded-full ${
            status === "connected"
              ? "animate-nexapulse bg-red [animation-duration:1.6s]"
              : "bg-fg3"
          }`}
        />
        <span className="text-base font-bold">
          Sala · {group?.name ?? `#${groupId}`}
        </span>
        <span className="font-mono text-[11px] text-fg2">
          {status === "connecting" && "CONECTANDO…"}
          {status === "connected" &&
            `EN VIVO · ${total} participante${total === 1 ? "" : "s"}`}
          {status === "error" && "DESCONECTADO"}
        </span>
        <button
          onClick={copyLink}
          className="ml-auto flex cursor-pointer items-center gap-1.5 border border-line2 px-3.5 py-[7px] font-mono text-[10px] tracking-wide text-fg2 hover:border-cyan hover:text-cyan"
        >
          {copied ? (
            <Check size={12} strokeWidth={2.5} className="text-green" />
          ) : (
            <Link2 size={12} strokeWidth={2} />
          )}
          {copied ? "COPIADO" : "COPIAR ENLACE"}
        </button>
      </div>

      {error && (
        <div className="mb-3 border border-red/40 bg-red/10 px-3 py-2 font-mono text-[11px] text-red-hi">
          ✕ {error}
        </div>
      )}

      {shareActive ? (
        <ShareStage
          stream={shareStream}
          ownerLabel={sharing ? "TÚ" : (sharingPeer?.displayName ?? "").toUpperCase()}
          sampleStats={shareTrack ? sampleStats : null}
          volume={
            !sharing && (shareStream?.getAudioTracks().length ?? 0) > 0
              ? shareVolume
              : null
          }
          onVolumeChange={setShareVolume}
        >
          {tiles}
        </ShareStage>
      ) : (
        <div
          className="grid min-h-0 flex-1 gap-3"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridAutoRows: "1fr",
          }}
        >
          {tiles}
          {peers.length === 0 && status === "connected" && (
            <div className="flex items-center justify-center border border-dashed border-line2 font-mono text-[11px] text-fg3">
              esperando a que alguien más entre…
            </div>
          )}
        </div>
      )}

      <div className="flex justify-center gap-3 pt-[18px] pb-1">
        <button
          onClick={toggleMic}
          className={`flex w-24 cursor-pointer items-center justify-center gap-1.5 border py-3 font-mono text-[11px] tracking-wide hover:border-cyan ${
            micOn
              ? "border-line2 bg-transparent text-[#b9c6d2]"
              : "border-red/50 bg-red/10 text-red-hi"
          }`}
        >
          {micOn ? (
            <Mic size={13} strokeWidth={2} />
          ) : (
            <MicOff size={13} strokeWidth={2} />
          )}
          MIC
        </button>
        <button
          onClick={toggleCam}
          className={`flex w-24 cursor-pointer items-center justify-center gap-1.5 border py-3 font-mono text-[11px] tracking-wide hover:border-cyan ${
            camOn
              ? "border-line2 bg-transparent text-[#b9c6d2]"
              : "border-red/50 bg-red/10 text-red-hi"
          }`}
        >
          {camOn ? (
            <Video size={13} strokeWidth={2} />
          ) : (
            <VideoOff size={13} strokeWidth={2} />
          )}
          CÁM
        </button>
        <button
          onClick={toggleShare}
          disabled={sharingPeer != null}
          title={
            sharingPeer != null
              ? `${sharingPeer.displayName} está compartiendo`
              : undefined
          }
          className={`flex cursor-pointer items-center justify-center gap-1.5 border py-3 font-mono text-[11px] tracking-wide disabled:cursor-not-allowed disabled:opacity-50 ${
            sharing
              ? "w-[190px] border-cyan bg-cyan/15 text-cyan hover:bg-cyan/25"
              : "w-[130px] border-line2 text-[#b9c6d2] hover:border-cyan"
          }`}
        >
          <MonitorUp size={13} strokeWidth={2} />
          {sharing ? "DEJAR DE COMPARTIR" : "COMPARTIR"}
        </button>
        <button
          onClick={() => router.push("/app/calls")}
          className="flex w-24 cursor-pointer items-center justify-center gap-1.5 border border-red bg-red py-3 font-mono text-[11px] tracking-wide text-white hover:bg-red-hi"
        >
          <PhoneOff size={13} strokeWidth={2} />
          SALIR
        </button>
      </div>
    </div>
  );
}
