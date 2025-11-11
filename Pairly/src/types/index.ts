// User Types
export interface User {
  id: string;
  clerkId: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  createdAt: string;
}

// Pair Types
export interface Pair {
  id: string;
  user1Id: string;
  user2Id: string;
  inviteCode?: string;
  pairedAt: string;
  partner: User;
}

// Moment Types
export interface Moment {
  id: string;
  pairId: string;
  uploaderId: string;
  photoData: string; // base64 encoded
  uploadedAt: string;
}

// Photo Types
export interface PhotoAsset {
  uri: string;
  type: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
}

export interface CompressedPhoto {
  base64: string;
  mimeType: string;
  size: number;
}

export interface UploadResult {
  success: boolean;
  momentId?: string;
  error?: string;
}

// Widget Types
export interface WidgetData {
  photoBase64: string;
  partnerName: string;
  lastUpdated: string;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Pairing: undefined;
  Upload: undefined;
  Settings: undefined;
};

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PairResponse {
  id: string;
  user1Id: string;
  user2Id: string;
  pairedAt: string;
}

export interface PairWithPartnerResponse {
  pair: PairResponse;
  partner: User;
}

export interface CodeResponse {
  code: string;
  expiresAt: string;
}
