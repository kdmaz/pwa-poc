import { Id } from './id.type';

export interface RequestEntity {
  id: Id;
  httpMethod: string;
  url: string;
  body: any;
  timestamp: number;
}
