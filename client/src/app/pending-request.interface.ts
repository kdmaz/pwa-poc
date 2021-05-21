import { Id } from './id.type';

export interface PendingRequest {
  id: Id;
  httpMethod: string;
  url: string;
  body: any;
  timestamp: number;
}
