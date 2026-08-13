"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getToken, wsBase } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import type { PeerInfo } from "@/lib/types";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export type CallStatus = "idle" | "connecting" | "connected" | "error";

export interface CallPeer extends PeerInfo {
  speaking: boolean;
  connectionState: RTCPeerConnectionState | "signaling";
  /** streams de video recibidos; cámara vs pantalla se resuelve con shareStreamId */
  videoStreams: MediaStream[];
}

interface SignalMessage {
  type: string;
  [key: string]: unknown;
}

interface PeerEntry {
  pc: RTCPeerConnection;
  /** perfect negotiation */
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
}

/** Muestra puntual de getStats() sobre el video compartido (acumulados). */
export interface ShareStatsSnapshot {
  timestamp: number;
  direction: "inbound" | "outbound";
  bytes: number;
  frameWidth: number | null;
  frameHeight: number | null;
  fps: number | null;
  codec: string | null;
  packetsLost: number | null;
  jitterMs: number | null;
  rttMs: number | null;
}

/**
 * Llamada WebRTC en malla (mesh): voz + cámara opcional + compartir pantalla.
 * - señalización por WebSocket contra el backend
 * - renegociación con "perfect negotiation" (polite = userId mayor)
 * - detección de "hablando" con AnalyserNode sobre cada stream de audio
 */
