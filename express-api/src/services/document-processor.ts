import fs from 'fs-extra';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TextExtractionResult } from '../types/document';

/**
 * Extracts text from PDF files
 */
export async function extractTextFromPDF(filePath: string): Promise<TextExtractionResult> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    
    return {
      text: pdfData.text,
      metadata: {
        pageCount: pdfData.numpages,
        author: pdfData.info?.Author,
        title: pdfData.info?.Title,
        creationDate: pdfData.info?.CreationDate,
        isEncrypted: pdfData.info?.IsEncrypted
      },
      method: 'pdf-parse'
    };
  } catch (error: any) {
    // Check if error message suggests password protection
    if (error.message?.includes('password')) {
      throw Object.assign(new Error('PDF is password protected'), {
        code: 'PASSWORD_PROTECTED',
        original: error
      });
    }
    
    throw Object.assign(new Error('Failed to extract text from PDF'), {
      code: 'EXTRACTION_FAILED',
      original: error
    });
  }
}

/**
 * Extracts text from DOCX files
 */
export async function extractTextFromDOCX(filePath: string): Promise<TextExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    
    return {
      text: result.value,
      metadata: {
        // DOCX doesn't provide metadata through mammoth directly
        // For production, you might want to add a library to extract DOCX metadata
      },
      method: 'mammoth'
    };
  } catch (error) {
    throw Object.assign(new Error('Failed to extract text from DOCX'), {
      code: 'EXTRACTION_FAILED',
      original: error
    });
  }
}

/**
 * Extracts text from TXT files
 */
export async function extractTextFromTXT(filePath: string): Promise<TextExtractionResult> {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    
    return {
      text,
      metadata: {
        // Basic metadata that can be inferred
        creationDate: new Date().toISOString()
      },
      method: 'fs-readFile'
    };
  } catch (error) {
    throw Object.assign(new Error('Failed to extract text from text file'), {
      code: 'EXTRACTION_FAILED',
      original: error
    });
  }
}

/**
 * Process any supported document type
 */
export async function processDocument(
  filePath: string, 
  originalFilename: string, 
  mimeType: string,
  fileSize: number
): Promise<TextExtractionResult> {
  const extension = path.extname(originalFilename).toLowerCase();
  
  try {
    let result: TextExtractionResult;
    
    if (mimeType === 'application/pdf' || extension === '.pdf') {
      result = await extractTextFromPDF(filePath);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      extension === '.docx'
    ) {
      result = await extractTextFromDOCX(filePath);
    } else if (
      mimeType === 'text/plain' || 
      extension === '.txt' || 
      extension === '.md' || 
      extension === '.rtf'
    ) {
      result = await extractTextFromTXT(filePath);
    } else {
      throw Object.assign(new Error(`Unsupported file type: ${mimeType}`), {
        code: 'UNSUPPORTED_FORMAT'
      });
    }
    
    return result;
  } catch (error: any) {
    console.error(`Error processing document: ${error.message}`, error);
    throw error;
  } finally {
    // Clean up the file after processing (optional - you might want to keep files)
    try {
      await fs.remove(filePath);
    } catch (cleanupError) {
      console.error('Error removing temporary file:', cleanupError);
    }
  }
}