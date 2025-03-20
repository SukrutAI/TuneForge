/**
 * Indian Languages Dataset Generator Module
 * 
 * Contains specialized generators for Indian language datasets based on IndicGenBench formats.
 * Supports summarization, translation, question answering, and cross-lingual QA tasks.
 */
import { generateObject } from 'ai';
import colors from '../utils/colors';
import { z } from 'zod';
import type { ComputeInfo } from '../types/index';

// List of Indian languages with ISO codes
const INDIC_LANGUAGES = {
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
    'ar': 'Arabic',
    'en': 'English',
};

// Zod schema for summarization corpus (crosssum_in style)
const indicSummarizationSchema = z.object({
    samples: z.array(z.object({
        article: z.string().describe('Original text content to be summarized'),
        summary: z.string().describe('Concise summary of the article'),
        language: z.string().describe('ISO language code (e.g., "hi", "bn", "ta")'),
        domain: z.string().optional().describe('Domain of the content (e.g., "news", "academic", "general")'),
        title: z.string().optional().describe('Title of the article (if applicable)')
    }))
});

// Zod schema for translation dataset (flores_in style)
const indicTranslationSchema = z.object({
    samples: z.array(z.object({
        en: z.string().describe('English text'),
        translation: z.string().describe('Translated text in target language'),
        target_lang: z.string().describe('ISO code for the target language'),
        domain: z.string().optional().describe('Domain of the text (e.g., "news", "general", "technical")'),
        complexity: z.enum(['simple', 'moderate', 'complex']).optional().describe('Complexity level of the translation')
    }))
});

// Zod schema for question answering (xquad_in style)
const indicQASchema = z.object({
    samples: z.array(z.object({
        question: z.string().describe('Question in the specified language'),
        context: z.string().describe('Context passage in the specified language'),
        answer: z.string().describe('Answer to the question extracted from context'),
        language: z.string().describe('ISO language code (e.g., "hi", "bn", "ta")'),
        answer_start: z.number().optional().describe('Character position where answer starts in context'),
        is_impossible: z.boolean().optional().describe('Whether question is answerable from the context')
    }))
});

// Zod schema for cross-lingual QA (xorqa_in style)
const indicCrossLingualQASchema = z.object({
    samples: z.array(z.object({
        question: z.string().describe('Question in the specified language'),
        context_en: z.string().describe('Context passage in English'),
        answer: z.string().describe('Answer in the source language'),
        language: z.string().describe('ISO language code (e.g., "hi", "bn", "ta")'),
        english_question: z.string().optional().describe('English translation of the question'),
        english_answer: z.string().optional().describe('English translation of the answer')
    }))
});

