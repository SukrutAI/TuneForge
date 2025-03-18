/**
 * Token Analyzer Utility
 * 
 * Provides utilities to analyze token usage in generated datasets
 */

import { encode } from 'gpt-tokenizer';
import fs from 'node:fs';
import path from 'node:path';
import colors from './colors';

// Supported file formats for analysis
type SupportedFormat = 'jsonl' | 'json' | 'csv';

// Token analysis result for a single field
interface FieldTokenAnalysis {
  fieldName: string;
  tokenCount: number;
  charCount: number;
  tokenRatio: number;
}

// Token analysis result for a single file
interface FileTokenAnalysis {
  fileName: string;
  fileSize: number;
  entryCount: number;
  totalTokens: number;
  avgTokensPerEntry: number;
  maxTokensInEntry: number;
  fields: FieldTokenAnalysis[];
}

// Token analysis result for a directory
interface DirectoryTokenAnalysis {
  directoryName: string;
  fileCount: number;
  totalTokens: number;
  totalEntries: number;
  fileAnalyses: FileTokenAnalysis[];
}

/**
 * Detects the format of a file based on its extension
 * @param filePath Path to the file
 * @returns Format of the file
 */
function detectFileFormat(filePath: string): SupportedFormat {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.jsonl':
      return 'jsonl';
    case '.json':
      return 'json';
    case '.csv':
      return 'csv';
    default:
      // Default to JSONL if unknown
      return 'jsonl';
  }
}

/**
 * Reads and parses a file based on its format
 * @param filePath Path to the file
 * @param format Format of the file
 * @returns Array of parsed entries
 */
async function readAndParseFile(filePath: string, format: SupportedFormat): Promise<any[]> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    
    switch (format) {
      case 'jsonl':
        return content
          .trim()
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      
      case 'json':
        const json = JSON.parse(content);
        // Handle both array and object with "samples" property
        return Array.isArray(json) ? json : (json.samples || json.examples || []);
      
      case 'csv':
        // Simple CSV handling (comma-separated, with header row)
        const rows = content.trim().split('\n');
        const headers = rows[0].split(',');
        
        return rows.slice(1).map(row => {
          const values = row.split(',');
          return headers.reduce((obj, header, i) => {
            obj[header] = values[i] || '';
            return obj;
          }, {} as any);
        });
      
      default:
        return [];
    }
  } catch (error) {
    console.error(colors.red(`Error parsing file ${filePath}: ${(error as Error).message}`));
    return [];
  }
}

/**
 * Counts tokens in a string using the specified tokenizer
 * @param text Text to count tokens in
 * @returns Number of tokens
 */
function countTokens(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  return encode(text).length;
}

/**
 * Analyzes token usage in a field
 * @param fieldName Name of the field
 * @param values Array of values for the field across all entries
 * @returns Field token analysis
 */
function analyzeField(fieldName: string, values: string[]): FieldTokenAnalysis {
  // Filter out non-string values and empty strings
  const stringValues = values
    .filter(v => typeof v === 'string' && v.trim() !== '');
  
  // Count tokens and characters
  let tokenCount = 0;
  let charCount = 0;
  
  for (const value of stringValues) {
    tokenCount += countTokens(value);
    charCount += value.length;
  }
  
  return {
    fieldName,
    tokenCount,
    charCount,
    tokenRatio: charCount > 0 ? tokenCount / charCount : 0
  };
}

/**
 * Analyzes token usage in a single file
 * @param filePath Path to the file
 * @returns File token analysis
 */
