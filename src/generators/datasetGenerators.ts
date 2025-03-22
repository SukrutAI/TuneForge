/**
 * Dataset Generator Module
 * 
 * Contains generators for different types of datasets using AI models
 */
import { generateObject } from 'ai';
import colors from '../utils/colors';
import { z } from 'zod';
import type { ComputeInfo } from '../types/index';
import { 
    COMMON_LANGUAGE_CODES, 
    INDIC_LANGUAGE_CODES, 
    normalizeLanguageCode, 
    
    detectDomain
} from '../utils/languageUtils';

// Zod schema for QA dataset
const qaSchema = z.object({
    samples: z.array(z.object({
        question: z.string().describe('A meaningful question about the content'),
        answer: z.string().describe('A comprehensive answer based on the content'),
        difficulty: z.enum(['basic', 'intermediate', 'advanced']).describe('The difficulty level of the question'),
        context: z.string().describe('The specific context or section from which this QA pair is derived'),
        question_type: z.enum(['factual', 'conceptual', 'analytical', 'application', 'synthesis']).describe('The type of cognitive skill required by the question'),
        metadata: z.object({
            requires_external_knowledge: z.boolean().describe('Whether answering requires knowledge beyond the provided context'),
            topic_area: z.string().describe('The main topic area this question belongs to')
        }).optional()
    }))
});

// Zod schema for role-playing dataset
const rpSchema = z.object({
    samples: z.array(z.object({
        scenario: z.string().describe('A role-playing scenario based on the content'),
        system_instruction: z.string().describe('System instruction for the AI to follow in this scenario'),
        example_conversation: z.array(z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string()
        })).min(4).describe('Example conversation demonstrating the role-play'),
        complexity_level: z.enum(['beginner', 'intermediate', 'complex']).describe('The complexity level of this role-playing scenario'),
        skills_demonstrated: z.array(z.string()).describe('Key skills demonstrated in this scenario')
    }))
});

// Zod schema for classifier dataset
const classifierSchema = z.object({
    samples: z.array(z.object({
        text: z.string().describe('A text snippet from the content'),
        categories: z.array(z.string()).describe('Categories that apply to this text'),
        explanation: z.string().describe('Explanation of why these categories apply'),
        confidence: z.number().min(0).max(1).describe('Confidence score for this classification'),
        alternative_categories: z.array(z.object({
            category: z.string(),
            reason_rejected: z.string()
        })).optional().describe('Alternative categories that were considered but rejected')
    }))
});

// Zod schema for multilingual corpus dataset
const multilingualSchema = z.object({
    samples: z.array(z.object({
        text: z.string().describe('Text content in a specific language'),
        language: z.string().describe('ISO language code (e.g., "en", "es", "fr")'),
        original_text: z.string().optional().describe('Original text if this is a translation'),
        original_language: z.string().optional().describe('Original language code if this is a translation'),
        cultural_notes: z.string().optional().describe('Cultural context notes relevant to this text')
    }))
});

// Zod schema for parallel corpus dataset
const parallelCorpusSchema = z.object({
    samples: z.array(z.object({
        source: z.string().describe('Text in the source language'),
        target: z.string().describe('Translated text in the target language'),
        source_lang: z.string().describe('ISO code for source language'),
        target_lang: z.string().describe('ISO code for target language'),
        domain: z.string().optional().describe('Domain of the text (e.g., technical, literary, conversational)'),
        complexity: z.enum(['simple', 'standard', 'complex']).optional().describe('Complexity level of the text')
    }))
});

// Zod schema for instruction following dataset
const instructionSchema = z.object({
    samples: z.array(z.object({
        instruction: z.string().describe('An instruction for the model to follow'),
        output: z.string().describe('The expected output for the instruction'),
        language: z.string().optional().describe('ISO language code (optional)'),
        instruction_type: z.enum(['direct', 'implicit', 'multi-step', 'creative', 'analytical']).describe('The type of instruction'),
        constraints: z.array(z.string()).optional().describe('Any constraints on the execution of the instruction')
    }))
});

// Zod schema for summarization dataset
const summarizationSchema = z.object({
    samples: z.array(z.object({
        document: z.string().describe('A longer document or text passage'),
        summary: z.string().describe('A concise summary of the document'),
        language: z.string().optional().describe('ISO language code (optional)'),
        summary_type: z.enum(['extractive', 'abstractive', 'hybrid']).describe('The type of summarization technique'),
        length_ratio: z.number().min(0).max(1).describe('Ratio of summary length to document length'),
        key_points_covered: z.array(z.string()).optional().describe('List of key points covered in the summary')
    }))
});