/**
 * Generate a summarization dataset optimized for Indian languages (crosssum_in style)
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateIndicSummarizationDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Determine which Indian languages to use
        const languagesToUse = computeInfo.languages && computeInfo.languages.filter(lang => 
            Object.keys(INDIC_LANGUAGES).includes(lang)
        ) || Object.keys(INDIC_LANGUAGES);

        // If no Indian languages specified, default to Hindi, Bengali, Tamil
        const selectedLanguages = languagesToUse.length > 0 ? 
            languagesToUse : ['hi', 'bn', 'ta', 'te', 'mr', 'ml'];

        console.log(colors.blue(`Generating summarization data for languages: ${selectedLanguages.join(', ')}`));

        const { object } = await generateObject({
            model,
            schema: indicSummarizationSchema,
            prompt: `You are an expert at creating high-quality summarization datasets for Indian language models.
            
I'll provide you with text content, and I want you to create ${sampleCount} article-summary pairs for IndicNLG Suite style dataset across multiple Indian languages.

For each example:
1. Choose one of these languages: ${selectedLanguages.join(', ')}
2. Extract or create a substantial passage (article) in that language
3. Write a concise summary of that article in the same language
4. Ensure the summary captures the key points of the article
5. Assign an appropriate domain for the content
6. Make sure the text uses proper grammar, idioms, and cultural adaptations

KEY REQUIREMENTS:
- For Hindi (hi), use proper Hindi grammar and vocabulary (not Hinglish)
- For other languages, maintain authenticity of expressions and idioms
- Create naturally flowing text, not translationese
- Vary summary length (some short, concise; others more detailed)
- Ensure correct use of script and honorifics appropriate to each language

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

Generate ${sampleCount} high-quality article-summary pairs distributed across Indian languages.`,
        });

        // Post-process to ensure quality
        const enhancedSamples = object.samples.map(sample => {
            // Ensure language code is valid
            const lang = sample.language.toLowerCase().trim();
            
            // Fix common language name issues
            const languageFixMap: {[key: string]: string} = {
                'hindi': 'hi',
                'bengali': 'bn',
                'telugu': 'te',
                'tamil': 'ta',
                'marathi': 'mr',
                'gujarati': 'gu',
                'kannada': 'kn',
                'malayalam': 'ml',
                'punjabi': 'pa',
                'odia': 'or',
                'assamese': 'as',
                'sanskrit': 'sa'
            };
            
            if (languageFixMap[lang]) {
                sample.language = languageFixMap[lang];
            }
            
            // Ensure domain is provided
            if (!sample.domain) {
                sample.domain = detectDomain(sample.article);
            }
            
            return sample;
        });
        
        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating Indic summarization dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generate a translation dataset optimized for Indian languages (flores_in style)
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateIndicTranslationDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Determine which Indian languages to use
        const languagesToUse = computeInfo.languages && computeInfo.languages.filter(lang => 
            Object.keys(INDIC_LANGUAGES).includes(lang)
        ) || Object.keys(INDIC_LANGUAGES);

        // If no Indian languages specified, default to Hindi, Bengali, Tamil
        const selectedLanguages = languagesToUse.length > 0 ? 
            languagesToUse : ['hi', 'bn', 'ta', 'te', 'mr', 'ml'];

        console.log(colors.blue(`Generating Samanantar/FLORES-style translation data for languages: ${selectedLanguages.join(', ')}`));

        // Distribute samples evenly across languages
        const samplesPerLanguage = Math.ceil(sampleCount / selectedLanguages.length);

        const { object } = await generateObject({
            model,
            schema: indicTranslationSchema,
            prompt: `You are an expert at creating high-quality parallel translation datasets for Indian language models.
            
I'll provide you with text content, and I want you to create ${sampleCount} English-to-Indian-language translation pairs in the Samanantar/FLORES dataset style.

For each example:
1. Create a natural English sentence or short paragraph
2. Translate it accurately into one of these Indian languages: ${selectedLanguages.join(', ')}
3. Make sure translations use proper grammar, script, and cultural adaptations
4. Vary complexity from simple to complex translations
5. Assign a complexity level (simple, moderate, complex)
6. Cover diverse domains and topics (news, conversation, technical, etc.)

CRITICAL QUALITY GUIDELINES:
- Ensure translations maintain semantic equivalence
- Use authentic expressions and idioms native to the target language
- Avoid literal word-for-word translations that sound unnatural
- Properly handle cultural concepts that differ between languages
- Create professional-quality translations like those in the FLORES-200 dataset
- Use proper script and Unicode for each language

Aim for about ${samplesPerLanguage} examples per language, distributed across different complexity levels.

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

Generate ${sampleCount} high-quality translation pairs for Indian languages.`,
        });

        // Post-process to ensure quality
        const enhancedSamples = object.samples.map(sample => {
            // Ensure language code is valid
            const lang = sample.target_lang.toLowerCase().trim();
            
            // Fix common language name issues
            const languageFixMap: {[key: string]: string} = {
                'hindi': 'hi',
                'bengali': 'bn',
                'telugu': 'te',
                'tamil': 'ta',
                'marathi': 'mr',
                'gujarati': 'gu',
                'kannada': 'kn',
                'malayalam': 'ml',
                'punjabi': 'pa',
                'odia': 'or',
                'assamese': 'as',
                'sanskrit': 'sa'
            };
            
            if (languageFixMap[lang]) {
                sample.target_lang = languageFixMap[lang];
            }
            
            // Assign default complexity if not provided
            if (!sample.complexity) {
                sample.complexity = 'moderate';
            }
            
            // Infer domain if not provided
            if (!sample.domain) {
                sample.domain = detectDomain(sample.en);
            }
            
            return sample;
        });
        
        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating Indic translation dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generate a question-answering dataset optimized for Indian languages (xquad_in style)
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateIndicQADataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Determine which Indian languages to use
        const languagesToUse = computeInfo.languages && computeInfo.languages.filter(lang => 
            Object.keys(INDIC_LANGUAGES).includes(lang)
        ) || Object.keys(INDIC_LANGUAGES);

        // If no Indian languages specified, default to Hindi, Bengali, Tamil
        const selectedLanguages = languagesToUse.length > 0 ? 
            languagesToUse : ['hi', 'bn', 'ta'];

        console.log(colors.blue(`Generating IndicQA/XQuAD-style QA data for languages: ${selectedLanguages.join(', ')}`));

        // Distribute samples evenly across languages
        const samplesPerLanguage = Math.ceil(sampleCount / selectedLanguages.length);

        const { object } = await generateObject({
            model,
            schema: indicQASchema,
            prompt: `You are an expert at creating high-quality question-answering datasets for Indian language models.
            
I'll provide you with text content, and I want you to create ${sampleCount} context-question-answer triplets in the IndicQA/XQuAD dataset style.

For each example:
1. Write a paragraph of context content in one of these Indian languages: ${selectedLanguages.join(', ')}
2. Create a question in the same language that can be answered from the context
3. Provide the exact answer string extracted from the context
4. Indicate if the question is possible to answer from the context
5. Cover different question types (who, what, when, where, why, how)

IMPORTANT REQUIREMENTS:
- Each answer must be a span directly extracted from the context
- Context must be natural, fluent text with proper grammar and script
- Questions should vary in difficulty (simple factual to complex reasoning)
- Create authentic content, not just translations of English content
- Ensure correct use of pronouns, honorifics appropriate to each language
- Make approximately ${samplesPerLanguage} examples per language

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

Generate ${sampleCount} high-quality QA examples in Indian languages.`,
        });

        // Post-process to ensure quality
        const enhancedSamples = object.samples.map(sample => {
            // Ensure language code is valid
            const lang = sample.language.toLowerCase().trim();
            
            // Fix common language name issues
            const languageFixMap: {[key: string]: string} = {
                'hindi': 'hi',
                'bengali': 'bn',
                'telugu': 'te',
                'tamil': 'ta',
                'marathi': 'mr',
                'gujarati': 'gu',
                'kannada': 'kn',
                'malayalam': 'ml',
                'punjabi': 'pa',
                'odia': 'or',
                'assamese': 'as',
                'sanskrit': 'sa'
            };
            
            if (languageFixMap[lang]) {
                sample.language = languageFixMap[lang];
            }
            
            // Try to determine answer_start if not provided
            if (sample.answer_start === undefined) {
                const answerPos = sample.context.indexOf(sample.answer);
                if (answerPos >= 0) {
                    sample.answer_start = answerPos;
                }
            }
            
            // Set default for is_impossible if not provided
            if (sample.is_impossible === undefined) {
                sample.is_impossible = false;
            }
            
            return sample;
        });
        
        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating Indic QA dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generate a cross-lingual question-answering dataset (xorqa_in style)
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateIndicCrossLingualQADataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Determine which Indian languages to use
        const languagesToUse = computeInfo.languages && computeInfo.languages.filter(lang => 
            Object.keys(INDIC_LANGUAGES).includes(lang)
        ) || Object.keys(INDIC_LANGUAGES);

        // If no Indian languages specified, default to Hindi, Bengali, Tamil
        const selectedLanguages = languagesToUse.length > 0 ? 
            languagesToUse : ['hi', 'bn', 'ta'];

        console.log(colors.blue(`Generating XOR-TyDi-style cross-lingual QA data for languages: ${selectedLanguages.join(', ')}`));

        // Distribute samples evenly across languages
        const samplesPerLanguage = Math.ceil(sampleCount / selectedLanguages.length);

        const { object } = await generateObject({
            model,
            schema: indicCrossLingualQASchema,
            prompt: `You are an expert at creating high-quality cross-lingual question-answering datasets like XOR-TyDI.
            
I'll provide you with text content, and I want you to create ${sampleCount} cross-lingual QA examples where:
- Questions are in Indian languages
- Context passages are in English
- Answers are in the same Indian language as the question

For each example:
1. Create an English paragraph as context
2. Create a question in one of these Indian languages: ${selectedLanguages.join(', ')}
3. Provide an answer in the same Indian language as the question
4. Include English translations of both the question and answer
5. Ensure the question relates to information in the English context

QUALITY REQUIREMENTS:
- Questions must be native-quality in each language (proper grammar, script, idioms)
- English contexts should be informative and contain the answer information
- Answers should be concise and directly address the questions
- Create authentic content that represents real cross-lingual information needs
- Make approximately ${samplesPerLanguage} examples per language

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

Generate ${sampleCount} high-quality cross-lingual QA examples.`,
        });

        // Post-process to ensure quality
        const enhancedSamples = object.samples.map(sample => {
            // Ensure language code is valid
            const lang = sample.language.toLowerCase().trim();
            
            // Fix common language name issues
            const languageFixMap: {[key: string]: string} = {
                'hindi': 'hi',
                'bengali': 'bn',
                'telugu': 'te',
                'tamil': 'ta',
                'marathi': 'mr',
                'gujarati': 'gu',
                'kannada': 'kn',
                'malayalam': 'ml',
                'punjabi': 'pa',
                'odia': 'or',
                'assamese': 'as',
                'sanskrit': 'sa'
            };
            
            if (languageFixMap[lang]) {
                sample.language = languageFixMap[lang];
            }
            
            return sample;
        });
        
        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating Indic cross-lingual QA dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Utility function to detect the domain of a text
 * @param text Input text to analyze
 * @returns Detected domain
 */
