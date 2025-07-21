export interface FileItem {
  name: string;
  type: string;
  size: number;
  lastModified?: number;
  url?: string;
  [key: string]: any;
}
