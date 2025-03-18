/**
 * Modern Dataset Generator Module
 * 
 * Contains generators for modern LLM training formats like Alpaca and ShareGPT
 */
import { generateObject } from 'ai';
import colors from '../utils/colors';
import { z } from 'zod';
import type { ComputeInfo, AlpacaSample, ShareGPTSample, RawCorpusSample } from '../types/index';

// Zod schema for Alpaca format (instruction-based dataset)
const alpacaSchema = z.object({
    samples: z.array(z.object({
        instruction: z.string().describe('A clear instruction for the model to perform'),
        input: z.string().describe('Optional input context or query for the instruction'),
        output: z.string().describe('The expected output for the instruction and input')
    }))
});

// Zod schema for ShareGPT format (conversation-based dataset)
const sharegptSchema = z.object({
    samples: z.array(z.object({
        conversations: z.array(z.object({
            from: z.enum(['human', 'assistant']).describe('Who is speaking: human or assistant'),
            value: z.string().describe('The content of the message')
        })).min(2).describe('A conversation between a human and an AI assistant')
    }))
});

// Zod schema for raw corpus format (continued pretraining)
const rawCorpusSchema = z.object({
    samples: z.array(z.object({
        text: z.string().describe('Long-form text for continued pretraining')
    }))
});

/**
 * Generate a dataset in Alpaca instruction format for supervised fine-tuning
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information 
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateAlpacaDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Define task types to ensure diversity
        const taskTypes = [
            'summarization',
            'extraction',
            'classification',
            'question-answering',
            'transformation',
            'comparison',
            'explanation',
            'creative'
        ];
        
        // Calculate balanced distribution across task types
        const tasksPerType = Math.ceil(sampleCount / taskTypes.length);
        
        const { object } = await generateObject({
            model,
            schema: alpacaSchema,
            prompt: `You are an expert at creating high-quality instruction datasets for fine-tuning large language models.
            
I'll provide you with text content, and I want you to create ${sampleCount} instruction-input-output examples in Alpaca format.

Examples should follow this structure:
- Instruction: A clear directive for what the model should do
- Input: (Optional) The context or specific text to operate on
- Output: The expected result from following the instruction

Create a diverse set of tasks including:
- Summarization tasks: "Summarize this text about X"
- Information extraction: "Extract the key entities from this text"
- Classification: "Classify this content by topic/sentiment/etc."
- Question answering: "Answer this question based on the text"
- Text transformation: "Convert this text to a different format"
- Comparative analysis: "Compare and contrast these concepts"
- Explanation tasks: "Explain the following concept in simple terms"
- Creative tasks: "Write a story/poem/dialogue about X"

IMPORTANT GUIDELINES:
1. Instructions must be clear, precise, and actionable
2. Inputs should provide necessary context (can be empty for general instructions)
3. Outputs should be comprehensive, accurate, and demonstrate high quality
4. Include a mix of short and long form outputs
5. Ensure examples cover diverse topics from the source material
6. Make tasks challenging enough to be useful for training

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

Generate ${sampleCount} high-quality instruction-input-output examples that would be effective for fine-tuning language models.`,
        });

        // Post-process to ensure quality
        const enhancedSamples = object.samples.map((sample: AlpacaSample) => {
            // Ensure instruction is clear and ends with proper punctuation
            if (!sample.instruction.endsWith('.') && 
                !sample.instruction.endsWith('?') && 
                !sample.instruction.endsWith('!')) {
                sample.instruction += '.';
            }
            
            // Handle empty inputs
            if (!sample.input) {
                sample.input = "";
            }
            
            return sample;
        });
        
        console.log(colors.green(`Generated ${enhancedSamples.length} Alpaca-style instruction examples`));
        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating Alpaca dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generate a dataset in ShareGPT conversation format for supervised fine-tuning
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information 
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateShareGPTDataset(
    chunk: string,
    computeInfo: ComputeInfo,
    fileName: string,
    chunkIndex: number,
    model: any,
    sampleCount: number
) {
    try {
        // Define conversation types to ensure diversity
        const conversationTypes = [
            'question-answer',
            'information-seeking',
            'problem-solving',
            'explanation',
            'creative',
            'instruction-following'
        ];
        
        const { object } = await generateObject({
            model,
            schema: sharegptSchema,
            prompt: `You are an expert at creating high-quality conversation datasets for training assistant AI models.
            
I'll provide you with text content, and I want you to create ${sampleCount} realistic conversations in ShareGPT format.

Each conversation should:
- Start with a human message and alternate between human and assistant
- Contain at least 2-4 turns per speaker (4-8 messages total)
- Be coherent, natural, and representative of how humans and assistants interact
- Cover topics derived from the provided content
- Include a mix of question types and conversation flows

Include these conversation patterns:
- Questions and detailed answers
- Follow-up questions that probe deeper
- Clarification requests and corresponding explanations
- Some messages with multiple questions/parts
- Both short and detailed responses where appropriate

IMPORTANT GUIDELINES:
1. Human messages should be natural, informal, and sometimes imperfect
2. Assistant responses must be helpful, accurate, and professional
3. Ensure conversations build on previous context
4. Include diverse conversation types (informational, problem-solving, etc.)
5. Make conversations interesting enough to be useful for training

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

Generate ${sampleCount} high-quality ShareGPT conversations that would be effective for fine-tuning assistant models.`,
        });

        // Post-process to ensure quality
        const enhancedSamples = object.samples.map((sample: ShareGPTSample) => {
            // Ensure conversations start with human
            if (sample.conversations.length > 0 && sample.conversations[0].from !== 'human') {
                sample.conversations.unshift({
                    from: 'human',
                    value: "Hello, I'd like to discuss something with you."
                });
            }
            
            // Ensure conversations have at least 4 turns
            if (sample.conversations.length < 4) {
                // Add generic turns to reach minimum length
                while (sample.conversations.length < 4) {
                    const isHuman = sample.conversations.length % 2 === 0;
                    if (isHuman) {
                        sample.conversations.push({
                            from: 'human',
                            value: "Can you tell me more about that?"
                        });
                    } else {
                        sample.conversations.push({
                            from: 'assistant',
                            value: "I'd be happy to elaborate. Based on the information we've discussed..."
                        });
                    }
                }
            }
            
            return sample;
        });
        
        console.log(colors.green(`Generated ${enhancedSamples.length} ShareGPT conversation examples`));
        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating ShareGPT dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}

/**
 * Generate a raw corpus dataset for continued pretraining
 * @param chunk Content chunk to generate from
 * @param computeInfo Additional compute information 
 * @param fileName Name of the original file
 * @param chunkIndex Index of the chunk
 * @param model AI model to use for generation
 * @param sampleCount Number of samples to generate
 */
