declare module 'mammoth' {
    interface ExtractOptions {
      path?: string;
      buffer?: Buffer;
      arrayBuffer?: ArrayBuffer;
    }
  
    interface ConversionResult {
      value: string;
      messages: Array<{
        type: string;
        message: string;
        // Add other properties if needed
      }>;
    }
  
    function extractRawText(options: ExtractOptions): Promise<ConversionResult>;
    function convertToHtml(options: ExtractOptions): Promise<ConversionResult>;
  
    export { extractRawText, convertToHtml };
  }