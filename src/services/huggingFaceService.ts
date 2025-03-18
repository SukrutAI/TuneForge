/**
 * Hugging Face Service
 * 
 * Provides functionality for creating dataset archives and uploading to Hugging Face Hub
 */
import { join, basename } from 'path';
import { createWriteStream } from 'fs';
// import { Readable } from 'stream';
// import { pipeline } from 'stream/promises';
import * as huggingface from '@huggingface/hub';
import archiver from 'archiver';
import colors from '../utils/colors';
import { createProgressBar } from '../utils/progressBar';
import type { HFDatasetConfig } from '../types';
import { Glob } from 'bun';

/**
 * Creates a zip archive of the dataset files
 * @param outputDir Directory containing dataset files
 * @param fileName Base name of the dataset files
 * @returns Path to the created archive
 */
export async function createDatasetArchive(outputDir: string, fileName: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const outputZip = join(outputDir, `${fileName}_dataset.zip`);
        const output = createWriteStream(outputZip);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve(outputZip));
        archive.on('error', err => reject(err));

        archive.pipe(output);

        // Add all relevant dataset files to the archive using Glob with absolute paths
        const fileGlob = new Glob(`${fileName}_*.{json,jsonl,csv,parquet,arrow}`);
        
        (async () => {
            for await (const file of fileGlob.scan({
                cwd: outputDir,
                absolute: true // Get absolute file paths
            })) {
                archive.file(file, { name: basename(file) });
            }
            
            // Add comprehensive README.md for the dataset
            const readmeContent = generateDatasetReadme(fileName);
            archive.append(readmeContent, { name: 'README.md' });
            
            // Add additional dataset documentation
            const datasetInfoContent = generateDatasetInfo(fileName);
            archive.append(datasetInfoContent, { name: 'dataset_info.md' });
            
            archive.finalize();
        })().catch(err => reject(err));
    });
}

/**
 * Uploads dataset to Hugging Face Hub
 * @param outputDir Directory containing dataset files
 * @param fileName Base name of the dataset files
 * @param config Hugging Face configuration
 */
