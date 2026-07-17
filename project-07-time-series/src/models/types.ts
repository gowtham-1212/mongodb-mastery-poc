import { ObjectId } from 'mongodb';

export interface ITransactionMetadata {
  merchantId: string;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  transactionRef: string;
}

export interface ITransaction {
  _id?: ObjectId;
  timestamp: Date; // The timeField
  metadata: ITransactionMetadata; // The metaField
  amount: number;
  paymentMethod: string;

}