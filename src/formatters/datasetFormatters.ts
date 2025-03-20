/**
 * Dataset Formatters Module
 * 
 * Provides formatters for converting datasets to different output formats (JSON, JSONL, CSV, etc.)
 * and according to TRL (Transformer Reinforcement Learning) schemas
 */
import type { 
    QASample, 
    RPSample, 
    ClassifierSample, 
    MultilingualCorpusSample,
    ParallelCorpusSample,
    InstructionFollowingSample,
    SummarizationSample,
    HFDatasetConfig,
    TRLDatasetFormats,
    ParallelCorpusEntry,
    MonolingualTextEntry,
    InstructionTuningEntry,
    BenchmarkEvaluationEntry,
    DomainSpecificEntry,
    WebCrawledEntry,
    AlpacaSample,
    ShareGPTSample,
    RawCorpusSample,
    IndicSummarizationEntry,
    IndicTranslationEntry,
    IndicQAEntry,
    IndicCrossLingualQAEntry
} from '../types';
import colors from '../utils/colors';
import Papa from 'papaparse';

/**
 * Saves dataset in the specified format
 * @param data Array of data objects
 * @param outputPrefix Output file prefix
 * @param format Format to save in (json, jsonl, csv, etc.)
 */
export async function saveInFormat(data: any[], outputPrefix: string, format: string): Promise<string> {
    const outputPath = `${outputPrefix}.${format}`;
    
    switch (format) {
        case 'json':
            await Bun.write(outputPath, JSON.stringify({ data }, null, 2));
            break;

        case 'jsonl':
            await Bun.write(
                outputPath,
                data.map(item => JSON.stringify(item)).join('\n')
            );
            break;

        case 'csv':
            const csv = Papa.unparse(data);
            await Bun.write(outputPath, csv);
            break;
        //! This are pending to be implemented
        case 'parquet':
        case 'arrow':
            console.log(colors.yellow(`Note: ${format.toUpperCase()} format requires additional processing with Arrow libraries.`));
            // For demonstration, we'll save as JSON and note that additional processing is required
            await Bun.write(outputPath, JSON.stringify({ data }, null, 2));
            
            const conversionInstructionsPath = `${outputPrefix}.${format}-conversion.txt`;
            await Bun.write(conversionInstructionsPath,
                `To convert to ${format.toUpperCase()} format, use a tool like Apache Arrow or PyArrow.\n` +
                `Example with Python:\n\n` +
                `import pandas as pd\n` +
                `import pyarrow as pa\n` +
                `import pyarrow.parquet as pq\n\n` +
                `df = pd.read_json('${outputPath}')\n` +
                `table = pa.Table.from_pandas(df)\n` +
                `pq.write_table(table, '${outputPrefix}.${format}')\n`
            );
            break;

        default:
            console.warn(colors.yellow(`Unknown format '${format}', saving as JSON`));
            await Bun.write(`${outputPrefix}.json`, JSON.stringify({ data }, null, 2));
    }
    
    return outputPath;
}

/**
 * Create TRL-compatible format converters based on configuration
 * @param trlFormat Format type (standard or conversational)
 * @param trlType Type of TRL dataset
 * @returns Object with converters for each dataset type
 */
