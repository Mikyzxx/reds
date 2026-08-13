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

export interface PeerInfo {
  userId: number;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  muted: boolean;
  camOn: boolean;
  shareStreamId: string | null;
}
