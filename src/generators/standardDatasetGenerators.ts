/**
 * Standardized Dataset Generator Module
 * 
 * Contains generators for standardized multilingual dataset formats optimized for LLM fine-tuning.
 * Based on industry-standard examples like OPUS, OSCAR, MultiAlpaca, etc.
 */
import { generateObject } from 'ai';
import colors from '../utils/colors';
import { z } from 'zod';
import type { 
    ComputeInfo,
    ParallelCorpusEntry,
    MonolingualTextEntry,
    InstructionTuningEntry,
    BenchmarkEvaluationEntry,
    DomainSpecificEntry,
    WebCrawledEntry
} from '../types/index';

// Zod schema for parallel corpora datasets - fixed to provide explicit structure
const parallelCorporaSchema = z.object({
    samples: z.array(
        z.object({
            // Define common languages explicitly to help the model structure its output correctly
            english: z.string().describe('Text in English'),
            french: z.string().optional().describe('Text in French'),
            spanish: z.string().optional().describe('Text in Spanish'),
            german: z.string().optional().describe('Text in German'),
            chinese: z.string().optional().describe('Text in Chinese'),
            arabic: z.string().optional().describe('Text in Arabic'),
            hindi: z.string().optional().describe('Text in Hindi'),
            // Allow additional language fields with string values
            // Note: When using this approach, we'll post-process to handle any additional languages
        }).catchall(z.string())
    ).describe('Array of parallel text examples across multiple languages')
});

// Zod schema for monolingual text datasets
const monolingualTextSchema = z.object({
    samples: z.array(z.object({
        language: z.string().describe('ISO language code or language name'),
        text: z.string().describe('Text content in the specified language'),
        original_text: z.string().optional().describe('Original text if this is a translation'),
        original_language: z.string().optional().describe('Original language code if this is a translation'),
        cultural_notes: z.string().optional().describe('Cultural context notes relevant to this text')
    }))
});

// Zod schema for instruction tuning datasets
const instructionTuningSchema = z.object({
    samples: z.array(z.object({
        instruction: z.string().describe('The instruction/task to perform'),
        input: z.string().describe('The input text for the instruction'),
        output: z.string().describe('The expected output for the instruction'),
        language: z.string().describe('ISO language code or language name'),
        instruction_type: z.enum(['direct', 'implicit', 'multi-step', 'creative', 'analytical'])
            .optional()
            .describe('The type of instruction'),
        constraints: z.array(z.string()).optional().describe('Any constraints on the execution of the instruction')
    }))
});

// Zod schema for benchmark evaluation datasets
const benchmarkEvaluationSchema = z.object({
    samples: z.array(z.object({
        task: z.string().describe('The evaluation task type (e.g., "sentiment_analysis", "named_entity_recognition")'),
        language: z.string().describe('ISO language code or language name'),
        text: z.string().describe('The text to evaluate'),
        label: z.string().optional().describe('The label/classification for classification tasks'),
        entities: z.array(z.object({
            entity: z.string().describe('The entity text or type'),
            value: z.string().optional().describe('The specific entity value if applicable'),
            label: z.string().describe('The entity label/category')
        })).optional().describe('Entity annotations for NER tasks')
    }))
});

// Zod schema for domain-specific datasets
const domainSpecificSchema = z.object({
    samples: z.array(z.object({
        domain: z.string().describe('The specialized domain (e.g., "legal", "scientific", "medical")'),
        language: z.string().describe('ISO language code or language name'),
        text: z.string().describe('Text content in the specified language and domain'),
        translation: z.string().optional().describe('English translation if the text is non-English')
    }))
});

// Zod schema for web-crawled datasets
const webCrawledSchema = z.object({
    samples: z.array(z.object({
        url: z.string().describe('Source URL (real or fictional)'),
        language: z.string().describe('ISO language code or language name'),
        title: z.string().describe('Page title or heading'),
        content: z.string().describe('Main content text')
    }))
});

