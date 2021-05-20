export interface RequestEntity {
  id: string | number;
  httpMethod: string;
  url: string;
  body: any;
  timestamp: number;
}
