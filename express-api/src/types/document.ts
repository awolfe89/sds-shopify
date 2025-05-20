export interface ProcessedDocument {
    id: string;
    filename: string;
    contentType: string;
    fileSize: number;
    extractedText: string;
    status: 'processed' | 'error';
    metadata?: {
      title?: string;
      author?: string;
      created?: string;
      pages?: number;
      language?: string;
      structure?: {
        headings?: string[];
        paragraphs?: number;
        tables?: number;
        hasImages?: boolean;
      };
    };
    errorDetails?: {
      code: string;
      message: string;
      details?: unknown;
    };
  }
  
  export interface UploadResponse {
    success: boolean;
    jobId?: string;
    uploads?: Array<{
      id: string;
      filename: string;
      contentType: string;
      fileSize: number;
      status: 'pending' | 'processing' | 'processed' | 'error';
      progress: number;
      securityScanStatus?: 'pending' | 'passed' | 'failed';
      createdAt: string;
    }>;
    errors?: Array<{
      code: string;
      message: string;
      filename?: string;
      suggestion?: string;
      details?: unknown;
    }>;
  }
  
  export interface TextExtractionResult {
    text: string;
    metadata: {
      pageCount?: number;
      author?: string;
      title?: string;
      creationDate?: string;
      isEncrypted?: boolean;
      [key: string]: any;
    };
    method: string;
  }