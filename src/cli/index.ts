#!/usr/bin/env bun
/**
 * CLI Entry Point
 * 
 * Processes command line arguments and runs the content processing engine
 */
import { Command } from 'commander';
import colors from '../utils/colors';
import { processContent } from './processingEngine';
import { createTRLFormatConverters } from '../formatters/datasetFormatters';
import { initializeModernFormatConverters } from '../formatters/modernFormatConverters';
import { DEFAULT_CLI_CONFIG } from '../config/cliConfig';
import type { CLIOptions, HFDatasetConfig } from '../types';

// Read version from package.json directly for TypeScript compatibility
const version = "1.0.0"; // You can dynamically load this from package.json if needed

// Main program configuration
const program = new Command()
    .name('tuneforge')
    .description(colors.bold('TuneForge: LLM Training Dataset Generator'))
    .version(version);

// Add command line options
program
    .option('-i, --input <path>', 'Input file or directory path', DEFAULT_CLI_CONFIG.input)
    .option('-o, --output <path>', 'Output directory for generated datasets', DEFAULT_CLI_CONFIG.output)
    .option('-m, --model <name>', 'AI model to use for generation', DEFAULT_CLI_CONFIG.model)
    .option('-c, --concurrency <number>', 'Number of chunks to process concurrently', DEFAULT_CLI_CONFIG.concurrency)
    .option('-t, --type <types...>', 
        'Types of datasets to generate:\n' +
        '      - Legacy formats: qa, rp, classifier, multilingual, parallel, instruction, summarization\n' +
        '      - Standard formats: parallel_corpora, monolingual_text, instruction_tuning, benchmark_evaluation, domain_specific, web_crawled\n' +
        '      - Modern formats: alpaca_instruct, sharegpt_conversations, raw_corpus\n' +
        '      - Indic formats: indic_summarization, indic_translation, indic_qa, indic_crosslingual_qa', 
        DEFAULT_CLI_CONFIG.type)
    .option('-s, --samples <number>', 'Number of samples to generate per chunk', DEFAULT_CLI_CONFIG.samples)
    .option('-f, --format <format>', 'Output format (json, jsonl, csv, parquet, arrow)', DEFAULT_CLI_CONFIG.format)
    .option('--trl-format <format>', 'TRL format (standard, conversational)', DEFAULT_CLI_CONFIG.trlFormat)
    .option('--trl-type <type>', 'TRL type (language_modeling, prompt_only, prompt_completion, preference, unpaired_preference, stepwise_supervision)', DEFAULT_CLI_CONFIG.trlType)
    .option('--dataset-format <format>', 'Dataset format to use (legacy, standard, modern, indic)', DEFAULT_CLI_CONFIG.datasetFormat)
    .option('--upload', 'Upload datasets to Hugging Face', false)
    .option('--repo-id <id>', 'Hugging Face repository ID for upload')
    .option('--private', 'Make Hugging Face repository private', false)
    .option('--hf-token <token>', 'Hugging Face token for upload')
    .option('--description <text>', 'Description for Hugging Face dataset')
    // Language options for multilingual datasets
    .option('--include-indic', 'Include Indian Indic languages in multilingual datasets', false)
    .option('--languages <codes>', 'Comma-separated list of language ISO codes to include (e.g., en,hi,ta,bn)')
    .parse(process.argv);