function detectDomain(text: string): string {
    const text_lower = text.toLowerCase();
    
    // News domain detection
    if (text_lower.includes('news') || 
        text_lower.includes('report') || 
        text_lower.includes('journalist') ||
        text_lower.includes('media') ||
        text_lower.includes('today') ||
        text_lower.includes('headlines')) {
        return 'news';
    }
    
    // Scientific/technical domain detection
    if (text_lower.includes('research') || 
        text_lower.includes('study') || 
        text_lower.includes('scientific') ||
        text_lower.includes('data') ||
        text_lower.includes('analysis') ||
        text_lower.includes('technology')) {
        return 'scientific';
    }
    
    // Legal domain detection
    if (text_lower.includes('law') || 
        text_lower.includes('legal') || 
        text_lower.includes('court') ||
        text_lower.includes('rights') ||
        text_lower.includes('justice') ||
        text_lower.includes('constitution')) {
        return 'legal';
    }
    
    // Medical domain detection
    if (text_lower.includes('health') || 
        text_lower.includes('medical') || 
        text_lower.includes('doctor') ||
        text_lower.includes('patient') ||
        text_lower.includes('disease') ||
        text_lower.includes('treatment')) {
        return 'medical';
    }
    
    // Educational domain detection
    if (text_lower.includes('education') || 
        text_lower.includes('school') || 
        text_lower.includes('student') ||
        text_lower.includes('learn') ||
        text_lower.includes('teacher') ||
        text_lower.includes('knowledge')) {
        return 'educational';
    }
    
    // Default to general domain
    return 'general';
}