// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// User Types
export interface UserResponse {
  id: string;
  clerkId: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  createdAt: string;
}

// Pair Types
export interface PairResponse {
  id: string;
  user1Id: string;
  user2Id: string;
  pairedAt: string;
  partner: UserResponse;
}

// Moment Types
export interface MomentResponse {
  id: string;
  pairId: string;
  uploaderId: string;
  uploadedAt: string;
}

// Code Types
export interface CodeResponse {
  code: string;
  expiresAt: string;
}

// Socket Event Types
export interface SocketEvents {
  join_room: { userId: string };
  new_moment: { momentId: string; uploadedBy: string; uploadedAt: string };
  partner_disconnected: { reason: string };
  partner_updated: { displayName: string };
  moment_received: { momentId: string };
}