export function useVoiceCall(groupId: number) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [peers, setPeers] = useState<CallPeer[]>([]);
  const [selfSpeaking, setSelfSpeaking] = useState(false);
  const [localCamStream, setLocalCamStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] =
    useState<MediaStream | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const entriesRef = useRef<Map<number, PeerEntry>>(new Map());
  const audioElsRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const analysersRef = useRef<Map<number | "self", AnalyserNode>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const closedRef = useRef(false);
  const myIdRef = useRef<number>(getStoredUser()?.id ?? 0);

  const send = useCallback((msg: SignalMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  const updatePeer = useCallback(
    (userId: number, patch: Partial<CallPeer>) => {
      setPeers((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, ...patch } : p)),
      );
    },
    [],
  );

  const attachAnalyser = useCallback(
    (key: number | "self", stream: MediaStream) => {
      try {
        const ctx = (audioCtxRef.current ??= new AudioContext());
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analysersRef.current.set(key, analyser);
      } catch {
        /* sin detección de voz; la llamada sigue funcionando */
      }
    },
    [],
  );

  const localTracks = useCallback((): [MediaStreamTrack, MediaStream][] => {
    const out: [MediaStreamTrack, MediaStream][] = [];
    for (const stream of [
      micStreamRef.current,
      camStreamRef.current,
      screenStreamRef.current,
    ]) {
      if (stream) stream.getTracks().forEach((t) => out.push([t, stream]));
    }
    return out;
  }, []);

  /**
   * Sube el techo del encoder para la pantalla: hasta 60fps y 8 Mbps,
   * degradando resolución antes que fluidez si falta ancho de banda.
   */
  const boostScreenSenders = useCallback(() => {
    const track = screenStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    entriesRef.current.forEach(({ pc }) => {
      pc.getSenders()
        .filter((s) => s.track === track)
        .forEach(async (sender) => {
          try {
            const params = sender.getParameters();
            params.degradationPreference = "maintain-framerate";
            if (!params.encodings?.length) params.encodings = [{}];
            params.encodings[0].maxFramerate = 60;
            params.encodings[0].maxBitrate = 8_000_000;
            await sender.setParameters(params);
          } catch {
            /* navegadores viejos: se queda con los defaults */
          }
        });
    });
  }, []);

  const createEntry = useCallback(
    (peerId: number): PeerEntry => {
      const existing = entriesRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      const entry: PeerEntry = {
        pc,
        polite: myIdRef.current > peerId,
        makingOffer: false,
        ignoreOffer: false,
      };
      entriesRef.current.set(peerId, entry);

      const tracks = localTracks();
      if (tracks.length > 0) {
        tracks.forEach(([t, stream]) => pc.addTrack(t, stream));
        // si ya estamos compartiendo, el sender nuevo también va a 60fps
        boostScreenSenders();
      } else {
        // sin micrófono (permiso denegado) igual se puede escuchar
        pc.addTransceiver("audio", { direction: "recvonly" });
      }

      pc.onnegotiationneeded = async () => {
        try {
          entry.makingOffer = true;
          await pc.setLocalDescription();
          send({
            type: "offer",
            target: peerId,
            sdp: pc.localDescription!.sdp,
          });
        } catch {
          /* la renegociación se reintenta en la próxima señal */
        } finally {
          entry.makingOffer = false;
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send({
            type: "ice-candidate",
            target: peerId,
            candidate: e.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        if (e.track.kind === "audio") {
          let audio = audioElsRef.current.get(peerId);
          if (!audio) {
            audio = new Audio();
            audio.autoplay = true;
            audioElsRef.current.set(peerId, audio);
          }
          audio.srcObject = stream;
          audio.play().catch(() => {});
          attachAnalyser(peerId, stream);
          return;
        }
        // video (cámara o pantalla)
        setPeers((prev) =>
          prev.map((p) =>
            p.userId === peerId
              ? {
                  ...p,
                  videoStreams: [
                    ...p.videoStreams.filter((s) => s.id !== stream.id),
                    stream,
                  ],
                }
              : p,
          ),
        );
        const dropIfEmpty = () => {
          if (stream.getVideoTracks().every((t) => t.readyState === "ended")) {
            setPeers((prev) =>
              prev.map((p) =>
                p.userId === peerId
                  ? {
                      ...p,
                      videoStreams: p.videoStreams.filter(
                        (s) => s.id !== stream.id,
                      ),
                    }
                  : p,
              ),
            );
          }
        };
        e.track.onended = dropIfEmpty;
        e.track.onmute = dropIfEmpty;
      };

      pc.onconnectionstatechange = () => {
        updatePeer(peerId, { connectionState: pc.connectionState });
        if (["failed", "closed"].includes(pc.connectionState)) {
          pc.close();
          entriesRef.current.delete(peerId);
        }
      };

      return entry;
    },
    [attachAnalyser, boostScreenSenders, localTracks, send, updatePeer],
  );

  const asCallPeer = (info: PeerInfo): CallPeer => ({
    ...info,
    speaking: false,
    connectionState: "signaling",
    videoStreams: [],
  });

  const handleMessage = useCallback(
    async (msg: SignalMessage) => {
      switch (msg.type) {
        case "peers": {
          const infos = msg.peers as PeerInfo[];
          setPeers(infos.map(asCallPeer));
          setStatus("connected");
          // crear la pc (con nuestros tracks) dispara onnegotiationneeded → offer
          infos.forEach((p) => createEntry(p.userId));
          break;
        }
        case "peer-joined": {
          const info = msg.peer as PeerInfo;
          setPeers((prev) => [
            ...prev.filter((p) => p.userId !== info.userId),
            asCallPeer(info),
          ]);
          // el recién llegado inicia la negociación hacia nosotros
          break;
        }
        case "peer-left": {
          const userId = msg.userId as number;
          entriesRef.current.get(userId)?.pc.close();
          entriesRef.current.delete(userId);
          audioElsRef.current.get(userId)?.remove();
          audioElsRef.current.delete(userId);
          analysersRef.current.delete(userId);
          setPeers((prev) => prev.filter((p) => p.userId !== userId));
          break;
        }
        case "peer-mute": {
          updatePeer(msg.userId as number, { muted: msg.muted as boolean });
          break;
        }
        case "peer-cam": {
          const userId = msg.userId as number;
          const camOn = msg.camOn as boolean;
          setPeers((prev) =>
            prev.map((p) => {
              if (p.userId !== userId) return p;
              return {
                ...p,
                camOn,
                // cámara apagada: descartar el stream que no es pantalla
                videoStreams: camOn
                  ? p.videoStreams
                  : p.videoStreams.filter((s) => s.id === p.shareStreamId),
              };
            }),
          );
          break;
        }
        case "peer-share": {
          const userId = msg.userId as number;
          const shareStreamId = (msg.shareStreamId as string | null) ?? null;
          setPeers((prev) =>
            prev.map((p) => {
              if (p.userId !== userId) return p;
              return {
                ...p,
                shareStreamId,
                // dejó de compartir: descartar el stream de pantalla anterior
                videoStreams: shareStreamId
                  ? p.videoStreams
                  : p.videoStreams.filter((s) => s.id !== p.shareStreamId),
              };
            }),
          );
          break;
        }
        case "offer": {
          const from = msg.from as number;
          const entry = createEntry(from);
          const { pc } = entry;
          const collision =
            entry.makingOffer || pc.signalingState !== "stable";
          entry.ignoreOffer = !entry.polite && collision;
          if (entry.ignoreOffer) break;
          await pc.setRemoteDescription({
            type: "offer",
            sdp: msg.sdp as string,
          });
          await pc.setLocalDescription();
          send({ type: "answer", target: from, sdp: pc.localDescription!.sdp });
          break;
        }
        case "answer": {
          const entry = entriesRef.current.get(msg.from as number);
          if (entry && entry.pc.signalingState === "have-local-offer") {
            await entry.pc.setRemoteDescription({
              type: "answer",
              sdp: msg.sdp as string,
            });
          }
          break;
        }
        case "ice-candidate": {
          const entry = entriesRef.current.get(msg.from as number);
          if (entry && msg.candidate) {
            try {
              await entry.pc.addIceCandidate(
                msg.candidate as RTCIceCandidateInit,
              );
            } catch {
              /* candidato de una offer ignorada o tardío */
            }
          }
          break;
        }
      }
    },
    [createEntry, send, updatePeer],
  );

  // conexión: micrófono + websocket
  // `cancelled` es local al efecto: con el doble montaje de StrictMode cada
  // ejecución cancela solo su propia conexión, sin abrir dos WebSockets.
  useEffect(() => {
    let cancelled = false;
    closedRef.current = false;
    setStatus("connecting");

    let ws: WebSocket | null = null;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        micStreamRef.current = stream;
        attachAnalyser("self", stream);
      } catch {
        if (cancelled) return;
        setError(
          "No se pudo acceder al micrófono. Revisa permisos del navegador.",
        );
        // seguimos: se puede estar en la sala solo escuchando
      }
      if (cancelled) return;

      const token = getToken() ?? "";
      ws = new WebSocket(`${wsBase()}/ws/call/${groupId}?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          handleMessage(JSON.parse(e.data));
        } catch {
          /* mensaje no-JSON, ignorar */
        }
      };
      ws.onclose = (e) => {
        if (!cancelled && !closedRef.current) {
          setStatus("error");
          setError(
            e.code === 4401
              ? "Sesión expirada, vuelve a iniciar sesión"
              : e.code === 4409
                ? "Entraste a esta sala desde otra pestaña"
                : "Conexión con el servidor perdida",
          );
        }
      };
      ws.onerror = () => {
        if (!cancelled && !closedRef.current) setStatus("error");
      };
    })();

    return () => {
      cancelled = true;
      closedRef.current = true;
      ws?.close();
      wsRef.current = null;
      entriesRef.current.forEach((e) => e.pc.close());
      entriesRef.current.clear();
      audioElsRef.current.forEach((a) => {
        a.srcObject = null;
        a.remove();
      });
      audioElsRef.current.clear();
      analysersRef.current.clear();
      for (const ref of [micStreamRef, camStreamRef, screenStreamRef]) {
        ref.current?.getTracks().forEach((t) => t.stop());
        ref.current = null;
      }
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, [groupId, attachAnalyser, handleMessage]);

  // sondeo de niveles de voz (¿quién habla?)
  useEffect(() => {
    const buf = new Uint8Array(256);
    const timer = setInterval(() => {
      analysersRef.current.forEach((analyser, key) => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const speaking = Math.sqrt(sum / buf.length) > 0.04;
        if (key === "self") setSelfSpeaking(speaking && micOn);
        else updatePeer(key, { speaking });
      });
    }, 220);
    return () => clearInterval(timer);
  }, [micOn, updatePeer]);

  const toggleMic = useCallback(() => {
    const stream = micStreamRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
    send({ type: next ? "unmute" : "mute" });
  }, [micOn, send]);

  const removeLocalStream = useCallback((stream: MediaStream) => {
    const tracks = stream.getTracks();
    entriesRef.current.forEach(({ pc }) => {
      pc.getSenders()
        .filter((s) => s.track && tracks.includes(s.track))
        .forEach((s) => pc.removeTrack(s));
    });
    tracks.forEach((t) => t.stop());
  }, []);

  const toggleCam = useCallback(async () => {
    if (camOn) {
      const stream = camStreamRef.current;
      if (stream) removeLocalStream(stream);
      camStreamRef.current = null;
      setLocalCamStream(null);
      setCamOn(false);
      send({ type: "cam-off" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      camStreamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      track.onended = () => {
        // cámara desconectada/revocada
        camStreamRef.current = null;
        setLocalCamStream(null);
        setCamOn(false);
        send({ type: "cam-off" });
      };
      entriesRef.current.forEach(({ pc }) => pc.addTrack(track, stream));
      setLocalCamStream(stream);
      setCamOn(true);
      send({ type: "cam-on" });
    } catch {
      setError("No se pudo acceder a la cámara. Revisa permisos.");
    }
  }, [camOn, removeLocalStream, send]);

  const stopShare = useCallback(() => {
    const stream = screenStreamRef.current;
    if (stream) removeLocalStream(stream);
    screenStreamRef.current = null;
    setLocalScreenStream(null);
    setSharing(false);
    send({ type: "share-stop" });
  }, [removeLocalStream, send]);

  const toggleShare = useCallback(async () => {
    if (sharing) {
      stopShare();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 2560 },
          height: { ideal: 1440 },
        },
        audio: false,
      });
      screenStreamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      // sesga el encoder hacia fluidez (movimiento) en vez de nitidez de texto
      track.contentHint = "motion";
      // el usuario puede cortar desde el propio chrome del navegador
      track.onended = stopShare;
      entriesRef.current.forEach(({ pc }) => pc.addTrack(track, stream));
      boostScreenSenders();
      setLocalScreenStream(stream);
      setSharing(true);
      send({ type: "share-start", streamId: stream.id });
    } catch {
      /* usuario canceló el diálogo de compartir */
    }
  }, [sharing, stopShare, send, boostScreenSenders]);

  const sampleShareStats = useCallback(
    async (
      track: MediaStreamTrack,
      remoteUserId: number | null,
    ): Promise<ShareStatsSnapshot | null> => {
      const entries =
        remoteUserId != null
          ? [entriesRef.current.get(remoteUserId)].filter(
              (e): e is PeerEntry => e != null,
            )
          : [...entriesRef.current.values()];
      if (entries.length === 0) return null;

      const snap: ShareStatsSnapshot = {
        timestamp: performance.now(),
        direction: remoteUserId != null ? "inbound" : "outbound",
        bytes: 0,
        frameWidth: null,
        frameHeight: null,
        fps: null,
        codec: null,
        packetsLost: null,
        jitterMs: null,
        rttMs: null,
      };

      let detailDone = false;
      for (const { pc } of entries) {
        let report: RTCStatsReport;
        try {
          report = await pc.getStats();
        } catch {
          continue;
        }
        const byId = new Map<string, Record<string, unknown>>();
        report.forEach((s) => byId.set(s.id, s as Record<string, unknown>));

        report.forEach((raw) => {
          const s = raw as Record<string, unknown>;
          if (
            snap.direction === "inbound" &&
            s.type === "inbound-rtp" &&
            s.kind === "video" &&
            s.trackIdentifier === track.id
          ) {
            snap.bytes += (s.bytesReceived as number) ?? 0;
            if (!detailDone) {
              snap.frameWidth = (s.frameWidth as number) ?? null;
              snap.frameHeight = (s.frameHeight as number) ?? null;
              snap.fps = (s.framesPerSecond as number) ?? null;
              snap.packetsLost = (s.packetsLost as number) ?? null;
              snap.jitterMs =
                s.jitter != null ? Math.round((s.jitter as number) * 1000) : null;
              const codec = s.codecId
                ? byId.get(s.codecId as string)
                : undefined;
              snap.codec = (codec?.mimeType as string) ?? null;
              detailDone = true;
            }
          }
          if (
            snap.direction === "outbound" &&
            s.type === "outbound-rtp" &&
            s.kind === "video"
          ) {
            const src = s.mediaSourceId
              ? byId.get(s.mediaSourceId as string)
              : undefined;
            if (src?.trackIdentifier === track.id) {
              snap.bytes += (s.bytesSent as number) ?? 0;
              if (!detailDone) {
                snap.frameWidth = (s.frameWidth as number) ?? null;
                snap.frameHeight = (s.frameHeight as number) ?? null;
                snap.fps = (s.framesPerSecond as number) ?? null;
                const codec = s.codecId
                  ? byId.get(s.codecId as string)
                  : undefined;
                snap.codec = (codec?.mimeType as string) ?? null;
                detailDone = true;
              }
            }
          }
          if (
            s.type === "candidate-pair" &&
            s.state === "succeeded" &&
            s.nominated === true &&
            s.currentRoundTripTime != null &&
            snap.rttMs == null
          ) {
            snap.rttMs = Math.round((s.currentRoundTripTime as number) * 1000);
          }
        });
      }
      return snap;
    },
    [],
  );

  return {
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
  };
}