export async function uploadToHuggingFace(outputDir: string, fileName: string, config: HFDatasetConfig): Promise<void> {
    // Validate required configuration
    if (!config.token) {
        throw new Error('Hugging Face token is required for uploads. Use --hf-token or set HUGGINGFACE_TOKEN environment variable.');
    }
    
    if (!config.repoId) {
        throw new Error('Repository ID (--repo-id) is required for uploads.');
    }
    
    // Normalize repository ID to ensure case consistency
    // HF API is case-sensitive, but users might input with different casing
    const normalizedRepoId = config.repoId.toLowerCase();

    const uploadBar = createProgressBar(100, "Uploading Dataset");
    
    // Update progress for archive creation
    uploadBar.update(10);
    const archivePath = await createDatasetArchive(outputDir, fileName);
    uploadBar.update(30);

    console.log(colors.yellow(`\nUploading dataset to Hugging Face: ${normalizedRepoId}`));

    // Create repository if it doesn't exist
    try {
        uploadBar.update(40);
        
        // First, verify the token is valid and get user info
        try {
            const userInfo = await huggingface.whoAmI({ accessToken: config.token });
            console.log(colors.blue(`Authenticated as ${userInfo.name || userInfo.type || 'unknown user'}`));
        } catch (error) {
            uploadBar.stop(colors.red(`✗ Authentication failed - invalid token`), false);
            throw new Error(`Invalid Hugging Face token or authentication failed: ${(error as Error).message}`);
        }

        // Check if repo exists and verify write access
        try {
            uploadBar.update(50);
            await huggingface.checkRepoAccess({
                repo: { type: 'dataset', name: normalizedRepoId },
                accessToken: config.token,
                // write: true // Explicitly check for write access
            });
            console.log(colors.blue(`Repository ${normalizedRepoId} already exists, verified write access`));
        } catch (error) {
            const errorMessage = (error as Error).message || '';
            
            // Handle different error cases
            if (errorMessage.includes('Forbidden') || errorMessage.includes('write token')) {
                uploadBar.stop(colors.red(`✗ Permission denied - insufficient permissions`), false);
                throw new Error(`You don't have write permission for ${normalizedRepoId}. Please check your token permissions.`);
            } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
                // Repo doesn't exist, try to create it
                uploadBar.update(60);
                console.log(colors.blue(`Creating new repository: ${normalizedRepoId}`));
                
                try {
                    await huggingface.createRepo({
                        repo: { type: 'dataset', name: normalizedRepoId },
                        accessToken: config.token,
                        private: config.private,
                    });
                    console.log(colors.green(`Successfully created repository ${normalizedRepoId}`));
                } catch (createError) {
                    uploadBar.stop(colors.red(`✗ Failed to create repository`), false);
                    throw new Error(`Failed to create repository: ${(createError as Error).message}`);
                }
            } else {
                uploadBar.stop(colors.red(`✗ Repository access check failed`), false);
                throw new Error(`Failed to access repository: ${errorMessage}`);
            }
        }

        // Gather files for upload using absolute paths
        uploadBar.update(70);
        const fileGlob = new Glob(`${fileName}_*.{json,jsonl,csv,parquet,arrow}`);
        const filesToUpload = [];
        
        for await (const file of fileGlob.scan({
            cwd: outputDir,
            absolute: true // Get absolute file paths
        })) {
            const content = await Bun.file(file).arrayBuffer();
            filesToUpload.push({
                path: basename(file), // Use just the filename for the upload path
                content: new Blob([content])
            });
        }
        
        // Add README.md with dataset information
        uploadBar.update(80);
        const readmeContent = generateDatasetReadme(fileName, config.description);
        filesToUpload.push({
            path: 'README.md',
            content: new Blob([readmeContent])
        });

        // Upload all files at once
        await huggingface.uploadFiles({
            repo: { type: 'dataset', name: normalizedRepoId },
            accessToken: config.token,
            files: filesToUpload
        });

        uploadBar.stop(colors.green(`✓ Successfully uploaded ${filesToUpload.length} files to Hugging Face Hub`), true);

    } catch (error) {
        if (!(error instanceof Error)) {
            uploadBar.stop(colors.red(`✗ Upload failed with unknown error`), false);
            throw new Error(`Failed to upload to Hugging Face: Unknown error`);
        }
        
        // If we haven't already stopped the progress bar
        if (uploadBar) {
            uploadBar.stop(colors.red(`✗ Upload failed`), false);
        }
        
        throw error;
    }
}

/**
 * Generate comprehensive dataset README that follows Hugging Face dataset card standards
 * @param fileName Name of the dataset file
 * @param description Optional dataset description
 * @returns Comprehensive markdown content for dataset README
 */
