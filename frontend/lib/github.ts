import { api } from "@/lib/api";

export interface GhStatus {
  connected: boolean;
  login: string | null;
  avatar_url: string | null;
}

export interface GhRepo {
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  default_branch: string;
  pushed_at: string | null;
  description: string | null;
}

export interface GhBranch {
  name: string;
  sha: string;
}

export interface GhTreeEntry {
  path: string;
  type: "blob" | "tree";
  size: number | null;
  sha: string;
}

export interface GhTree {
  head_sha: string;
  truncated: boolean;
  entries: GhTreeEntry[];
}

export interface GhFile {
  path: string;
  sha: string;
  size: number;
  is_binary: boolean;
  is_image: boolean;
  too_large: boolean;
  /** texto plano; base64 si is_image */
  content: string | null;
}

export interface GhCommitResult {
  new_head_sha: string;
  commit_url: string;
}

export interface GhPullFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  previous_filename: string | null;
}

export interface GhPullResult {
  up_to_date: boolean;
  head_sha: string;
  full_refresh: boolean;
  files: GhPullFile[];
}

export const ghStatus = () => api<GhStatus>("/api/github/status");

export const ghConnectUrl = () =>
  api<{ authorize_url: string }>(
    // el backend firma este origen en el state para devolvernos aquí tras el callback
    `/api/github/connect?origin=${encodeURIComponent(window.location.origin)}`,
  );

export const ghDisconnect = () =>
  api<void>("/api/github/disconnect", { method: "DELETE" });

export const ghRepos = (page = 1) => api<GhRepo[]>(`/api/github/repos?page=${page}`);

export const ghBranches = (owner: string, repo: string) =>
  api<GhBranch[]>(`/api/github/repos/${owner}/${repo}/branches`);

export const ghTree = (owner: string, repo: string, branch: string) =>
  api<GhTree>(
    `/api/github/repos/${owner}/${repo}/tree?branch=${encodeURIComponent(branch)}`,
  );

export const ghFile = (owner: string, repo: string, path: string, ref: string) =>
  api<GhFile>(
    `/api/github/repos/${owner}/${repo}/file?path=${encodeURIComponent(path)}&ref=${encodeURIComponent(ref)}`,
  );

export const ghCommit = (
  owner: string,
  repo: string,
  body: {
    branch: string;
    expected_head_sha: string;
    message: string;
    files: { path: string; content: string }[];
  },
) =>
  api<GhCommitResult>(`/api/github/repos/${owner}/${repo}/commit`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const ghPull = (
  owner: string,
  repo: string,
  branch: string,
  sinceSha: string,
) =>
  api<GhPullResult>(
    `/api/github/repos/${owner}/${repo}/pull?branch=${encodeURIComponent(branch)}&since_sha=${sinceSha}`,
  );
