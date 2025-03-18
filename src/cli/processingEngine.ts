/**
 * Processing Engine
 * 
 * Main processing logic for generating datasets from input content
 */
import { basename } from 'path';
import { mkdirSync } from 'fs';
import pMap from 'p-map';
import { google } from '@ai-sdk/google';
import { Glob } from 'bun';
import colors from '../utils/colors';
import { createProgressBar, createLoadingIndicator } from '../utils/progressBar';
import { readAndChunkContent, readComputeInfo, existsSync } from '../services/contentProcessor';
import type { CLIOptions, DatasetResults, HFDatasetConfig, ComputeInfo } from '../types';
import { saveInFormat } from '../formatters/datasetFormatters';
import { uploadToHuggingFace } from '../services/huggingFaceService';
import {
    generateQADataset,
    generateRPDataset,
    generateClassifierDataset,
    generateMultilingualDataset,
    generateParallelCorpusDataset,
    generateInstructionDataset,
    generateSummarizationDataset
} from '../generators/datasetGenerators';
import {
    generateParallelCorporaDataset,
    generateMonolingualTextDataset,
    generateInstructionTuningDataset,
    generateBenchmarkDataset,
    generateDomainSpecificDataset,
    generateWebCrawledDataset
} from '../generators/standardDatasetGenerators';
import { statSync } from 'fs';
import {
    generateAlpacaDataset,
    generateShareGPTDataset,
    generateRawCorpusDataset
} from '../generators/modernDatasetGenerators';
import {
    generateIndicSummarizationDataset,
    generateIndicTranslationDataset,
    generateIndicQADataset,
    generateIndicCrossLingualQADataset
} from '../generators/indicDatasetGenerators';

/**
 * Main processing function to generate datasets from input content
 * @param options CLI options
 * @param huggingFaceConfig Hugging Face configuration
 */