export async function analyzeFile(filePath: string): Promise<FileTokenAnalysis> {
  const fileName = path.basename(filePath);
  const fileSize = (await fs.promises.stat(filePath)).size;
  const format = detectFileFormat(filePath);
  const entries = await readAndParseFile(filePath, format);
  
  // If no entries, return empty analysis
  if (!entries.length) {
    return {
      fileName,
      fileSize,
      entryCount: 0,
      totalTokens: 0,
      avgTokensPerEntry: 0,
      maxTokensInEntry: 0,
      fields: []
    };
  }
  
  // Get all field names from the entries
  const allFields = new Set<string>();
  for (const entry of entries) {
    Object.keys(entry).forEach(key => allFields.add(key));
  }
  
  // Analyze each field
  const fieldAnalyses: FieldTokenAnalysis[] = [];
  let totalTokens = 0;
  let maxTokensInEntry = 0;
  
  for (const field of allFields) {
    // Skip token count fields that might have been added in previous analyses
    if (field.endsWith('_token_count') || field === 'token_count') continue;
    
    // Get all values for this field
    const values = entries
      .map(entry => entry[field])
      .filter(v => v !== undefined && v !== null);
    
    // Handle nested objects or arrays (e.g., conversations in ShareGPT format)
    const stringValues: string[] = [];
    for (const value of values) {
      if (typeof value === 'string') {
        stringValues.push(value);
      } else if (Array.isArray(value)) {
        // Handle arrays (e.g. conversations)
        for (const item of value) {
          if (typeof item === 'string') {
            stringValues.push(item);
          } else if (item && typeof item === 'object' && 'value' in item) {
            // Handle ShareGPT conversation format
            if (typeof item.value === 'string') {
              stringValues.push(item.value);
            }
          }
        }
      }
    }
    
    const analysis = analyzeField(field, stringValues);
    fieldAnalyses.push(analysis);
    totalTokens += analysis.tokenCount;
  }
  
  // Calculate max tokens in an entry
  for (const entry of entries) {
    let entryTokens = 0;
    for (const field of allFields) {
      if (typeof entry[field] === 'string') {
        entryTokens += countTokens(entry[field]);
      } else if (Array.isArray(entry[field])) {
        // Handle arrays (e.g. conversations)
        for (const item of entry[field]) {
          if (typeof item === 'string') {
            entryTokens += countTokens(item);
          } else if (item && typeof item === 'object' && 'value' in item) {
            if (typeof item.value === 'string') {
              entryTokens += countTokens(item.value);
            }
          }
        }
      }
    }
    maxTokensInEntry = Math.max(maxTokensInEntry, entryTokens);
  }
  
  return {
    fileName,
    fileSize,
    entryCount: entries.length,
    totalTokens,
    avgTokensPerEntry: entries.length ? totalTokens / entries.length : 0,
    maxTokensInEntry,
    fields: fieldAnalyses.sort((a, b) => b.tokenCount - a.tokenCount) // Sort by token count, descending
  };
}

/**
 * Analyzes token usage in all supported files in a directory
 * @param dirPath Path to the directory
 * @returns Directory token analysis
 */
export async function analyzeDirectory(dirPath: string): Promise<DirectoryTokenAnalysis> {
  try {
    // Read all files in the directory
    const files = await fs.promises.readdir(dirPath);
    
    // Filter for supported file formats
    const supportedExtensions = ['.jsonl', '.json', '.csv'];
    const supportedFiles = files.filter(file => 
      supportedExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );
    
    // Analyze each file
    const fileAnalyses: FileTokenAnalysis[] = [];
    let totalTokens = 0;
    let totalEntries = 0;
    
    for (const file of supportedFiles) {
      const filePath = path.join(dirPath, file);
      const analysis = await analyzeFile(filePath);
      
      fileAnalyses.push(analysis);
      totalTokens += analysis.totalTokens;
      totalEntries += analysis.entryCount;
    }
    
    return {
      directoryName: path.basename(dirPath),
      fileCount: fileAnalyses.length,
      totalTokens,
      totalEntries,
      fileAnalyses: fileAnalyses.sort((a, b) => b.totalTokens - a.totalTokens) // Sort by total tokens, descending
    };
  } catch (error) {
    console.error(colors.red(`Error analyzing directory ${dirPath}: ${(error as Error).message}`));
    throw error;
  }
}

/**
 * Gets human-readable file size
 * @param bytes File size in bytes
 * @returns Human-readable file size
 */
export function humanFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Prints token analysis results in a structured format
 * @param analysis Token analysis results
 */
export function printTokenAnalysis(analysis: DirectoryTokenAnalysis): void {
  console.log(colors.cyan('===== Token Usage Analysis ====='));
  console.log(colors.cyan(`Directory: ${analysis.directoryName}`));
  console.log(colors.cyan(`Files analyzed: ${analysis.fileCount}`));
  console.log(colors.cyan(`Total entries: ${analysis.totalEntries}`));
  console.log(colors.cyan(`Total tokens: ${analysis.totalTokens.toLocaleString()}\n`));
  
  for (const fileAnalysis of analysis.fileAnalyses) {
    console.log(colors.yellow(`File: ${fileAnalysis.fileName}`));
    console.log(colors.yellow(`  Size: ${humanFileSize(fileAnalysis.fileSize)}`));
    console.log(colors.yellow(`  Entries: ${fileAnalysis.entryCount}`));
    console.log(colors.yellow(`  Total tokens: ${fileAnalysis.totalTokens.toLocaleString()}`));
    console.log(colors.yellow(`  Avg tokens per entry: ${fileAnalysis.avgTokensPerEntry.toFixed(2)}`));
    console.log(colors.yellow(`  Max tokens in an entry: ${fileAnalysis.maxTokensInEntry}\n`));
    
    console.log(colors.green('  Field breakdown:'));
    fileAnalysis.fields.forEach(field => {
      console.log(colors.green(`    ${field.fieldName}: ${field.tokenCount.toLocaleString()} tokens (${field.tokenRatio.toFixed(3)} tokens/char)`));
    });
    
    console.log(); // Empty line between files
  }
}