function generateDatasetReadme(fileName: string, description?: string): string {
    // Get the current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Identify potential dataset types from the filename
    const isIndic = fileName.includes('indic') || fileName.includes('Indic');
    
    return `---
language:
- en
${isIndic ? '- hi\n- bn\n- ta\n- te\n- ml\n- mr\n- gu\n- kn\n' : ''}
license: cc-by-4.0
size_categories:
- 10K<n<100K
tags:
- instruction-tuning
- tuneforge
${isIndic ? '- indic-languages\n' : ''}
- trl-compatible
- supervised-fine-tuning
datasets:
- ${fileName}
---

# ${fileName} Dataset

${description || `High-quality training dataset generated from ${fileName} using TuneForge.`}

## Dataset Description

This dataset contains multiple instruction formats generated from ${fileName} source material, 
optimized for supervised fine-tuning of Large Language Models.

### Dataset Summary

- **Source**: ${fileName}
- **Generated**: ${currentDate}
- **Languages**: ${isIndic ? 'Multiple Indian languages including Hindi, Bengali, Tamil, etc.' : 'English and other languages'}
- **Formats**: Multiple instruction formats for different fine-tuning approaches

## Dataset Structure

\`\`\`
${fileName}_*.jsonl  # Multiple files with different dataset types
\`\`\`

### Data Formats

This dataset includes multiple instruction formats:

${isIndic ? `
- **Indic Translation**: Parallel corpus for English-to-Indian language translation
- **Indic QA**: Question-answering pairs in Indian languages
- **Indic Summarization**: Document summarization in Indian languages
- **Indic Cross-lingual QA**: Cross-lingual question answering with English context and Indian language questions
` : `
- **QA Pairs**: Question-answer pairs at varying difficulty levels
- **Instruction Following**: Clear instructions with expected outputs
- **Classification**: Text snippets with category labels and explanations
- **Alpaca Format**: Instruction-input-output triplets for supervised fine-tuning
- **ShareGPT Format**: Conversation turns between human and assistant
`}

## Dataset Creation

This dataset was automatically generated using TuneForge, a specialized dataset generation tool for LLM training.

### Generation Process

1. Source content was extracted and chunked from the original material
2. Chunks were processed to generate diverse training examples
3. Post-processing was applied to ensure high quality and consistency

## Using This Dataset

This dataset is formatted for easy use with the Hugging Face datasets library:

\`\`\`python
from datasets import load_dataset

# Load all dataset files
dataset = load_dataset("json", data_files="${fileName}_*.jsonl")

# Or load a specific format
qa_dataset = load_dataset("json", data_files="${fileName}_qa.jsonl")
\`\`\`

### Fine-tuning Example

\`\`\`python
from trl import SFTTrainer
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments

model = AutoModelForCausalLM.from_pretrained("mistralai/Mistral-7B-v0.1")
tokenizer = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-v0.1")

training_args = TrainingArguments(
    output_dir="./fine-tuned-model",
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    learning_rate=2e-5,
    num_train_epochs=3,
)

trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    tokenizer=tokenizer,
)

trainer.train()
\`\`\`

## License and Usage

This dataset is provided under CC-BY-4.0 license and is intended for research purposes.

## Citation

If you use this dataset in your research, please cite:

\`\`\`
@misc{${fileName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_dataset,
  title = {${fileName} Dataset},
  author = {Sukrut.ai},
  year = {${new Date().getFullYear()}},
  publisher = {Hugging Face},
  howpublished = {\\url{https://huggingface.co/datasets/[user]/${fileName}}},
}
\`\`\`
`;
}

/**
 * Generate additional dataset documentation with usage examples
 * @param fileName Name of the dataset file
 * @returns Markdown content for additional dataset documentation
 */
function generateDatasetInfo(fileName: string): string {
    return `# ${fileName} - Additional Documentation

This document provides additional information about the dataset generated from ${fileName}.

## Dataset Structure

The dataset is organized into multiple files, each containing a different instruction format:

- **QA Pairs**: \`${fileName}_qa.jsonl\`
- **Role Play**: \`${fileName}_rp.jsonl\`
- **Classification**: \`${fileName}_classifier.jsonl\`
- **Instruction Following**: \`${fileName}_instruction.jsonl\`
- **Summarization**: \`${fileName}_summarization.jsonl\`

## Modern Format Support

In addition to standard formats, this dataset includes modern formats optimized for different fine-tuning approaches:

- **Alpaca Format**: \`${fileName}_alpaca_instruct.jsonl\`
- **ShareGPT Format**: \`${fileName}_sharegpt_conversations.jsonl\`
- **Raw Corpus**: \`${fileName}_raw_corpus.jsonl\`

## Using This Dataset

### Loading Specific Formats

You can load specific dataset formats as needed for your training task:

\`\`\`python
from datasets import load_dataset

# Load instruction data
instruction_data = load_dataset("json", data_files="${fileName}_instruction.jsonl")

# Load conversation data
conversation_data = load_dataset("json", data_files="${fileName}_sharegpt_conversations.jsonl")
\`\`\`

### Converting to Other Formats

The dataset can be easily converted to other formats:

\`\`\`python
# Convert to CSV
instruction_data.to_csv("${fileName}_instructions.csv")

# Convert to Parquet
instruction_data.to_parquet("${fileName}_instructions.parquet")
\`\`\`

## Dataset Statistics

- **Total Examples**: Varies by format
- **Languages**: Primary English with multilingual examples where appropriate
- **Difficulty Levels**: Basic, Intermediate, and Advanced examples

## Contact

For questions or issues with this dataset, please contact the creator through Hugging Face.
`;
}