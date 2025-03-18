/**
 * Content Processor Module
 * 
 * Handles reading, parsing, and chunking of content files
 */
import { join, basename } from 'path';
import colors from '../utils/colors';
import { extractTextFromPDF, getPDFMetadata, isValidPDFExtension } from '../parsers/pdfParser';
import { createProgressBar } from '../utils/progressBar';
import type { ComputeInfo } from '../types';

/**
 * Reads and chunks content from a file
 * @param filePath Path to the file to read
 * @param chunkSize Size of chunks in words
 * @returns Array of text chunks
 */
export async function readAndChunkContent(filePath: string, chunkSize = 4000): Promise<string[]> {
    try {
        let content: string;
        
        // Check if the file is a PDF
        if (isValidPDFExtension(filePath)) {
            // Use our PDF parser for PDF files
            console.log(colors.blue(`Parsing PDF file: ${filePath}`));
            
            // Show metadata about the PDF
            const metadata = await getPDFMetadata(filePath);
            console.log(colors.gray(`PDF has ${metadata.pageCount} pages`));
            
            // Extract text content
            content = await extractTextFromPDF(filePath);
            
            // Check if extraction was successful
            if (!content || content.startsWith('PDF_EXTRACTION_') || content.trim().length < 100) {
                console.warn(colors.yellow(`Warning: PDF extraction yielded limited text. Proceeding with what was extracted.`));
                // If we got very little content, add a notice
                if (content.trim().length < 100) {
                  content = `NOTE: This PDF could not be fully parsed. Limited text extraction was possible.\n\n${content}`;
                }
            } else {
                console.log(colors.green(`Successfully extracted ${content.length} characters from PDF`));
            }
        } else {
            // For other files (txt, etc.), use the existing method
            content = await Bun.file(filePath).text();
        }

        // Ensure we have some content to work with
        if (!content || content.trim().length === 0) {
            console.error(colors.red(`No usable content extracted from ${filePath}`));
            return [];
        }

        // Split into words and create chunks
        const words = content.split(/\s+/);
        const chunks = [];

        for (let i = 0; i < words.length; i += chunkSize) {
            chunks.push(words.slice(i, i + chunkSize).join(' '));
        }

        console.log(colors.gray(`Created ${chunks.length} chunks from the content`));
        
        // If we have very few chunks, print a sample to verify content
        if (chunks.length === 1) {
            const sample = chunks[0].substring(0, 100);
            console.log(colors.gray(`Content sample: ${sample}...`));
        }

        return chunks;
    } catch (error) {
        console.error(colors.red(`Error reading file ${filePath}: ${(error as Error).message}`));
        return [];
    }
}

/**
 * Sanitizes an object by replacing null values with empty strings or defaults
 * @param obj Object to sanitize
 * @returns Sanitized object with nulls replaced appropriately
 */
function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const result = { ...obj } as { [key: string]: any };
    
    for (const [key, value] of Object.entries(result)) {
        if (value === null) {
            // Replace null with appropriate default
            if (Array.isArray(obj[key])) {
                result[key] = [];
            } else if (typeof obj[key] === 'string') {
                result[key] = '';
            } else if (typeof obj[key] === 'number') {
                result[key] = 0;
            } else if (typeof obj[key] === 'boolean') {
                result[key] = false;
            } else if (typeof obj[key] === 'object') {
                result[key] = {};
            }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Recursively sanitize nested objects
            result[key] = sanitizeObject(value);
        }
    }
    
    return result as T;
}

/**
 * Reads compute info from a JSON file
 * @param computeInfoPath Path to the compute info JSON file
 * @returns Compute information object
 */
export async function readComputeInfo(computeInfoPath: string): Promise<ComputeInfo> {
    try {
        const file = Bun.file(computeInfoPath);
        if (file.size > 0) {
            const rawInfo = await file.json();
            // Sanitize the compute info to replace null values
            return sanitizeObject(rawInfo);
        }
        return {};
    } catch (error) {
        console.error(colors.red(`Error reading compute info: ${(error as Error).message}`));
        return {};
    }
}

/**
 * Checks if a file exists
 * @param path Path to check
 * @returns True if file exists and has size > 0
 */
export function existsSync(path: string): boolean {
    try {
        return Bun.file(path).size > 0;
    } catch {
        return false;
    }
}