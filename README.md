# TuneForge

TuneForge is a powerful dataset generation tool for training and fine-tuning Large Language Models (LLMs). It converts text content into structured training datasets with various formats optimized for different fine-tuning approaches.

## Features

- **Multiple Dataset Types**: Generate diverse dataset types from a single source content
- **Format Variety**: Support for legacy, standard, modern, and Indian language-specific dataset formats
- **Customizable Output**: Control sample counts, concurrency, and output formats
- **Hugging Face Integration**: Direct upload to Hugging Face Hub datasets
- **Cross-language Support**: Generate multilingual and translation datasets
- **TRL Compatibility**: Transform data into formats compatible with popular Transformer Reinforcement Learning libraries
- **Token Analysis**: Analyze token usage in generated datasets to optimize training costs

## Installation

```bash
# Clone the repository
git clone https://github.com/SukrutAI/TuneForge.git
cd TuneForge

# Install dependencies with Bun
bun install
```

## Quick Start

```bash
# Generate a basic dataset with default settings
bun run index.ts --input ./data/example.pdf --output ./output

# Generate multiple dataset types
bun run index.ts --input ./data --output ./output --type qa rp instruction
```

## Dataset Types

TuneForge supports multiple dataset types grouped into categories:

### Legacy Formats
- `qa`: Question-answer pairs with varying difficulty levels
- `rp`: Role-playing scenarios with system instructions and example conversations
- `classifier`: Text classification samples with categories and explanations
- `multilingual`: Text content in multiple languages
- `parallel`: Parallel text in source and target languages
- `instruction`: Instruction following samples
- `summarization`: Document summarization pairs

### Standard Formats
- `parallel_corpora`: Standardized parallel translation corpora
- `monolingual_text`: Monolingual texts with cultural and origin metadata
- `instruction_tuning`: Standardized instruction-input-output triplets
- `benchmark_evaluation`: Evaluation benchmark datasets
- `domain_specific`: Domain-specialized content
- `web_crawled`: Web-crawled content with metadata

### Modern Formats
- `alpaca_instruct`: Alpaca-style instruction-input-output triplets
- `sharegpt_conversations`: Conversational turns in ShareGPT format
- `raw_corpus`: Raw text for continued pre-training

### Indic Formats (Indian Languages)
- `indic_summarization`: Article-summary pairs in Indian languages
- `indic_translation`: English to Indian language translation pairs
- `indic_qa`: Question answering in Indian languages
- `indic_crosslingual_qa`: Cross-lingual QA with English context and questions in Indian languages

## Command Line Options

### Main Dataset Generator

```
Options:
  -V, --version               output the version number
  -i, --input <path>          Input file or directory path (default: "./data")
  -o, --output <path>         Output directory for generated datasets (default: "./output")
  -m, --model <name>          AI model to use for generation (default: "gemini-2.0-flash-lite-preview-02-05")
  -c, --concurrency <number>  Number of chunks to process concurrently (default: "3")
  -t, --type <types...>       Types of datasets to generate (default: ["qa", "rp", "classifier"])
  -s, --samples <number>      Number of samples to generate per chunk (default: "3")
  -f, --format <format>       Output format (json, jsonl, csv, parquet, arrow) (default: "jsonl")
  --trl-format <format>       TRL format (standard, conversational) (default: "standard")
  --trl-type <type>           TRL type (language_modeling, prompt_only, prompt_completion, preference, unpaired_preference, stepwise_supervision) (default: "prompt_completion")
  --dataset-format <format>   Dataset format to use (legacy, standard, modern, indic) (default: "legacy")
  --upload                    Upload datasets to Hugging Face (default: false)
  --repo-id <id>              Hugging Face repository ID for upload
  --private                   Make Hugging Face repository private (default: false)
  --hf-token <token>          Hugging Face token for upload
  --description <text>        Description for Hugging Face dataset
  --include-indic             Include Indian Indic languages in multilingual datasets (default: false)
  --languages <codes>         Comma-separated list of language ISO codes to include (e.g., en,hi,ta,bn)
  -h, --help                  display help for command
```

### Token Analyzer CLI

The Token Analyzer tool helps you analyze the token usage in your generated datasets to optimize training costs and validate dataset quality.

```
Usage: token-analyze [options] <path>

Options:
  -V, --version        output the version number
  -r, --recursive      Recursively analyze subdirectories (default: false)
  -o, --output <file>  Save analysis results to a JSON file
  -v, --verbose        Show detailed analysis for each field (default: false)
  -s, --summary-only   Show only the summary, not per-file details (default: false)
  -h, --help           display help for command
```

