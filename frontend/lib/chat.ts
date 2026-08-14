import { api, apiUpload } from "@/lib/api";

export interface ChatAttachment {
  name: string;
  url: string;
  size: number;
  mime: string;
}

/** Mismo shape (camelCase) que el payload WS "chat-message" del backend. */
export interface ChatMessage {
  id: number;
  groupId: number;
  userId: number;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  body: string;
  attachment: ChatAttachment | null;
  createdAt: string;
}

/** Respuesta snake_case del REST (ChatMessageOut de FastAPI). */
interface ApiMessage {
  id: number;
  group_id: number;
  user_id: number;
  body: string;
  attachment_name: string | null;
  attachment_url: string | null;
  attachment_size: number | null;
  attachment_mime: string | null;
  created_at: string;
  user: {
    display_name: string;
    initials: string;
    avatar_url: string | null;
  };
}

function fromApi(raw: ApiMessage): ChatMessage {
  return {
    id: raw.id,
    groupId: raw.group_id,
    userId: raw.user_id,
    displayName: raw.user.display_name,
    initials: raw.user.initials,
    avatarUrl: raw.user.avatar_url,
    body: raw.body,
    attachment: raw.attachment_url
      ? {
          name: raw.attachment_name ?? "archivo",
          url: raw.attachment_url,
          size: raw.attachment_size ?? 0,
          mime: raw.attachment_mime ?? "application/octet-stream",
        }
      : null,
    createdAt: raw.created_at,
  };
}

export async function fetchMessages(
  groupId: number,
  beforeId?: number,
): Promise<ChatMessage[]> {
  const query = beforeId != null ? `?before_id=${beforeId}` : "";
  const rows = await api<ApiMessage[]>(`/api/groups/${groupId}/messages${query}`);
  return rows.map(fromApi);
}

export async function sendMessage(
  groupId: number,
  body: string,
  attachment?: ChatAttachment,
): Promise<ChatMessage> {
  const raw = await api<ApiMessage>(`/api/groups/${groupId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body, attachment: attachment ?? null }),
  });
  return fromApi(raw);
}

export const uploadAttachment = (groupId: number, file: File) =>
  apiUpload<ChatAttachment>(`/api/groups/${groupId}/attachments`, file);

export const MAX_CHAT_FILE_BYTES = 20 * 1024 * 1024;
