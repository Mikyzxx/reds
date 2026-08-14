export interface User {
  id: number;
  email: string;
  username: string;
  display_name: string;
  initials: string;
  avatar_url: string | null;
}

export interface Group {
  id: number;
  name: string;
  slug: string;
  description: string;
  created_by: number;
  created_at: string;
  members: User[];
  is_member: boolean;
  active_call_count: number;
}

export type TaskStatus =
  | "pendiente"
  | "en_progreso"
  | "en_prueba"
  | "terminado";

export type TaskPriority = "alta" | "media" | "baja";

export interface Task {
  id: number;
  group_id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: number | null;
  assignee: User | null;
  created_by: number;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PeerInfo {
  userId: number;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  muted: boolean;
  camOn: boolean;
  shareStreamId: string | null;
}
