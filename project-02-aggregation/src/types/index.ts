
export interface IUser {
  _id?: string;
  email: string;
  name: string;
  accountType: string;
  createdAt?: Date;
}

export interface ITransaction {
  _id?: string;
  userId: string;
  amount: number;
  currency: string;
  category: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  metadata?: {
    merchant: string;
    channel: string;
  };
}

export interface QueryResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}