export async function processContent(options: CLIOptions, huggingFaceConfig: HFDatasetConfig): Promise<void> {
    // Initialize directories
    if (!existsSync(options.output)) {
        mkdirSync(options.output, { recursive: true });
    }

    // Setup AI model based on configuration
    const model = setupAIModel(options.model);

    // Analyze input path
    const { textFiles, computeInfoFile } = await analyzeInputPath(options.input);

    if (textFiles.length === 0) {
        console.error(colors.red('No content files found. Please provide valid .txt or .pdf files.'));
        process.exit(1);
    }

    // Validate HF upload options
    if (options.upload && !options.repoId) {
        console.error(colors.red('Error: --repo-id is required when using --upload'));
        process.exit(1);
    }

    if (options.upload && !huggingFaceConfig.token) {
        console.error(colors.red('Error: Hugging Face token is required for uploads. Use --hf-token or set HUGGINGFACE_TOKEN environment variable.'));
        process.exit(1);
    }

    // Read compute info if available
    let computeInfo: ComputeInfo = computeInfoFile ? await readComputeInfo(computeInfoFile) : {};

    // Add language options from CLI parameters
    if (options.includeIndic) {
        computeInfo.includeIndic = true;
    }

    if (options.languages) {
        computeInfo.languages = options.languages.split(',').map(lang => lang.trim());
    }

    // Determine if we're using standard format or legacy format
    const useStandardFormat = options.datasetFormat === 'standard';
    const useModernFormat = options.datasetFormat === 'modern';
    const useIndicFormat = options.datasetFormat === 'indic';

    if (useStandardFormat) {
        console.log(colors.green('Using standardized dataset formats optimized for LLM fine-tuning'));
    } else if (useModernFormat) {
        console.log(colors.green('Using modern LLM training formats like Alpaca and ShareGPT'));
    } else if (useIndicFormat) {
        console.log(colors.green('Using Indian languages dataset formats based on IndicGenBench'));
    }

    // Process each content file
    for (const file of textFiles) {
        const fileName = basename(file).replace(/\.[^/.]+$/, '');
        console.log(colors.green(`Processing ${fileName}...`));

        // Show loading progress
        const loadingBar = createProgressBar(100, "Loading Content");

        // Update progress as file is being read
        loadingBar.update(30);
        const chunks = await readAndChunkContent(file);
        loadingBar.update(100);
        loadingBar.stop(colors.green(`✓ Loaded content and divided into ${chunks.length} chunks.`), true);

        // Process each chunk and generate datasets
        const results = await processChunks(fileName, chunks, computeInfo, model, options);

        // Convert and save results in Hugging Face format
        for (const [type, data] of Object.entries(results)) {
            if (!options.type.includes(type) &&
                !options.type.some(t => mapStandardTypeToLegacy(t) === type) &&
                !options.type.some(t => mapIndicTypeToBase(t) === type)) continue;

            const converter = huggingFaceConfig.convertFunctions[type as keyof typeof huggingFaceConfig.convertFunctions];
            if (!converter) {
                console.warn(colors.yellow(`No converter defined for type '${type}', using raw format.`));
                continue;
            }

            const examples = data.examples;
            
            // Skip processing if no examples were generated
            if (examples.length === 0) {
                console.log(colors.yellow(`No ${type} examples were generated for ${fileName}, skipping file creation.`));
                continue;
            }

            const convertingBar = createProgressBar(examples.length, `Converting ${type} Dataset`);

            // Convert data with progress tracking
            const convertedData: any[] = [];
            for (let i = 0; i < examples.length; i++) {
                convertedData.push(converter(examples[i] as any));
                convertingBar.update(i + 1);
            }
            convertingBar.stop(colors.green(`✓ Converted ${examples.length} examples`), true);

            // Save in the requested format
            console.log(colors.gray(`Saving ${type} dataset to ${options.format} format...`));
            const outputPrefix = `${options.output}/${fileName}_${type}`;
            const outputPath = await saveInFormat(convertedData, outputPrefix, huggingFaceConfig.format);

            console.log(colors.blue(`Saved ${type} dataset to ${outputPath}`));

            // Print language statistics for multilingual datasets
            if ((type === 'multilingual' || type === 'monolingual_text') && examples.length > 0) {
                const languages = examples.map((e: any) => e.language);
                const languageCounts = languages.reduce((counts: Record<string, number>, lang: string) => {
                    counts[lang] = (counts[lang] || 0) + 1;
                    return counts;
                }, {});

                console.log(colors.cyan("Language distribution:"));
                Object.entries(languageCounts)
                    .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                    .forEach(([lang, count]) => {
                        console.log(colors.gray(`  ${lang}: ${count} examples`));
                    });
            } else if ((type === 'parallel' || type === 'parallel_corpora') && examples.length > 0) {
                if (type === 'parallel') {
                    const pairs = examples.map((e: any) => `${e.source_lang}->${e.target_lang}`);
                    const pairCounts = pairs.reduce((counts: Record<string, number>, pair: string) => {
                        counts[pair] = (counts[pair] || 0) + 1;
                        return counts;
                    }, {});

                    console.log(colors.cyan("Language pair distribution:"));
                    Object.entries(pairCounts)
                        .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                        .forEach(([pair, count]) => {
                            console.log(colors.gray(`  ${pair}: ${count} examples`));
                        });
                } else {
                    // For parallel_corpora, display language coverage
                    const languagesPresent = new Set<string>();
                    examples.forEach((e: any) => {
                        Object.keys(e).forEach(lang => languagesPresent.add(lang));
                    });
                    console.log(colors.cyan(`Language coverage: ${Array.from(languagesPresent).join(', ')}`));
                }
            } else if ((type === 'indic_summarization' || type === 'indic_translation' || 
                       type === 'indic_qa' || type === 'indic_crosslingual_qa') && examples.length > 0) {
                // For Indian language datasets, display language distribution
                const languageField = type === 'indic_translation' ? 'target_lang' : 'language';
                const languages = examples.map((e: any) => e[languageField]);
                const languageCounts = languages.reduce((counts: Record<string, number>, lang: string) => {
                    counts[lang] = (counts[lang] || 0) + 1;
                    return counts;
                }, {});

                console.log(colors.cyan("Indic language distribution:"));
                Object.entries(languageCounts)
                    .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                    .forEach(([lang, count]) => {
                        console.log(colors.gray(`  ${lang}: ${count} examples`));
                    });

                // For translation datasets, display domain/complexity distribution
                if (type === 'indic_translation' && examples.length > 0) {
                    if (examples[0].domain) {
                        const domains = examples.map((e: any) => e.domain);
                        const domainCounts = domains.reduce((counts: Record<string, number>, domain: string) => {
                            counts[domain] = (counts[domain] || 0) + 1;
                            return counts;
                        }, {});

                        console.log(colors.cyan("Domain distribution:"));
                        Object.entries(domainCounts)
                            .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                            .forEach(([domain, count]) => {
                                console.log(colors.gray(`  ${domain}: ${count} examples`));
                            });
                    }

                    if (examples[0].complexity) {
                        const complexities = examples.map((e: any) => e.complexity);
                        const complexityCounts = complexities.reduce((counts: Record<string, number>, complexity: string) => {
                            counts[complexity] = (counts[complexity] || 0) + 1;
                            return counts;
                        }, {});

                        console.log(colors.cyan("Complexity distribution:"));
                        Object.entries(complexityCounts)
                            .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                            .forEach(([complexity, count]) => {
                                console.log(colors.gray(`  ${complexity}: ${count} examples`));
                            });
                    }
                }
            }
        }

        // Upload to Hugging Face if requested
        if (huggingFaceConfig.upload && huggingFaceConfig.repoId) {
            try {
                // Additional token validation before attempting upload
                if (!huggingFaceConfig.token || huggingFaceConfig.token.trim().length < 10) {
                    console.error(colors.red('Error: Invalid Hugging Face token. Please provide a valid token using --hf-token or HUGGINGFACE_TOKEN environment variable.'));
                    return;
                }
                
                await uploadToHuggingFace(options.output, fileName, huggingFaceConfig);
                console.log(colors.green(`✓ Successfully uploaded datasets for ${fileName} to Hugging Face`));
            } catch (error) {
                console.error(colors.red(`Error uploading to Hugging Face: ${(error as Error).message}`));
                console.log(colors.yellow(
                    '\nTroubleshooting tips:' +
                    '\n1. Make sure your token has write access to the repository' +
                    '\n2. Check that the repository name is spelled correctly' + 
                    '\n3. For organization repos, use format "organization-name/repo-name"' +
                    '\n4. Generate a new token at https://huggingface.co/settings/tokens'
                ));
            }
        }
    }
}