export async function generateRawCorpusDataset(
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
            schema: rawCorpusSchema,
            prompt: `You are an expert at creating high-quality text corpus for pretraining language models.
            
I'll provide you with text content, and I want you to create ${sampleCount} long-form text passages for continued pretraining.

Each passage should:
- Be cohesive, fluent, and well-structured
- Contain 300-1000 words of high-quality content
- Cover topics related to or expanded from the source content
- Be informative and educational in nature
- Include varied writing styles (explanatory, descriptive, narrative)

IMPORTANT GUIDELINES:
1. Text should be neutral, factual, and free of personal opinions
2. Include domain-specific terminology where appropriate
3. Organize content with logical paragraph breaks
4. Ensure high linguistic diversity and vocabulary richness
5. Create self-contained passages that don't require external context

Here's the content (file: ${fileName}, chunk: ${chunkIndex + 1}):

${chunk}

Generate ${sampleCount} high-quality text passages suitable for continued pretraining of language models.`,
        });

        // Post-process to ensure quality
        const enhancedSamples = object.samples.map((sample: RawCorpusSample) => {
            // Trim any leading/trailing whitespace
            sample.text = sample.text.trim();
            
            // Ensure text ends with proper punctuation
            if (!sample.text.endsWith('.') && 
                !sample.text.endsWith('?') && 
                !sample.text.endsWith('!')) {
                sample.text += '.';
            }
            
            return sample;
        });
        
        console.log(colors.green(`Generated ${enhancedSamples.length} raw corpus text passages`));
        return { samples: enhancedSamples };
    } catch (error) {
        console.error(colors.red(`Error generating raw corpus dataset: ${(error as Error).message}`));
        return { samples: [] };
    }
}