export function createTRLFormatConverters(
    trlFormat: 'standard' | 'conversational' = 'standard',
    trlType: 'language_modeling' | 'prompt_only' | 'prompt_completion' | 'preference' | 'unpaired_preference' | 'stepwise_supervision' = 'prompt_completion'
): HFDatasetConfig['convertFunctions'] {
    const converters: HFDatasetConfig['convertFunctions'] = {};

    // Helper function to create a consistent format
    const createFormattedOutput = (texts: any) => {
        switch(trlType) {
            case 'language_modeling':
                return { text: texts.text };
                
            case 'prompt_only':
                return { prompt: texts.prompt };
                
            case 'prompt_completion':
            default:
                return { 
                    prompt: texts.prompt, 
                    completion: texts.completion,
                    ...(texts.metadata ? { metadata: texts.metadata } : {})
                };
                
            case 'preference':
                return {
                    prompt: texts.prompt,
                    completion_1: texts.completion_1,
                    completion_2: texts.completion_2,
                    preference: texts.preference
                };
                
            case 'unpaired_preference':
                return {
                    prompt: texts.prompt,
                    completion: texts.completion,
                    score: texts.score
                };
                
            case 'stepwise_supervision':
                return {
                    prompt: texts.prompt,
                    steps: texts.steps
                };
        }
    };

    // Convert QA samples
    converters.qa = (sample: QASample) => {
        if (trlFormat === 'conversational') {
            return {
                conversations: [
                    { from: 'human', value: sample.question },
                    { from: 'assistant', value: sample.answer }
                ],
                metadata: {
                    difficulty: sample.difficulty,
                    context: sample.context,
                    question_type: sample.question_type
                }
            };
        }
        
        return createFormattedOutput({
            prompt: sample.question,
            completion: sample.answer,
            metadata: {
                difficulty: sample.difficulty,
                context: sample.context,
                question_type: sample.question_type
            }
        });
    };

    // Convert RP samples
    converters.rp = (sample: RPSample) => {
        if (trlFormat === 'conversational') {
            return {
                conversations: [
                    { from: 'system', value: sample.system_instruction },
                    ...sample.example_conversation.map(item => ({
                        from: item.role,
                        value: item.content
                    }))
                ],
                metadata: {
                    scenario: sample.scenario,
                    complexity_level: sample.complexity_level
                }
            };
        }
        
        const conversation = sample.example_conversation.map(msg => 
            `${msg.role}: ${msg.content}`
        ).join('\n');
        
        return createFormattedOutput({
            prompt: `${sample.system_instruction}\n\nScenario: ${sample.scenario}`,
            completion: conversation
        });
    };

    // Convert classifier samples
    converters.classifier = (sample: ClassifierSample) => {
        return createFormattedOutput({
            prompt: `Classify the following text:\n${sample.text}`,
            completion: `Categories: ${sample.categories.join(', ')}\nExplanation: ${sample.explanation}`
        });
    };

    // Convert multilingual samples
    converters.multilingual = (sample: MultilingualCorpusSample) => {
        return createFormattedOutput({
            prompt: `Generate text in ${sample.language}${sample.original_text ? ` based on: ${sample.original_text}` : ''}`,
            completion: sample.text,
            metadata: {
                language: sample.language,
                original_language: sample.original_language,
                cultural_notes: sample.cultural_notes
            }
        });
    };

    // Convert parallel corpus samples
    converters.parallel = (sample: ParallelCorpusSample) => {
        return createFormattedOutput({
            prompt: `Translate the following text from ${sample.source_lang} to ${sample.target_lang}:\n${sample.source}`,
            completion: sample.target,
            metadata: {
                source_lang: sample.source_lang,
                target_lang: sample.target_lang,
                domain: sample.domain,
                complexity: sample.complexity
            }
        });
    };

    // Convert instruction samples
    converters.instruction = (sample: InstructionFollowingSample) => {
        return createFormattedOutput({
            prompt: sample.instruction,
            completion: sample.output,
            metadata: {
                language: sample.language,
                instruction_type: sample.instruction_type,
                constraints: sample.constraints
            }
        });
    };

    // Convert summarization samples
    converters.summarization = (sample: SummarizationSample) => {
        return createFormattedOutput({
            prompt: `Summarize the following text:\n${sample.text}`,
            completion: sample.summary,
            metadata: {
                language: sample.language,
                summary_type: sample.summary_type
            }
        });
    };

    // Standardized multilingual format converters
    // Convert parallel corpora entries
    converters.parallel_corpora = (sample: ParallelCorpusEntry) => {
        // For parallel corpora, we need to handle dynamic language keys
        const languages = Object.keys(sample);
        const primaryLang = languages.includes('english') ? 'english' : languages[0];
        
        const formattedOutput: any = {};
        for (const lang of languages) {
            formattedOutput[lang] = sample[lang];
        }
        
        if (trlType === 'prompt_completion' && languages.length >= 2) {
            // Pick the first two languages for prompt-completion
            const sourceLang = languages[0];
            const targetLang = languages[1];
            formattedOutput.prompt = `Translate from ${sourceLang} to ${targetLang}:\n${sample[sourceLang]}`;
            formattedOutput.completion = sample[targetLang];
        }
        
        return formattedOutput;
    };

    // Convert monolingual text entries
    converters.monolingual_text = (sample: MonolingualTextEntry) => {
        return {
            language: sample.language,
            text: sample.text,
            ...(sample.original_text ? { original_text: sample.original_text } : {}),
            ...(sample.original_language ? { original_language: sample.original_language } : {}),
            ...(sample.cultural_notes ? { cultural_notes: sample.cultural_notes } : {})
        };
    };

    // Convert instruction tuning entries
    converters.instruction_tuning = (sample: InstructionTuningEntry) => {
        if (trlFormat === 'conversational') {
            return {
                conversations: [
                    { from: 'human', value: `${sample.instruction}\n\n${sample.input}`.trim() },
                    { from: 'assistant', value: sample.output }
                ],
                metadata: {
                    language: sample.language,
                    instruction_type: sample.instruction_type,
                    constraints: sample.constraints
                }
            };
        }
        
        return {
            instruction: sample.instruction,
            input: sample.input,
            output: sample.output,
            language: sample.language,
            ...(sample.instruction_type ? { instruction_type: sample.instruction_type } : {}),
            ...(sample.constraints ? { constraints: sample.constraints } : {})
        };
    };

    // Convert benchmark evaluation entries
    converters.benchmark_evaluation = (sample: BenchmarkEvaluationEntry) => {
        const output: any = {
            task: sample.task,
            language: sample.language,
            text: sample.text
        };
        
        if (sample.label) {
            output.label = sample.label;
        }
        
        if (sample.entities && sample.entities.length > 0) {
            output.entities = sample.entities;
        }
        
        return output;
    };

    // Convert domain-specific entries
    converters.domain_specific = (sample: DomainSpecificEntry) => {
        return {
            domain: sample.domain,
            language: sample.language,
            text: sample.text,
            ...(sample.translation ? { translation: sample.translation } : {})
        };
    };

    // Convert web-crawled entries
    converters.web_crawled = (sample: WebCrawledEntry) => {
        return {
            url: sample.url,
            language: sample.language,
            title: sample.title,
            content: sample.content
        };
    };

    // Modern LLM format converters
    // Convert Alpaca instruction format
    converters.alpaca_instruct = (sample: AlpacaSample) => {
        return {
            instruction: sample.instruction,
            input: sample.input,
            output: sample.output
        };
    };

    // Convert ShareGPT conversation format
    converters.sharegpt_conversations = (sample: ShareGPTSample) => {
        return {
            conversations: sample.conversations
        };
    };

    // Convert raw corpus format
    converters.raw_corpus = (sample: RawCorpusSample) => {
        return {
            text: sample.text
        };
    };

    // Indian language format converters
    // Convert Indic summarization entries (crosssum_in style)
    converters.indic_summarization = (sample: IndicSummarizationEntry) => {
        if (trlFormat === 'conversational') {
            return {
                conversations: [
                    { from: 'human', value: `Please summarize this article in ${INDIC_LANGUAGES[sample.language] || sample.language}:\n\n${sample.article}` },
                    { from: 'assistant', value: sample.summary }
                ],
                metadata: {
                    language: sample.language,
                    domain: sample.domain || 'general',
                    title: sample.title
                }
            };
        }
        
        return {
            article: sample.article,
            summary: sample.summary,
            language: sample.language,
            ...(sample.domain ? { domain: sample.domain } : {}),
            ...(sample.title ? { title: sample.title } : {})
        };
    };

    // Convert Indic translation entries (flores_in style)
    converters.indic_translation = (sample: IndicTranslationEntry) => {
        if (trlFormat === 'conversational') {
            return {
                conversations: [
                    { from: 'human', value: `Translate this English text to ${INDIC_LANGUAGES[sample.target_lang] || sample.target_lang}:\n\n${sample.en}` },
                    { from: 'assistant', value: sample.translation }
                ],
                metadata: {
                    target_lang: sample.target_lang,
                    domain: sample.domain,
                    complexity: sample.complexity || 'moderate'
                }
            };
        }
        
        return {
            en: sample.en,
            translation: sample.translation,
            target_lang: sample.target_lang,
            ...(sample.domain ? { domain: sample.domain } : {}),
            ...(sample.complexity ? { complexity: sample.complexity } : {})
        };
    };

    // Convert Indic QA entries (xquad_in style)
    converters.indic_qa = (sample: IndicQAEntry) => {
        if (trlFormat === 'conversational') {
            return {
                conversations: [
                    { from: 'human', value: `Context: ${sample.context}\n\nQuestion: ${sample.question}` },
                    { from: 'assistant', value: sample.answer }
                ],
                metadata: {
                    language: sample.language,
                    answer_start: sample.answer_start,
                    is_impossible: sample.is_impossible || false
                }
            };
        }
        
        return {
            question: sample.question,
            context: sample.context,
            answer: sample.answer,
            language: sample.language,
            ...(sample.answer_start !== undefined ? { answer_start: sample.answer_start } : {}),
            ...(sample.is_impossible !== undefined ? { is_impossible: sample.is_impossible } : {})
        };
    };

    // Convert Indic cross-lingual QA entries (xorqa_in style)
    converters.indic_crosslingual_qa = (sample: IndicCrossLingualQAEntry) => {
        if (trlFormat === 'conversational') {
            return {
                conversations: [
                    { from: 'human', value: `English Context: ${sample.context_en}\n\nQuestion (${INDIC_LANGUAGES[sample.language] || sample.language}): ${sample.question}` },
                    { from: 'assistant', value: sample.answer }
                ],
                metadata: {
                    language: sample.language,
                    english_question: sample.english_question,
                    english_answer: sample.english_answer
                }
            };
        }
        
        return {
            question: sample.question,
            context_en: sample.context_en,
            answer: sample.answer,
            language: sample.language,
            ...(sample.english_question ? { english_question: sample.english_question } : {}),
            ...(sample.english_answer ? { english_answer: sample.english_answer } : {})
        };
    };

    return converters;
}

// Helper mapping for language codes to full names
const INDIC_LANGUAGES: {[key: string]: string} = {
    'hi': 'Hindi',
    'bn': 'Bengali',
    'te': 'Telugu',
    'ta': 'Tamil',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'pa': 'Punjabi',
    'or': 'Odia',
    'as': 'Assamese',
    'sa': 'Sanskrit',
    'ur': 'Urdu',
    'ne': 'Nepali',
    "ar": "Arabic",
    "en": "English",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "it": "Italian",
    "pt": "Portuguese",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ru": "Russian",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "id": "Indonesian",
};