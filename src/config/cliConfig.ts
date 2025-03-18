/**
 * CLI Configuration Module
 * 
 * Defines and parses command line options for the application
 */
import { Command } from 'commander';
import type { CLIOptions, HFDatasetConfig } from '../types';
import { createTRLFormatConverters } from '../formatters/datasetFormatters';

/**
 * CLI Configuration
 * 
 * Default configuration values for the CLI
 */

/**
 * Default configuration for CLI options
 */
export const DEFAULT_CLI_CONFIG = {
    input: './data',
    output: './output',
    model: 'gemini-2.0-flash-lite-preview-02-05',
    concurrency: '3',
    type: ['qa', 'rp', 'classifier' ],
    samples: '3',
    format: 'jsonl',
    trlFormat: 'standard',
    trlType: 'prompt_completion',
    datasetFormat: 'legacy',
    includeIndic: false,
    languages: '',
};

/**
 * Configure and parse command line arguments
 * @returns Parsed CLI options
 */
export function parseCliOptions(): CLIOptions {
    const program = new Command()
        .name('tuneforge')
        .description('Generate Hugging Face-compatible instruction tuning datasets')
        .option('-i, --input <path>', 'Path to input directory containing books and compute info', './input')
        .option('-o, --output <path>', 'Path to output directory for datasets', './output')
        .option('-m, --model <name>', 'Gemini model to use', 'gemini-2.0-flash-lite-preview-02-05')
        .option('-c, --concurrency <number>', 'Number of concurrent requests', '3')
        .option('-t, --type <types...>', 'Types of datasets to generate (qa, rp, classifier, multilingual, parallel, instruction, summarization)', ['qa', 'rp', 'classifier'])
        .option('-s, --samples <number>', 'Number of samples to generate per chunk', '5')
        .option('-f, --format <format>', 'Output format (json, jsonl, csv, parquet, arrow)', 'jsonl')
        .option('--dataset-format <format>', 'Dataset format to use (legacy, standard)', 'legacy')
        .option('--trl-format <format>', 'TRL dataset format (standard, conversational)', 'standard')
        .option('--trl-type <type>', 'TRL dataset type (language_modeling, prompt_only, prompt_completion, preference, unpaired_preference, stepwise_supervision)', 'prompt_completion')
        .option('--upload', 'Upload dataset to Hugging Face Hub', false)
        .option('--repo-id <id>', 'Hugging Face repository ID (username/dataset-name)')

    return program.opts() as CLIOptions;
}

/**
 * Create Hugging Face configuration from CLI options
 * @param options CLI options
 * @returns Hugging Face dataset configuration
 */
export function createHuggingFaceConfig(options: CLIOptions): HFDatasetConfig {
    const trlFormat = options.trlFormat as 'standard' | 'conversational';
    const trlType = options.trlType as 'language_modeling' | 'prompt_only' | 'prompt_completion' | 'preference' | 'unpaired_preference' | 'stepwise_supervision';

    return {
        format: options.format as 'json' | 'jsonl' | 'csv' | 'parquet' | 'arrow',
        trlFormat: {
            format: trlFormat,
            type: trlType
        },
        upload: options.upload,
        repoId: options.repoId,
        private: options.private,
        token: options.hfToken || process.env.HUGGINGFACE_TOKEN,
        description: options.description || 'Instruction tuning dataset generated with TuneForge',
        convertFunctions: createTRLFormatConverters(trlFormat, trlType)
    };
}