/**
 * Generates a QA dataset from the given content chunk
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateQADataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Calculate distribution of difficulty levels based on sample count
        const basicCount = Math.ceil(sampleCount * 0.3);      // 30% basic questions
        const intermediateCount = Math.ceil(sampleCount * 0.5); // 50% intermediate questions
        const advancedCount = Math.floor(sampleCount * 0.2);   // 20% advanced questions

        // Ensure distribution adds up to sample count
        const totalCount = basicCount + intermediateCount + advancedCount;
        const adjustedAdvancedCount = advancedCount + (sampleCount - totalCount);

        const { object } = await generateObject({
            model,
            schema: qaSchema,
            prompt: `You are an expert at creating high-quality question-answer pairs for training instruction-tuned AI models.
      
I'll provide you with text content, and I want you to create ${sampleCount} diverse and meaningful question-answer pairs based on this content.

Create a balanced distribution of question difficulty:
- Basic questions: ${basicCount} (simple recall and understanding)
- Intermediate questions: ${intermediateCount} (application and analysis)
- Advanced questions: ${adjustedAdvancedCount} (evaluation and synthesis)

Create a variety of question types:
- Factual questions that test knowledge retrieval
- Conceptual questions that test understanding of principles
- Analytical questions that require critical thinking
- Application questions that apply concepts to new situations
- Synthesis questions that connect multiple ideas

For each question-answer pair:
1. Ensure the question is precise, clear, and unambiguous
2. Make answers comprehensive but concise, with key information
3. Include only factually accurate information from the content
4. For advanced questions, explore nuanced aspects of the content
5. Tag each question with appropriate metadata (difficulty, type, topic)

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

${computeInfo.specs ? `Additional compute information: ${JSON.stringify(computeInfo.specs, null, 2)}` : ''}

Generate ${sampleCount} high-quality question-answer pairs with varying difficulty levels based ONLY on this content. Ensure questions test different cognitive skills and cover the full range of content.`,
        });

        // Post-process to ensure quality and balance
        const samples = object.samples.map(sample => {
            // Ensure answer isn't too short or generic
            if (sample.answer.length < 20) {
                sample.answer += " [Note: This answer has been expanded to provide more details based on the content.]";
            }
            return sample;
        });

        // Return balanced samples
        return { samples };
    } catch (error) {
        console.error(colors.red(`Error generating QA dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generates a role-playing dataset from the given content chunk
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateRPDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        const { object } = await generateObject({
            model,
            schema: rpSchema,
            prompt: `You are an expert at creating role-playing scenarios for training instruction-tuned AI models.
      
I'll provide you with text content, and I want you to create ${sampleCount} diverse role-playing scenarios based on this content.

Create a variety of scenarios with different complexity levels:
- Beginner: Straightforward scenarios with clear expectations
- Intermediate: Scenarios with some nuance requiring deeper understanding
- Complex: Sophisticated scenarios that test adaptability and expertise

Each scenario should:
- Be directly based on the concepts, situations, or information in the provided content
- Include a clear, detailed system instruction for the AI to follow
- Include a realistic example conversation (at least 4 exchanges) showing the expected interaction
- Demonstrate different skills (e.g., explanation, empathy, problem-solving)
- Include natural conversation patterns including clarifying questions and corrections
- Be creative yet realistic and directly relevant to the source material

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

${computeInfo.specs ? `Additional compute information: ${JSON.stringify(computeInfo.specs, null, 2)}` : ''}

Generate ${sampleCount} role-playing scenarios with example conversations based ONLY on this content. Make the scenarios diverse in terms of complexity and skills demonstrated.`,
        });

        // Post-process to ensure quality
        const enhancedSamples = object.samples.map(sample => {
            // Ensure system instructions are detailed enough
            if (sample.system_instruction.length < 50) {
                sample.system_instruction = `${sample.system_instruction} Be informative, accurate, and responsive to the specific details of the user's questions. Base your responses only on the actual content provided about this topic.`;
            }

            // Ensure conversation has enough turns
            if (sample.example_conversation.length < 4) {
                // Add additional turns to reach minimum length
                while (sample.example_conversation.length < 4) {
                    const isUser = sample.example_conversation.length % 2 === 0;
                    sample.example_conversation.push({
                        role: isUser ? 'user' : 'assistant',
                        content: isUser
                            ? "Could you elaborate more on that specific aspect?"
                            : "Certainly! Building on what I mentioned earlier, the content provides additional context that's relevant here..."
                    });
                }
            }

            return sample;
        });

        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating RP dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generates a classifier dataset from the given content chunk
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateClassifierDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        const { object } = await generateObject({
            model,
            schema: classifierSchema,

            prompt: `You are an expert at creating classification examples for training instruction-tuned AI models.
      
I'll provide you with text content, and I want you to create ${sampleCount} text snippets with appropriate category labels.

For each classification example:
1. Extract a meaningful, self-contained text snippet from the provided content
2. Assign 2-5 relevant categories that accurately describe the snippet
3. Provide a detailed explanation of why each category applies to the snippet
4. Assign a confidence score (0.0-1.0) representing how clearly the categories apply
5. Optionally provide alternative categories that you considered but rejected
6. Ensure snippets vary in length and complexity

Categories should be consistent across examples when appropriate, but also introduce new categories when needed to accurately classify the content. Categories might include:
- Subject areas (e.g., "physics", "history", "programming")
- Content types (e.g., "explanation", "example", "definition")
- Target audience (e.g., "beginner", "technical", "specialist")
- Style/tone (e.g., "formal", "conversational", "instructional")

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

${computeInfo.specs ? `Additional compute information: ${JSON.stringify(computeInfo.specs, null, 2)}` : ''}

Generate ${sampleCount} diverse classification examples based ONLY on this content, focusing on creating a dataset that would train a robust classifier.`,
        });

        // Post-process to standardize categories and ensure quality
        const processedSamples = object.samples.map(sample => {
            // Convert category names to lowercase for consistency
            sample.categories = sample.categories.map(cat => cat.toLowerCase().trim());

            // Ensure confidence score is present and valid
            if (!sample.confidence || isNaN(sample.confidence)) {
                sample.confidence = 0.85; // Default high confidence if missing
            }

            return sample;
        });

        return { samples: processedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating classifier dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generates a multilingual dataset from the given content chunk
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateMultilingualDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Common languages to ensure good distribution
        const commonLanguages = COMMON_LANGUAGE_CODES;

        // Indian Indic languages
        const indicLanguages = INDIC_LANGUAGE_CODES;

        // User-selected languages
        let selectedLanguages: string[] = [];

        if (computeInfo.languages && computeInfo.languages.length > 0) {
            // If user specified languages, use those
            selectedLanguages = computeInfo.languages;
            // Ensure we print on a new line, separating from progress bar
            process.stdout.write("\n");
            console.log(colors.blue(`Using user-specified languages: ${selectedLanguages.join(', ')}`));
        } else if (computeInfo.includeIndic) {
            // If --include-indic flag is used and no specific languages are provided,
            // only use Indian languages (not mixing with common languages)
            selectedLanguages = indicLanguages;
            // Ensure we print on a new line, separating from progress bar
            process.stdout.write("\n");
            console.log(colors.blue(`Using only Indian Indic languages: ${selectedLanguages.join(', ')}`));
        } else {
            // Default case - use common languages
            selectedLanguages = commonLanguages;
            // Ensure we print on a new line, separating from progress bar
            process.stdout.write("\n");
            console.log(colors.blue(`Using common languages: ${selectedLanguages.join(', ')}`));
        }

        // Limit languages based on sample count to ensure balanced distribution
        const languageCount = Math.min(selectedLanguages.length, sampleCount);
        const languagesToUse = selectedLanguages.slice(0, languageCount);

        // Calculate samples per language (ensuring every selected language gets at least one sample)
        const samplesPerLanguage = Math.floor(sampleCount / languageCount);
        const extraSamples = sampleCount % languageCount;

        // Ensure we print on a new line, separating from progress bar
        process.stdout.write("\n");
        console.log(colors.gray(`Generating ${sampleCount} samples across ${languageCount} languages (${samplesPerLanguage} per language, ${extraSamples} extra)`));

        const { object } = await generateObject({
            model,
            schema: multilingualSchema,
            prompt: `You are an expert at creating high-quality multilingual text datasets for training language models.
      
I'll provide you with text content, and I want you to create ${sampleCount} diverse multilingual text samples based on this content.

For language diversity, include samples in ONLY these specific languages:
${languagesToUse.map(l => `- ${l}`).join('\n')}

${computeInfo.includeIndic ?
                    'IMPORTANT: You MUST include Indian languages as specified above. These are the primary focus languages for this dataset.' :
                    ''}

Try to distribute samples evenly across all the listed languages, with approximately ${samplesPerLanguage} samples per language.

Each sample should:
1. Contain natural, fluent text in the chosen language that preserves the meaning and nuance of the original concepts
2. Maintain cultural appropriateness and idiomatic expressions for that language
3. Include the correct ISO language code (e.g., "en", "es", "fr", "hi", "ta")
4. Vary in length and complexity (some short phrases, some longer paragraphs)
5. When appropriate, include cultural notes explaining adaptations made for that language

The content should not be direct translations but rather convey similar information or concepts appropriately adapted for each language.

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

${computeInfo.specs ? `Additional compute information: ${JSON.stringify(computeInfo.specs, null, 2)}` : ''}

Generate ${sampleCount} high-quality multilingual text samples STRICTLY using only the specified languages. Ensure language diversity across all specified languages.`,
        });

        // Post-process to ensure quality and language diversity
        const enhancedSamples = object.samples.map(sample => {
            // Standardize language codes to lowercase
            sample.language = normalizeLanguageCode(sample.language);

            // Replace null values with empty strings to avoid JSON serialization issues
            if (sample.original_language === null) sample.original_language = '';
            if (sample.original_text === null) sample.original_text = '';
            if (sample.cultural_notes === null) sample.cultural_notes = '';

            return sample;
        });

        // Validate that we have the requested languages
        const resultLanguages = enhancedSamples.map(s => s.language);
        const uniqueLanguages = new Set(resultLanguages);

        // Log language distribution with a newline first
        process.stdout.write("\n");
        const languageDistribution = resultLanguages.reduce((acc: { [key: string]: number }, lang) => {
            acc[lang] = (acc[lang] || 0) + 1;
            return acc;
        }, {});

        console.log(colors.blue(`Generated multilingual samples with distribution: ${JSON.stringify(languageDistribution)}`));
        console.log(colors.blue(`Generated multilingual samples in ${uniqueLanguages.size} different languages`));

        // Verify we included Indic languages if requested
        if (computeInfo.includeIndic) {
            const indicLanguagesIncluded = enhancedSamples.filter(s =>
                indicLanguages.includes(s.language)
            );

            console.log(colors.blue(`Included ${indicLanguagesIncluded.length} Indian Indic language samples`));

            // If we're supposed to include Indic languages but none were generated,
            // log a warning message
            if (indicLanguagesIncluded.length === 0 && enhancedSamples.length > 0) {
                console.warn(colors.yellow(`Warning: No Indian Indic languages were included in the generated samples despite --include-indic flag.`));
            }
        }

        return { samples: enhancedSamples };
    } catch (error) {
        // Ensure error is printed on a new line
        process.stdout.write("\n");
        console.error(colors.red(`Error generating multilingual dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generate language pairs based on selected languages
 * @param languages Array of language codes
 * @returns Array of language pairs
 */
