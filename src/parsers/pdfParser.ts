/**
 * PDF Parser Module
 * 
 * Provides functionality for extracting text and metadata from PDF files
 * using multiple extraction techniques for reliability.
 */
import pdfParse from 'pdf-parse';
import colors from '../utils/colors';

/**
 * Extracts and returns all text content from a PDF file
 * @param filePath Path to the PDF file
 * @returns Promise resolving to the extracted text content
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
    try {
        console.log(colors.blue('Starting PDF extraction with primary method...'));

        // Read the PDF file as buffer
        const dataBuffer = await Bun.file(filePath).arrayBuffer();

        // First attempt: Use pdf-parse with proper options
        try {
            const options: pdfParse.Options = {
                max: 0,
            };

            const result = await pdfParse(Buffer.from(dataBuffer), options);

            if (result.text && result.text.trim().length > 0) {
                console.log(colors.green('Text extracted successfully with primary method'));
                // Do some basic text cleanup
                return normalizeText(result.text);
            } else {
                console.log(colors.yellow('Primary extraction method returned no text, trying fallback...'));
            }
        } catch (err) {
            console.log(colors.yellow(`Primary extraction method failed: ${(err as Error).message}`));
        }

        // Second attempt: Try raw extraction technique
        console.log(colors.blue('Trying secondary extraction method...'));
        const rawText = await extractTextUsingRawMethod(dataBuffer);

        if (rawText && rawText.trim().length > 0) {
            console.log(colors.green('Text extracted successfully with secondary method'));
            return normalizeText(rawText);
        }

        // Third attempt: Use character pattern detection
        console.log(colors.blue('Trying text pattern extraction...'));
        const patternText = extractTextByPatterns(dataBuffer);

        if (patternText && patternText.trim().length > 0) {
            console.log(colors.green('Text extracted successfully with pattern detection'));
            return normalizeText(patternText);
        }

        // If we get here, all methods failed
        console.warn(colors.yellow('All extraction methods failed to get meaningful text'));
        return "PDF_EXTRACTION_FAILED: Could not extract readable text from this PDF. The file may be scanned, image-based, or protected.";
    } catch (error) {
        console.error(colors.red(`Error in PDF extraction process: ${(error as Error).message}`));
        return `PDF_EXTRACTION_ERROR: ${(error as Error).message}`;
    }
}

/**
 * Normalize and clean up extracted text
 */
function normalizeText(text: string): string {
    return text
        // Replace multiple line breaks with single ones
        .replace(/\n{3,}/g, '\n\n')
        // Replace multiple spaces with single ones
        .replace(/[ \t]+/g, ' ')
        // Fix spacing after periods
        .replace(/\.(?=[A-Z])/g, '. ')
        // Trim whitespace
        .trim();
}

/**
 * Raw extraction method that relies on PDF structure
 */
async function extractTextUsingRawMethod(pdfBuffer: ArrayBuffer): Promise<string> {
    try {
        // Convert buffer to UTF-8 string for text searching
        const data = new TextDecoder().decode(new Uint8Array(pdfBuffer));

        // Extract text streams
        const textRegex = /BT\s*([^]*?)\s*ET/gs;
        const textMatches = Array.from(data.matchAll(textRegex));

        let extractedText = '';

        for (const match of textMatches) {
            const textBlock = match[1];

            // Look for text strings in parentheses or hex-encoded text
            const stringRegex = /\(([^\)\\]+|\\[\\()|])*\)/g;
            const hexRegex = /<([0-9A-Fa-f]+)>/g;

            // Extract regular strings
            const strings = Array.from(textBlock.matchAll(stringRegex))
                .map(m => m[0].slice(1, -1)
                    .replace(/\\\(/g, '(')
                    .replace(/\\\)/g, ')')
                    .replace(/\\\\/g, '\\'));

            // Extract hex strings
            const hexStrings = Array.from(textBlock.matchAll(hexRegex))
                .map(m => {
                    try {
                        const hex = m[1];
                        let str = '';
                        for (let i = 0; i < hex.length; i += 2) {
                            const charCode = parseInt(hex.substr(i, 2), 16);
                            if (charCode > 31 && charCode < 127) { // ASCII printable
                                str += String.fromCharCode(charCode);
                            }
                        }
                        return str;
                    } catch (e) {
                        return '';
                    }
                });

            // Combine extracted strings
            extractedText += strings.join(' ') + ' ' + hexStrings.join(' ') + '\n';
        }

        return extractedText;
    } catch (error) {
        console.warn(colors.yellow(`Raw extraction method failed: ${(error as Error).message}`));
        return '';
    }
}