/**
 * Map standard dataset types to legacy types for backward compatibility
 * @param standardType Standard dataset type
 * @returns Equivalent legacy type
 */
function mapStandardTypeToLegacy(standardType: string): string | null {
    const typeMap: Record<string, string> = {
        'parallel_corpora': 'parallel',
        'monolingual_text': 'multilingual',
        'instruction_tuning': 'instruction',
        'benchmark_evaluation': 'classifier',
        'domain_specific': 'multilingual',
        'web_crawled': 'multilingual'
    };

    return typeMap[standardType] || null;
}

/**
 * Map Indic dataset types to base types for compatibility
 * @param indicType Indic dataset type
 * @returns Equivalent base type
 */
function mapIndicTypeToBase(indicType: string): string | null {
    const typeMap: Record<string, string> = {
        'indic_summarization': 'summarization',
        'indic_translation': 'parallel',
        'indic_qa': 'qa',
        'indic_crosslingual_qa': 'qa'
    };

    return typeMap[indicType] || null;
}

/**
 * Setup the AI model based on configuration
 */
function setupAIModel(modelName: string) {
    return google(modelName, {
        // Enable structured outputs for reliable JSON generation
        structuredOutputs: true
    });
}

/**
 * Process content chunks with concurrency control
 */
async function processChunks(
    fileName: string, 
    chunks: string[], 
    computeInfo: ComputeInfo, 
    model: any, 
    options: CLIOptions
): Promise<DatasetResults> {
    // Initialize results with both legacy and standardized formats
    const results: DatasetResults = {
        // Legacy formats
        qa: { examples: [] },
        rp: { examples: [] },
        classifier: { examples: [] },
        multilingual: { examples: [] },
        parallel: { examples: [] },
        instruction: { examples: [] },
        summarization: { examples: [] },

        // Standardized formats
        parallel_corpora: { examples: [] },
        monolingual_text: { examples: [] },
        instruction_tuning: { examples: [] },
        benchmark_evaluation: { examples: [] },
        domain_specific: { examples: [] },
        web_crawled: { examples: [] },

        // Modern formats
        alpaca_instruct: { examples: [] },
        sharegpt_conversations: { examples: [] },
        raw_corpus: { examples: [] },

        // Indian language formats
        indic_summarization: { examples: [] },
        indic_translation: { examples: [] },
        indic_qa: { examples: [] },
        indic_crosslingual_qa: { examples: [] }
    };

    console.log(colors.cyan(`\nProcessing ${chunks.length} chunks of ${fileName}...`));
    const progressBar = createProgressBar(chunks.length, "Processing Chunks");

    // Determine if we're using standard format or legacy format
    const useStandardFormat = options.datasetFormat === 'standard';
    const useModernFormat = options.datasetFormat === 'modern';
    const useIndicFormat = options.datasetFormat === 'indic';

    // Generate prompts for each chunk
    const tasks = chunks.map((chunk, index) => async () => {
        const chunkNumber = index + 1;
        progressBar.update(index);

        const generationTasks = [];
        const sampleCount = parseInt(options.samples);

        // Create a function to safely log messages without interfering with progress bar
        const safeLog = (message: string) => {
            process.stdout.write('\n');
            console.log(message);
            // Restore progress bar
            progressBar.update(index);
        };

        // Only execute generators for the specified dataset types
        // For legacy format generators
        if (options.type.includes('qa')) {
            generationTasks.push(
                generateQADataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.qa.examples.push(...data.samples);
                    })
                    .catch(error => {
                        // Print error on a new line
                        process.stdout.write('\n');
                        console.error(colors.red(`Error generating QA dataset for chunk ${chunkNumber}: ${error.message}`));
                        // Restore progress bar
                        progressBar.update(index);
                    })
            );
        }

        if (options.type.includes('rp')) {
            generationTasks.push(
                generateRPDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.rp.examples.push(...data.samples);
                    })
                    .catch(error => {
                        // Ensure we're on a new line before printing error
                        process.stdout.write('\n');
                        console.error(colors.red(`Error generating RP dataset for chunk ${chunkNumber}: ${error.message}`));
                        // Restore progress bar
                        progressBar.update(index);
                    })
            );
        }

        if (options.type.includes('classifier')) {
            generationTasks.push(
                generateClassifierDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.classifier.examples.push(...data.samples);
                    })
                    .catch(error => {
                        // Ensure we're on a new line before printing error
                        process.stdout.write('\n');
                        console.error(colors.red(`Error generating classifier dataset for chunk ${chunkNumber}: ${error.message}`));
                        // Restore progress bar
                        progressBar.update(index);
                    })
            );
        }

        if (options.type.includes('multilingual')) {
            generationTasks.push(
                generateMultilingualDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.multilingual.examples.push(...data.samples);
                    })
                    .catch(error => {
                        // Ensure we're on a new line before printing error
                        process.stdout.write('\n');
                        console.error(colors.red(`Error generating multilingual dataset for chunk ${chunkNumber}: ${error.message}`));
                        // Restore progress bar
                        progressBar.update(index);
                    })
            );
        }

        if (options.type.includes('parallel')) {
            generationTasks.push(
                generateParallelCorpusDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.parallel.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating parallel corpus dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        if (options.type.includes('instruction')) {
            generationTasks.push(
                generateInstructionDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.instruction.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating instruction dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        if (options.type.includes('summarization')) {
            generationTasks.push(
                generateSummarizationDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.summarization.examples.push(...data.samples.map(sample => ({
                            text: sample.document,
                            summary: sample.summary,
                            language: sample.language
                        })));
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating summarization dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        // For standard format generators
        if (useStandardFormat || options.type.includes('parallel_corpora')) {
            generationTasks.push(
                generateParallelCorporaDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.parallel_corpora!.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating parallel corpora dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        if (useStandardFormat || options.type.includes('monolingual_text')) {
            generationTasks.push(
                generateMonolingualTextDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.monolingual_text!.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating monolingual text dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        if (useStandardFormat || options.type.includes('instruction_tuning')) {
            generationTasks.push(
                generateInstructionTuningDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.instruction_tuning!.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating instruction tuning dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        if (useStandardFormat || options.type.includes('benchmark_evaluation')) {
            generationTasks.push(
                generateBenchmarkDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.benchmark_evaluation!.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating benchmark dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        if (useStandardFormat || options.type.includes('domain_specific')) {
            generationTasks.push(
                generateDomainSpecificDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.domain_specific!.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating domain-specific dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        if (useStandardFormat || options.type.includes('web_crawled')) {
            generationTasks.push(
                generateWebCrawledDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.web_crawled!.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating web-crawled dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        // For modern format generators
        if (useModernFormat || options.type.includes('alpaca_instruct')) {
            generationTasks.push(
                generateAlpacaDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.alpaca_instruct!.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating Alpaca instruction dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        if (useModernFormat || options.type.includes('sharegpt_conversations')) {
            generationTasks.push(
                generateShareGPTDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.sharegpt_conversations!.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating ShareGPT conversation dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        if (useModernFormat || options.type.includes('raw_corpus')) {
            generationTasks.push(
                generateRawCorpusDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.raw_corpus!.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating raw corpus dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        // For Indian language format generators
        if (useIndicFormat || options.type.includes('indic_summarization')) {
            generationTasks.push(
                generateIndicSummarizationDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.indic_summarization!.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating Indic summarization dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        if (useIndicFormat || options.type.includes('indic_translation')) {
            generationTasks.push(
                generateIndicTranslationDataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.indic_translation!.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating Indic translation dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        if (useIndicFormat || options.type.includes('indic_qa')) {
            generationTasks.push(
                generateIndicQADataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.indic_qa!.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating Indic QA dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        if (useIndicFormat || options.type.includes('indic_crosslingual_qa')) {
            generationTasks.push(
                generateIndicCrossLingualQADataset(chunk, computeInfo, fileName, index, model, sampleCount)
                    .then(data => {
                        results.indic_crosslingual_qa!.examples.push(...data.samples);
                    })
                    .catch(error => {
                        console.error(colors.red(`Error generating Indic cross-lingual QA dataset for chunk ${chunkNumber}: ${error.message}`));
                    })
            );
        }

        // Wait for all tasks to complete (including potential errors)
        await Promise.allSettled(generationTasks);
        progressBar.update(index + 1);
        return true;
    });

    // Execute tasks with concurrency control
    await pMap(tasks, task => task(), { concurrency: parseInt(options.concurrency) });
    progressBar.stop(colors.green(`✓ Completed processing ${chunks.length} chunks`), true);

    return results;
}

/**
 * Analyze input path and find content files
 */
async function analyzeInputPath(inputPath: string): Promise<{
    textFiles: string[], 
    computeInfoFile?: string
}> {
    let isDirectory = false;
    try {
        const stats = statSync(inputPath);
        isDirectory = stats.isDirectory();
    } catch (error) {
        console.error(colors.red(`Error accessing input path: ${(error as Error).message}`));
        process.exit(1);
    }

    let textFiles: string[] = [];
    let computeInfoFile: string | undefined;

    if (isDirectory) {
        console.log(colors.cyan(`Scanning directory: ${inputPath}`));
        // Use recursive glob pattern to find files in subdirectories
        const fileGlob = new Glob("**/*.{txt,pdf,json}");
        const inputFiles: string[] = [];
        for await (const file of fileGlob.scan({
            cwd: inputPath,
            absolute: true,
            onlyFiles: true
        })) {
            inputFiles.push(file);
        }
        console.log(colors.gray(`Found ${inputFiles.length} total files`));
        textFiles = inputFiles.filter(file => file.toLowerCase().endsWith('.txt') || file.toLowerCase().endsWith('.pdf'));
        computeInfoFile = inputFiles.find(file => file.toLowerCase().endsWith('.json'));
        if (textFiles.length > 0) {
            console.log(colors.green(`Found ${textFiles.length} content files (${textFiles.map(f => basename(f)).join(', ')})`));
        } else {
            console.warn(colors.yellow(`No .txt or .pdf files found in directory: ${inputPath}`));
        }
    } else {
        if (inputPath.endsWith('.txt') || inputPath.endsWith('.pdf')) {
            console.log(colors.yellow(`Input is a single file: ${inputPath}`));
            textFiles = [inputPath];
        } else if (inputPath.endsWith('.json')) {
            console.warn(colors.yellow('Input is a JSON file, treating as compute info. No content files found.'));
            computeInfoFile = inputPath;
        } else {
            console.warn(colors.yellow(`Unsupported file type: ${inputPath}. Please use .txt, .pdf, or .json files.`));
        }
    }

    console.log(colors.cyan(`Found ${textFiles.length} content files and ${computeInfoFile ? 1 : 0} compute info file.`));

    return { textFiles, computeInfoFile };
}