/**
 * Generate a parallel corpora dataset with aligned text across multiple languages
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information 
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateParallelCorporaDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Determine languages to use
        const selectedLanguages = computeInfo.languages || 
            ['english', 'french', 'spanish', 'german', 'chinese', 'arabic', 'hindi'];
        
        // For Indic languages, add some common ones
        if (computeInfo.includeIndic) {
            ['hindi', 'bengali', 'tamil', 'telugu', 'marathi']
                .forEach(lang => {
                    if (!selectedLanguages.includes(lang)) {
                        selectedLanguages.push(lang);
                    }
                });
        }

        const { object } = await generateObject({
            model,
            schema: parallelCorporaSchema,
            prompt: `You are an expert at creating high-quality parallel corpora datasets for training multilingual language models.
            
I'll provide you with text content, and I want you to create ${sampleCount} parallel corpus examples with aligned text across multiple languages.

For each example:
1. Extract a meaningful sentence or short paragraph from the content
2. Translate it accurately into these languages: ${selectedLanguages.join(', ')}
3. Ensure each translation preserves the meaning and nuance of the original
4. Make sure translations use proper grammar, idioms, and cultural adaptations
5. Create an object where each language is a field and its translation is the value

Key considerations:
- Focus on sentences/paragraphs that would be useful for training translation systems
- Ensure high accuracy and naturalness in all translations
- Provide diverse examples covering different topics from the source material
- Make sure the translations align perfectly in meaning across all languages

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

Generate ${sampleCount} parallel corpus examples with alignments across multiple languages based on this content.`,
        });

        // Post-process to ensure quality and language correctness
        const enhancedSamples = object.samples.map((sample: Record<string, string>) => {
            // Standardize language names to lowercase
            const standardizedSample: Record<string, string> = {};
            for (const [lang, text] of Object.entries(sample)) {
                standardizedSample[lang.toLowerCase()] = text;
            }
            
            return standardizedSample;
        });

        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating parallel corpora dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generate a monolingual text dataset in multiple languages
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateMonolingualTextDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Default languages to sample from (will be distributed across the samples)
        const defaultLanguages = [
            "english", "spanish", "french", "german", "chinese", 
            "japanese", "korean", "arabic", "russian", "hindi"
        ];
        
        // Add Indic languages if requested
        const indicLanguages = [
            "hindi", "bengali", "tamil", "telugu", 
            "marathi", "gujarati", "kannada", "malayalam"
        ];
        
        // Determine languages to use
        let selectedLanguages = computeInfo.languages || defaultLanguages;
        if (computeInfo.includeIndic) {
            selectedLanguages = [...selectedLanguages, ...indicLanguages];
        }
        
        const { object } = await generateObject({
            model,
            schema: monolingualTextSchema,
            prompt: `You are an expert at creating high-quality monolingual text datasets for training language models.
            
I'll provide you with text content, and I want you to create ${sampleCount} diverse text samples across multiple languages.

For each sample, please:
1. Select one of these languages: ${selectedLanguages.join(', ')}
2. Create natural, fluent text in that language that conveys similar information or concepts as the original content
3. Vary the length and complexity across samples (some short, some longer)
4. For non-English languages, include cultural adaptations as needed
5. Add cultural notes explaining context or adaptations when relevant
6. Distribute examples across different languages for balance

The content should be natural in each language and follow appropriate grammar, idioms, and conventions.

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

Generate ${sampleCount} high-quality monolingual text samples distributed across different languages.`,
        });
        
        // Post-process to ensure quality
        const enhancedSamples = object.samples.map((sample: MonolingualTextEntry) => {
            // Standardize language codes
            sample.language = sample.language.toLowerCase();
            
            // Fix common language code issues
            const languageFixMap: {[key: string]: string} = {
                'english': 'en',
                'spanish': 'es',
                'french': 'fr',
                'german': 'de',
                'chinese': 'zh',
                'japanese': 'ja',
                'korean': 'ko',
                'russian': 'ru',
                'arabic': 'ar',
                'hindi': 'hi',
                'bengali': 'bn',
                'telugu': 'te',
                'tamil': 'ta',
                'marathi': 'mr',
                'gujarati': 'gu',
                'kannada': 'kn',
                'malayalam': 'ml'
            };
            
            if (languageFixMap[sample.language]) {
                sample.language = languageFixMap[sample.language];
            }
            
            return sample;
        });
        
        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating monolingual text dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generate an instruction tuning dataset in multiple languages
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateInstructionTuningDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Determine instruction types to create a balanced dataset
        const instructionTypes = [
            'direct',    // Simple direct instructions
            'implicit',  // Instructions that require inference
            'multi-step', // Instructions with multiple steps
            'creative',  // Instructions requiring creative output
            'analytical' // Instructions requiring analysis
        ];
        
        // Calculate balanced distribution of instruction types
        const typesCount = Math.min(sampleCount, instructionTypes.length);
        const samplesPerType = Math.ceil(sampleCount / typesCount);
        
        // Default languages to sample from (will be distributed across the samples)
        const defaultLanguages = ["en", "es", "fr", "de", "zh", "hi"];
        
        // Determine languages to use
        let selectedLanguages = computeInfo.languages || defaultLanguages;
        
        const { object } = await generateObject({
            model,
            schema: instructionTuningSchema,
            prompt: `You are an expert at creating high-quality instruction tuning datasets for language models.
            
I'll provide you with text content, and I want you to create ${sampleCount} diverse instruction-input-output examples across multiple languages.

For each sample, please:
1. Create a clear instruction related to the content (e.g., translate, summarize, analyze)
2. Provide an input text related to the content (a sentence or paragraph to work with)
3. Create a high-quality expected output that follows the instruction
4. Assign one of these instruction types: direct, implicit, multi-step, creative, analytical
5. Select one of these languages: ${selectedLanguages.join(', ')}
6. Optionally add constraints that the model should follow

Create a balanced mix of:
- Instruction types (simple to complex)
- Languages across your examples
- Complexity levels of instructions
- Types of tasks (translation, summarization, analysis, etc.)

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

Generate ${sampleCount} high-quality instruction tuning examples based on this content.`,
        });
        
        // Post-process to ensure quality
        const enhancedSamples = object.samples.map((sample: InstructionTuningEntry) => {
            // Standardize language codes
            sample.language = sample.language.toLowerCase();
            
            // Fix common language code issues
            const languageFixMap: {[key: string]: string} = {
                'english': 'en',
                'spanish': 'es',
                'french': 'fr',
                'german': 'de',
                'chinese': 'zh',
                'japanese': 'ja',
                'korean': 'ko',
                'hindi': 'hi'
            };
            
            if (languageFixMap[sample.language]) {
                sample.language = languageFixMap[sample.language];
            }
            
            // Ensure instruction type is assigned
            if (!sample.instruction_type) {
                sample.instruction_type = 'direct';
            }
            
            return sample;
        });
        
        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating instruction tuning dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generate a benchmark/evaluation dataset for multiple tasks and languages
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateBenchmarkDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Define evaluation tasks
        const evaluationTasks = [
            'sentiment_analysis',
            'named_entity_recognition',
            'text_classification',
            'question_answering',
            'paraphrase_detection'
        ];
        
        // Default languages
        const defaultLanguages = ["en", "es", "fr", "ar", "zh", "hi", "ru"];
        
        // Determine languages to use
        const selectedLanguages = computeInfo.languages || defaultLanguages;
        
        const { object } = await generateObject({
            model,
            schema: benchmarkEvaluationSchema,
            prompt: `You are an expert at creating high-quality benchmark datasets for evaluating multilingual language models.
            
I'll provide you with text content, and I want you to create ${sampleCount} diverse evaluation examples across different tasks and languages.

Create examples for these evaluation tasks:
- sentiment_analysis: Classify text sentiment (positive, negative, neutral)
- named_entity_recognition: Identify and label entities in text
- text_classification: Assign categories to text
- question_answering: Create question-answer pairs
- paraphrase_detection: Identify if two texts have same meaning

For each example:
1. Select one of the tasks above
2. Choose one of these languages: ${selectedLanguages.join(', ')}
3. Extract or create a relevant text sample from the content
4. Add appropriate labels or entities based on the task
5. Ensure high accuracy in the annotations
6. Distribute examples across tasks and languages

For named_entity_recognition tasks, include entities like:
- PERSON (people names)
- LOCATION (places, cities, countries)
- ORGANIZATION (companies, agencies)
- DATE (dates and times)
- NUMBER (quantities, money)

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

Generate ${sampleCount} high-quality benchmark evaluation examples based on this content.`,
        });
        
        // Post-process to ensure quality
        const enhancedSamples = object.samples.map((sample: BenchmarkEvaluationEntry) => {
            // Standardize language codes
            sample.language = sample.language.toLowerCase();
            
            // Fix common language code issues
            const languageFixMap: {[key: string]: string} = {
                'english': 'en',
                'spanish': 'es',
                'french': 'fr',
                'german': 'de',
                'chinese': 'zh',
                'arabic': 'ar',
                'hindi': 'hi',
                'russian': 'ru'
            };
            
            if (languageFixMap[sample.language]) {
                sample.language = languageFixMap[sample.language];
            }
            
            // Add default for missing fields based on task type
            if (sample.task === 'sentiment_analysis' && !sample.label) {
                sample.label = 'neutral';
            }
            
            if (sample.task === 'named_entity_recognition' && (!sample.entities || sample.entities.length === 0)) {
                sample.entities = [];
            }
            
            return sample;
        });
        
        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating benchmark dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generate a domain-specific dataset in multiple languages
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateDomainSpecificDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Define domains to cover
        const domains = [
            'legal', 'medical', 'scientific', 'financial', 
            'technical', 'educational', 'governmental', 'literary'
        ];
        
        // Default languages
        const defaultLanguages = ["en", "fr", "es", "de", "zh", "ar", "hi"];
        
        // Determine languages to use
        const selectedLanguages = computeInfo.languages || defaultLanguages;
        
        const { object } = await generateObject({
            model,
            schema: domainSpecificSchema,
            prompt: `You are an expert at creating high-quality domain-specific multilingual datasets for language models.
            
I'll provide you with text content, and I want you to create ${sampleCount} diverse domain-specific examples across different languages.

Create examples for these specialized domains:
- legal: Legal terminology and phrasing
- medical: Healthcare and medical terminology
- scientific: Scientific concepts and terminology
- financial: Banking, investment, economic terms
- technical: Engineering, IT, programming
- educational: Academic, teaching materials
- governmental: Public administration, policy language
- literary: Literary, poetic, narrative styles

For each example:
1. Select one of the domains above
2. Choose one of these languages: ${selectedLanguages.join(', ')}
3. Create or adapt text that would be typical in that domain
4. For non-English text, provide an English translation
5. Ensure specialized terminology is used accurately
6. Distribute examples across domains and languages
7. Use domain-appropriate style, formality and structure

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

Generate ${sampleCount} high-quality domain-specific examples based on this content.`,
        });
        
        // Post-process to ensure quality
        const enhancedSamples = object.samples.map((sample: DomainSpecificEntry) => {
            // Standardize language codes
            sample.language = sample.language.toLowerCase();
            
            // Fix common language code issues
            const languageFixMap: {[key: string]: string} = {
                'english': 'en',
                'spanish': 'es',
                'french': 'fr',
                'german': 'de',
                'chinese': 'zh',
                'arabic': 'ar',
                'hindi': 'hi'
            };
            
            if (languageFixMap[sample.language]) {
                sample.language = languageFixMap[sample.language];
            }
            
            // If no translation provided for non-English content, add placeholder note
            if (sample.language !== 'en' && !sample.translation) {
                sample.translation = '[Translation not provided]';
            }
            
            return sample;
        });
        
        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating domain-specific dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generate a web-crawled dataset in multiple languages
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateWebCrawledDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Default languages
        const defaultLanguages = ["en", "es", "fr", "de", "zh", "ja", "hi", "ar", "ru"];
        
        // Determine languages to use
        const selectedLanguages = computeInfo.languages || defaultLanguages;
        
        const { object } = await generateObject({
            model,
            schema: webCrawledSchema,
            prompt: `You are an expert at creating high-quality web-crawled datasets for training language models.
            
I'll provide you with text content, and I want you to create ${sampleCount} diverse web page examples across multiple languages.

For each example:
1. Create a plausible URL for a fictional website that might contain this content
2. Choose one of these languages: ${selectedLanguages.join(', ')}
3. Create a page title that would be appropriate for the content
4. Generate web page content adapting information from the provided text
5. Ensure the content seems like it would appear on an actual website
6. Vary the website types (news, blog, academic, forum, etc.)
7. Distribute examples across different languages
8. Match content style to the website type (formal for academic, conversational for forums)

The goal is to simulate diverse web-crawled data similar to datasets like CC-100 or mC4.

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

Generate ${sampleCount} high-quality web page examples based on this content.`,
        });
        
        // Post-process to ensure quality
        const enhancedSamples = object.samples.map((sample: WebCrawledEntry) => {
            // Standardize language codes
            sample.language = sample.language.toLowerCase();
            
            // Fix common language code issues
            const languageFixMap: {[key: string]: string} = {
                'english': 'en',
                'spanish': 'es',
                'french': 'fr',
                'german': 'de',
                'chinese': 'zh',
                'japanese': 'ja',
                'korean': 'ko',
                'arabic': 'ar',
                'hindi': 'hi',
                'russian': 'ru'
            };
            
            if (languageFixMap[sample.language]) {
                sample.language = languageFixMap[sample.language];
            }
            
            // Ensure URL has protocol
            if (!sample.url.startsWith('http')) {
                sample.url = 'https://' + sample.url;
            }
            
            return sample;
        });
        
        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating web crawled dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}