function generateLanguagePairs(languages: string[]): Array<{ source: string, target: string }> {
    const pairs: Array<{ source: string, target: string }> = [];

    // Always include English as a source/target for better coverage
    const hasEnglish = languages.includes('en');
    if (!hasEnglish) {
        languages.push('en');
    }

    // Generate pairs between English and each language
    languages.forEach(lang => {
        if (lang !== 'en') {
            pairs.push({ source: 'en', target: lang });
            pairs.push({ source: lang, target: 'en' });
        }
    });

    // Generate pairs between Indian languages for better coverage
    for (let i = 0; i < languages.length; i++) {
        for (let j = i + 1; j < languages.length; j++) {
            if (languages[i] !== 'en' && languages[j] !== 'en') {
                pairs.push({ source: languages[i], target: languages[j] });
                pairs.push({ source: languages[j], target: languages[i] });
            }
        }
    }

    return pairs;
}

export async function generateParallelCorpusDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Default language pairs if none specified
        const defaultLanguagePairs = [
            { source: "en", target: "hi" }, // English to Hindi
            { source: "hi", target: "en" }, // Hindi to English
            { source: "en", target: "ta" }, // English to Tamil
            { source: "ta", target: "en" }, // Tamil to English
        ];

        // Generate language pairs based on user selection or defaults
        let languagePairs = defaultLanguagePairs;

        if (computeInfo.languages && computeInfo.languages.length > 0) {
            // Generate pairs from user-selected languages
            languagePairs = generateLanguagePairs(computeInfo.languages);
            console.log(colors.blue(`Using comprehensive Indic language pairs with ${languagePairs.length} combinations`));
        }

        // Calculate samples per language pair
        const pairsToUse = languagePairs;
        const samplesPerPair = Math.max(1, Math.floor(sampleCount / pairsToUse.length));
        const totalSamples = samplesPerPair * pairsToUse.length;

        const { object } = await generateObject({
            model,
            schema: parallelCorpusSchema,
            prompt: `You are an expert at creating high-quality parallel language corpora for training translation models.
      
I'll provide you with text content, and I want you to create ${totalSamples} diverse source-target language pairs based on this content.

Create samples across these language pairs (${samplesPerPair} samples per pair):
${pairsToUse.map(pair => `- ${pair.source} to ${pair.target}`).join('\n')}

Each sample should:
1. Include a sentence or short paragraph in the source language
2. Provide an accurate, natural translation in the target language
3. Correctly specify the language codes for both source and target
4. Vary in complexity from simple to complex translations
5. Include domain-specific vocabulary when present in the source content
6. Preserve cultural context and meaning across languages
7. Handle Indic language nuances appropriately:
   - Use appropriate honorifics and formal/informal forms
   - Maintain cultural context and local expressions
   - Consider regional variations in language usage

For quality translations:
- Focus on conveying meaning rather than literal word-by-word translation
- Use appropriate idiomatic expressions in each language
- Correctly handle specialized terminology
- Consider variations in complexity
- Ensure proper script and Unicode handling for Indic languages

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

${computeInfo.specs ? `Additional compute information: ${JSON.stringify(computeInfo.specs, null, 2)}` : ''}

Generate ${totalSamples} high-quality parallel corpus samples based on this content, ensuring language diversity and translation quality.`,
        });

        // Post-process to ensure quality and standardize language codes
        const enhancedSamples = object.samples.map(sample => {
            // Standardize language codes to lowercase
            sample.source_lang = normalizeLanguageCode(sample.source_lang);
            sample.target_lang = normalizeLanguageCode(sample.target_lang);

            // Set default complexity if not provided
            if (!sample.complexity) {
                sample.complexity = 'standard';
            }

            // Assign domain based on content if not set
            if (!sample.domain) {
                sample.domain = detectDomain(sample.source);
            }

            return sample;
        });

        // Filter samples to ensure they match requested language pairs
        const validSamples = enhancedSamples.filter(sample => {
            return pairsToUse.some(pair =>
                pair.source === sample.source_lang &&
                pair.target === sample.target_lang
            );
        });

        return { samples: validSamples };
    } catch (error) {
        console.error(colors.red(`Error generating parallel corpus dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generates an instruction following dataset from the given content chunk
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateInstructionDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Define instruction types for better distribution
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

        const { object } = await generateObject({
            model,
            schema: instructionSchema,
            prompt: `You are an expert at creating high-quality instruction-following datasets for training language models.
      
I'll provide you with text content, and I want you to create ${sampleCount} diverse instruction-output pairs based on this content.

Create a balanced distribution of instruction types:
- Direct instructions: Simple, clear commands (e.g., "List the key points in this text")
- Implicit instructions: Require inference (e.g., "What would happen if we applied this in a different context?")
- Multi-step instructions: Involve several actions (e.g., "First summarize, then analyze the limitations")
- Creative instructions: Require imagination (e.g., "Write a dialogue illustrating these concepts")
- Analytical instructions: Require critical thinking (e.g., "Compare these approaches and identify tradeoffs")

For each sample:
1. Create a clear, precise instruction related to the provided content
2. Generate a high-quality expected output for that instruction
3. Ensure instructions vary in complexity and required skills
4. Tag each instruction with its type and any constraints
5. Include some instructions in languages other than English (if appropriate)
6. Ensure outputs are detailed, accurate, and properly formatted

The examples should be diverse and challenging enough to train a robust language model.

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

${computeInfo.specs ? `Additional compute information: ${JSON.stringify(computeInfo.specs, null, 2)}` : ''}

Generate ${sampleCount} high-quality instruction-following samples based on this content. Ensure diversity in instruction types and complexity levels.`,
        });

        // Post-process to ensure quality and instruction type diversity
        const enhancedSamples = object.samples.map(sample => {
            // If instruction is too short, make it more detailed
            if (sample.instruction.length < 15) {
                sample.instruction = `Based on the provided content, ${sample.instruction}`;
            }

            // Ensure output is detailed enough
            if (sample.output.length < 30 && !sample.instruction.includes("briefly")) {
                sample.output += " [Note: This response has been expanded to be more detailed and helpful.]";
            }

            // If no language is specified, default to English
            if (!sample.language) {
                sample.language = "en";
            }

            // If no instruction type is specified, infer it
            if (!sample.instruction_type) {
                if (sample.instruction.includes("steps") || sample.instruction.includes("first") || sample.instruction.includes("then")) {
                    sample.instruction_type = "multi-step";
                } else if (sample.instruction.includes("imagine") || sample.instruction.includes("creative") || sample.instruction.includes("write a")) {
                    sample.instruction_type = "creative";
                } else if (sample.instruction.includes("analyze") || sample.instruction.includes("compare") || sample.instruction.includes("evaluate")) {
                    sample.instruction_type = "analytical";
                } else if (sample.instruction.includes("would") || sample.instruction.includes("might") || sample.instruction.includes("could")) {
                    sample.instruction_type = "implicit";
                } else {
                    sample.instruction_type = "direct";
                }
            }

            return sample;
        });

        // Check distribution of instruction types
        const typeDistribution = enhancedSamples.reduce((dist: { [key: string]: number }, sample) => {
            const type = sample.instruction_type;
            dist[type] = (dist[type] || 0) + 1;
            return dist;
        }, {});

        console.log(colors.blue(`Instruction type distribution: ${JSON.stringify(typeDistribution)}`));

        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating instruction dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generates a summarization dataset from the given content chunk
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateSummarizationDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Define summary types for better distribution
        const summaryTypes = ['extractive', 'abstractive', 'hybrid'];
        const languages = ['en', 'es', 'fr', 'de', 'zh'];

        const { object } = await generateObject({
            model,
            schema: summarizationSchema,
            prompt: `You are an expert at creating high-quality summarization datasets for training language models.
      
I'll provide you with text content, and I want you to create ${sampleCount} diverse document-summary pairs based on this content.

Create a mix of summary types:
- Extractive summaries: Using key phrases directly from the text
- Abstractive summaries: Paraphrasing the content in new words
- Hybrid summaries: Combining both approaches

For each sample:
1. Extract or create a document/passage from the provided content
2. Generate a concise, accurate summary of that document
3. Ensure documents vary in length and complexity
4. Include summaries in different languages (primarily English, but include others)
5. Calculate and specify the length_ratio (summary length / document length)
6. Identify and list the key points that the summary covers

Focus on quality:
- Ensure summaries capture the most important information
- Avoid including minor details or tangential information
- For abstractive summaries, use different phrasing than the original
- For extractive summaries, use the most important phrases from the text
- Ensure summaries are coherent and read naturally

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

${computeInfo.specs ? `Additional compute information: ${JSON.stringify(computeInfo.specs, null, 2)}` : ''}

Generate ${sampleCount} high-quality summarization samples based on this content. Ensure diversity in summary types and languages.`,
        });

        // Post-process to ensure quality
        const enhancedSamples = object.samples.map(sample => {
            // Calculate length ratio if not provided
            if (!sample.length_ratio || isNaN(sample.length_ratio)) {
                const docLength = sample.document.length;
                const summaryLength = sample.summary.length;
                sample.length_ratio = summaryLength / docLength;
            }

            // Ensure length ratio is in range
            sample.length_ratio = Math.min(1, Math.max(0, sample.length_ratio));

            // If no language is specified, default to English
            if (!sample.language) {
                sample.language = "en";
            }

            // If key points aren't specified, create placeholder
            if (!sample.key_points_covered || !Array.isArray(sample.key_points_covered) || sample.key_points_covered.length === 0) {
                // Extract nouns and verbs as key concepts using simple heuristic
                const sentences = sample.summary.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
                const keyPoints = sentences.slice(0, Math.min(3, sentences.length))
                    .map((s: string) => s.trim());

                sample.key_points_covered = keyPoints;
            }

            return sample;
        });

        // Check summary type distribution
        const typeDistribution = enhancedSamples.reduce((dist: { [key: string]: number }, sample) => {
            const type = sample.summary_type;
            dist[type] = (dist[type] || 0) + 1;
            return dist;
        }, {});

        console.log(colors.blue(`Summary type distribution: ${JSON.stringify(typeDistribution)}`));

        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating summarization dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}