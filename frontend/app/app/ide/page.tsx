"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import ConnectGitHub from "@/components/ide/ConnectGitHub";
import IdeWorkspace from "@/components/ide/IdeWorkspace";
import RepoPicker from "@/components/ide/RepoPicker";
import { ghDisconnect, ghStatus, type GhRepo, type GhStatus } from "@/lib/github";

function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="animate-nexapulse font-mono text-[11px] tracking-[3px] text-cyan">
        CARGANDO IDE…
      </span>
    </div>
  );
}

function IdeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<GhStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [repo, setRepo] = useState<GhRepo | null>(null);
  const [branch, setBranch] = useState<string>("");

  // Resultado del callback OAuth (?github=connected|error) — limpiar la URL
  useEffect(() => {
    const gh = searchParams.get("github");
    if (!gh) return;
    if (gh === "error") {
      setCallbackError(searchParams.get("reason") ?? "desconocido");
    }
    router.replace("/app/ide");
  }, [searchParams, router]);

  const refreshStatus = useCallback(() => {
    setChecking(true);
    ghStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false, login: null, avatar_url: null }))
      .finally(() => setChecking(false));
  }, []);

  useEffect(refreshStatus, [refreshStatus]);

  // El token de GitHub dejó de funcionar (revocado/expirado)
  const onAuthLost = useCallback(() => {
    setRepo(null);
    setStatus({ connected: false, login: null, avatar_url: null });
    setCallbackError("token_invalido");
  }, []);

  const onDisconnect = useCallback(async () => {
    await ghDisconnect();
    setRepo(null);
    setStatus({ connected: false, login: null, avatar_url: null });
    setCallbackError(null);
  }, []);

  if (checking) return <Loading />;

  if (!status?.connected) {
    return <ConnectGitHub error={callbackError} />;
  }

  if (!repo) {
    return (
      <RepoPicker
        login={status.login}
        avatarUrl={status.avatar_url}
        onOpen={(r) => {
          setRepo(r);
          setBranch(r.default_branch);
        }}
        onDisconnect={onDisconnect}
      />
    );
  }

  return (
    <IdeWorkspace
      repo={repo}
      branch={branch}
      onBranchChange={setBranch}
      onExit={() => setRepo(null)}
      onAuthLost={onAuthLost}
    />
  );
}

export default function IdePage() {
  return (
    <Suspense fallback={<Loading />}>
      <IdeContent />
    </Suspense>
  );
}