## Usage Examples

### Basic Usage

```bash
# Generate QA pairs from a PDF file
bun run index.ts --input ./data/document.pdf --output ./output --type qa

# Generate multiple dataset types
bun run index.ts --input ./data --output ./output --type qa rp instruction
```

### Advanced Usage

```bash
# Generate 10 samples of Alpaca format with conversational TRL format
bun run index.ts --input ./data --output ./output --type alpaca_instruct --samples 10 --trl-format conversational

# Process a directory with 5 concurrent chunks and multiple dataset types
bun run index.ts --input ./data --output ./output --concurrency 5 --type qa rp instruction --samples 8

# Generate datasets in Indian languages
bun run index.ts --input ./data --output ./output --type indic_translation indic_summarization --include-indic

# Generate specific language pairs
bun run index.ts --input ./data --output ./output --type parallel --languages en,hi,bn,ta
```

### Hugging Face Upload

```bash
# Generate and upload datasets to Hugging Face
bun run index.ts --input ./data --output ./output --type instruction --upload --repo-id yourusername/dataset-name --hf-token YOUR_HF_TOKEN
```

### Token Analysis

```bash
# Analyze token usage in a specific dataset file
bun run src/cli/tokenAnalysis.ts ./output/document_qa.jsonl

# Analyze all datasets in a directory recursively and export results to JSON
bun run src/cli/tokenAnalysis.ts ./output -r -o token-analysis.json

# Get a summary of token usage across all datasets
bun run src/cli/tokenAnalysis.ts ./output -r -s
```

## Output Formats

TuneForge supports several output formats:

- `json`: JSON files with one array containing all records
- `jsonl`: JSON Lines with one record per line (default, most compatible)
- `csv`: Comma Separated Values
- `parquet`: Apache Parquet columnar storage
- `arrow`: Apache Arrow columnar format

## Working with Generated Datasets

### Loading with Hugging Face Datasets

```python
from datasets import load_dataset

# Load JSONL format
dataset = load_dataset("json", data_files="./output/document_qa.jsonl")

# Load CSV format
dataset = load_dataset("csv", data_files="./output/document_instruction.csv")
```

### Fine-tuning Example

```python
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
```

## Dataset Format Selection

Use the `--dataset-format` option to select the category of dataset formats:

- `legacy`: Original formats like QA pairs, role-playing scenarios
- `standard`: Standardized formats optimized for modern LLM fine-tuning
- `modern`: Popular formats like Alpaca, ShareGPT (best for instruction tuning)
- `indic`: Specialized formats for Indian languages based on IndicGenBench

## TRL Format Options

For Transformer Reinforcement Learning compatibility, configure:

- **TRL Format** (`--trl-format`): 
  - `standard`: Traditional supervised fine-tuning format
  - `conversational`: Turn-based conversation format

- **TRL Type** (`--trl-type`):
  - `language_modeling`: Basic language modeling
  - `prompt_only`: Only instruction/prompt text
  - `prompt_completion`: Instruction with completion pairs
  - `preference`: Preference-based learning pairs
  - `unpaired_preference`: Unpaired preference data
  - `stepwise_supervision`: Step-by-step supervision

## Language Configuration

Control language output with:

- `--include-indic`: Include Indian languages like Hindi, Bengali, Tamil, etc.
- `--languages`: Specify exact ISO codes (e.g., en,hi,ta,bn,te,kn,ml,mr,pa,gu,ur)

## Project Structure

```
TuneForge/
├── src/
│   ├── cli/           # CLI and processing modules
│   │   ├── index.ts   # Main CLI entry point
│   │   ├── processingEngine.ts # Core processing logic
│   │   └── tokenAnalysis.ts # Token analysis tool
│   ├── config/        # Configuration settings
│   ├── formatters/    # Format conversion utilities
│   ├── generators/    # Dataset generation modules
│   ├── parsers/       # Content parsing utilities
│   ├── services/      # External service integrations
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Helper utilities
├── data/              # Input data directory
└── output/            # Generated dataset output
```

## Requirements

- [Bun](https://bun.sh) runtime v1.0.0+
- Access to an AI model API (e.g., Google's Gemini)
- Optional: Hugging Face account and API token for uploads

## License

This project is provided under the MIT License.

This project was created using `bun init` in bun v1.2.5+. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