// Main function to process CLI arguments and run the processing engine
async function main() {
    // Get command line options
    const options = program.opts() as CLIOptions;
    
    console.log(colors.cyan('TuneForge Dataset Generator'));
    console.log(colors.cyan(`Version: ${version}\n`));
    
    // Log configuration
    console.log(colors.yellow('Configuration:'));
    console.log(`  Input: ${colors.white(options.input)}`);
    console.log(`  Output: ${colors.white(options.output)}`);
    console.log(`  Model: ${colors.white(options.model)}`);
    console.log(`  Dataset types: ${colors.white(options.type.join(', '))}`);
    console.log(`  Samples per chunk: ${colors.white(options.samples)}`);
    console.log(`  Format: ${colors.white(options.format)}`);
    console.log(`  Dataset format: ${colors.white(options.datasetFormat || 'legacy')}`);
    
    // Handle language options
    if (options.includeIndic) {
        console.log(colors.green(`  Including Indian Indic languages in multilingual datasets`));
    }
    
    if (options.languages) {
        const languageCodes = options.languages.split(',').map((lang: string) => lang.trim());
        console.log(colors.green(`  Using specific languages: ${languageCodes.join(', ')}`));
    }

    // Check for Indian language-specific dataset types
    const indicDatasetTypes = options.type.filter(type => 
        type.startsWith('indic_')
    );
    
    if (indicDatasetTypes.length > 0) {
        console.log(colors.green(`  Generating Indian language datasets: ${indicDatasetTypes.join(', ')}`));
        
        // Automatically include Indic languages if using Indic dataset types
        if (!options.includeIndic && !options.languages) {
            options.includeIndic = true;
            console.log(colors.blue('  Auto-enabling Indian languages support for Indic dataset types'));
        }
    }
    
    // Process Hugging Face upload configuration
    const huggingFaceConfig = processHuggingFaceConfig(options);
    
    // Check for required options
    if (!options.input) {
        console.error(colors.red('Error: Input path is required'));
        process.exit(1);
    }

    try {
        // Initialize modern format converters
        initializeModernFormatConverters(huggingFaceConfig.convertFunctions);

        // Process content using the processing engine
        await processContent(options, huggingFaceConfig);
        console.log(colors.green('\nProcessing complete! ✨'));
    } catch (error) {
        console.error(colors.red(`\nError: ${(error as Error).message}`));
        process.exit(1);
    }
}

/**
 * Process Hugging Face configuration options
 */
function processHuggingFaceConfig(options: CLIOptions): HFDatasetConfig {
    // Validate format is one of the allowed values
    const validFormats = ['json', 'jsonl', 'csv', 'parquet', 'arrow'] as const;
    const format = validFormats.includes(options.format as any) 
        ? options.format as 'json' | 'jsonl' | 'csv' | 'parquet' | 'arrow'
        : 'jsonl'; // Default to jsonl if invalid format
    
    // Validate TRL format
    const trlFormat = ['standard', 'conversational'].includes(options.trlFormat)
        ? options.trlFormat as 'standard' | 'conversational'
        : 'standard';
    
    // Validate TRL type
    const validTrlTypes = [
        'language_modeling', 'prompt_only', 'prompt_completion', 
        'preference', 'unpaired_preference', 'stepwise_supervision'
    ] as const;
    const trlType = validTrlTypes.includes(options.trlType as any)
        ? options.trlType as typeof validTrlTypes[number]
        : 'prompt_completion';
    
    // Create and return the properly typed config
    const hfConfig: HFDatasetConfig = {
        format,
        trlFormat: {
            format: trlFormat,
            type: trlType
        },
        upload: options.upload,
        repoId: options.repoId,
        private: options.private,
        token: options.hfToken || process.env.HUGGINGFACE_TOKEN,
        description: options.description,
        convertFunctions: createTRLFormatConverters(trlFormat, trlType)
    };
    
    if (options.upload) {
        console.log(`  Upload to Hugging Face: ${colors.white('Yes')}`);
        console.log(`  Repository ID: ${colors.white(options.repoId || 'Not specified')}`);
        console.log(`  Private repository: ${colors.white(options.private ? 'Yes' : 'No')}`);
        console.log(`  HF Token: ${colors.white(hfConfig.token ? 'Provided' : 'Not provided')}`);
    }
    
    return hfConfig;
}

// Run the program
main().catch(error => {
    console.error(colors.red(`\nUnexpected error: ${error.message}`));
    process.exit(1);
});
