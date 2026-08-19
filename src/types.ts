export interface Shirt {
  id?: string;
  userId: string;
  team: string;
  season: string;
  type: string;
  brand: string;
  size: string;
  condition: string;
  price: number;
  purchaseDate?: string;
  purchaseLocation?: string;
  authenticityTag?: string;
  autographed?: boolean;
  autographDetails?: string;
  isCustomized?: boolean;
  customizationDetails?: string;
  notes?: string;
  imageUrls?: string[];
  imageBgColor?: string;
  isFavorite?: boolean;
  createdAt: number;
}

export interface WishlistShirt {
  id?: string;
  userId: string;
  team: string;
  season: string;
  type: string;
  brand: string;
  notes?: string;
  imageUrls?: string[];
  imageBgColor?: string;
  createdAt: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
