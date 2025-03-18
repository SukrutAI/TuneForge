/**
 * Converter functions for modern dataset formats
 * 
 * Handles conversion of internal format to standard formats for Hugging Face datasets
 */
import type { AlpacaSample, ShareGPTSample, RawCorpusSample } from '../types';

/**
 * Convert Alpaca format to standard Hugging Face format
 * 
 * Formats instruction data for supervised fine-tuning
 */
export function convertAlpacaFormat(sample: AlpacaSample): any {
  // Format compatible with standard instruction tuning templates
  return {
    instruction: sample.instruction,
    input: sample.input,
    output: sample.output
  };
}

/**
 * Convert ShareGPT format to standard HF conversational format
 * 
 * Formats conversation data for dialogue fine-tuning
 */
export function convertShareGPTFormat(sample: ShareGPTSample): any {
  // Two typical formats for conversations:
  // 1. Array format (compatible with TRL and most libraries)
  return {
    conversations: sample.conversations.map(msg => ({
      role: msg.from === 'human' ? 'user' : 'assistant',
      content: msg.value
    }))
  };
}

/**
 * Convert raw corpus to standard HF format for continued pre-training
 */
export function convertRawCorpusFormat(sample: RawCorpusSample): any {
  // Simple format for language modeling
  return {
    text: sample.text
  };
}

/**
 * Initialize converters for modern formats in the Hugging Face configuration
 */
export function initializeModernFormatConverters(config: Record<string, any>): void {
  // Add converter functions for modern formats
  config.alpaca_instruct = convertAlpacaFormat;
  config.sharegpt_conversations = convertShareGPTFormat;
  config.raw_corpus = convertRawCorpusFormat;
}