/**
 * Pattern-based extraction that looks for common text patterns in PDF data
 */
function extractTextByPatterns(pdfBuffer: ArrayBuffer): string {
    try {
        const data = new TextDecoder().decode(new Uint8Array(pdfBuffer));
        let extractedText = '';

        // Look for text object patterns
        const patterns = [
            // Look for text in parentheses (most common)
            /\(([^\)\\]+|\\[\\()|])*\)/g,

            // Look for Tj operators with preceding text
            /\([^\)]+\)\s*Tj/g,

            // Look for TJ arrays
            /\[\s*(\([^\)]+\)\s*)*\]\s*TJ/g,

            // Look for encoding declarations
            /\/Encoding\s*<<\s*\/Differences\s*\[\s*[^\]]+\]/g,
        ];

        // Try each pattern
        for (const pattern of patterns) {
            const matches = data.match(pattern) || [];

            // Process matches for this pattern
            for (const match of matches) {
                // Extract content in parentheses
                const innerContent = match.match(/\(([^\)\\]+|\\[\\()|])*\)/g) || [];
                for (const content of innerContent) {
                    // Remove parentheses and handle escapes
                    const text = content.slice(1, -1)
                        .replace(/\\\(/g, '(')
                        .replace(/\\\)/g, ')')
                        .replace(/\\\\/g, '\\');

                    // Filter out non-text content (like coordinate numbers)
                    if (text.length > 1 && !/^[\d\s.,-]+$/.test(text)) {
                        extractedText += text + ' ';
                    }
                }
            }

            // If we got meaningful text, break and return
            if (extractedText.trim().length > 100) {
                break;
            }
        }

        // Add paragraph breaks based on patterns
        return extractedText
            .replace(/\. ([A-Z])/g, '.\n\n$1')
            .replace(/\s{2,}/g, ' ')
            .trim();

    } catch (error) {
        console.warn(colors.yellow(`Pattern extraction method failed: ${(error as Error).message}`));
        return '';
    }
}

/**
 * Gets information about the PDF structure
 * @param filePath Path to the PDF file
 * @returns Promise resolving to object with PDF metadata
 */
export async function getPDFMetadata(filePath: string): Promise<{
    pageCount: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
}> {
    try {
        const dataBuffer = await Bun.file(filePath).arrayBuffer();

        // Configure options
        const option: pdfParse.Options = {
            max: 0, // Get all pages
        };

        // Use pdf-parse for metadata extraction
        const data = await pdfParse(Buffer.from(dataBuffer), option);

        // Extract PDF info
        const info: Record<string, any> = {};
        if (data.info) {
            Object.keys(data.info).forEach(key => {
                // Convert Buffer to string if necessary
                const value = data.info[key];
                info[key] = Buffer.isBuffer(value) ? value.toString() : value;
            });
        }

        return {
            pageCount: data.numpages || 0,
            info,
            metadata: data.metadata || {}
        };
    } catch (error) {
        console.error(colors.red(`Error getting PDF metadata for ${filePath}: ${(error as Error).message}`));

        // Try to at least get page count through other means
        try {
            const data = await Bun.file(filePath).arrayBuffer();
            const text = new TextDecoder().decode(new Uint8Array(data));

            // Look for page count pattern in PDF structure
            const pageCountRegex = /\/Count\s+(\d+)/;
            const match = text.match(pageCountRegex);
            const pageCount = match ? parseInt(match[1]) : 0;

            return {
                pageCount,
                info: { _note: "Limited metadata - extraction error" },
                metadata: {}
            };
        } catch (e) {
            // Complete fallback
            return {
                pageCount: 0,
                info: {},
                metadata: {}
            };
        }
    }
}

// Additional utility functions 
export function isValidPDFExtension(filename: string): boolean {
    return filename.toLowerCase().endsWith('.pdf');
}

export function getPageDiagnostics(filePath: string): Promise<string> {
    return new Promise(async (resolve) => {
        try {
            const dataBuffer = await Bun.file(filePath).arrayBuffer();
            const data = await pdfParse(Buffer.from(dataBuffer), { max: 1 });

            resolve(`
PDF Diagnostics:
--------------
Page count: ${data.numpages}
Version: ${data.info?.PDFFormatVersion || 'Unknown'}
Text length: ${data.text?.length || 0} characters
Creator: ${data.info?.Creator || 'Unknown'}
Producer: ${data.info?.Producer || 'Unknown'}
--------------
`);
        } catch (err) {
            resolve(`PDF Diagnostics Error: ${(err as Error).message}`);
        }
    });
}