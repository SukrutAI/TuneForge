/**
 * Type definitions for TuneForge
 */

// Compute information types
export interface ComputeSpecs {
    cpu?: string;
    gpu?: string;
    ram?: string;
    storage?: string;
    [key: string]: any;
}

export interface ComputeInfo {
    specs?: ComputeSpecs;
    // Language configuration options
    languages?: string[];  // User-selected languages (ISO codes)
    includeIndic?: boolean; // Flag to include Indian languages
    languagePairs?: Array<{source: string, target: string}>; // User-selected language pairs for translation
    [key: string]: any;
}

// Standard multilingual dataset types based on industry examples
export interface ParallelCorpusEntry {
    [language: string]: string; // Dynamic language keys (e.g., "english", "french", etc.)
}

export interface MonolingualTextEntry {
    language: string;
    text: string;
    original_text?: string;
    original_language?: string;
    cultural_notes?: string;
}

export interface InstructionTuningEntry {
    instruction: string;
    input: string;
    output: string;
    language: string;
    instruction_type?: 'direct' | 'implicit' | 'multi-step' | 'creative' | 'analytical';
    constraints?: string[];
}

export interface BenchmarkEvaluationEntry {
    task: string;
    language: string;
    text: string;
    label?: string;
    entities?: Array<{
        entity: string;
        value?: string;
        label: string;
    }>;
}

export interface DomainSpecificEntry {
    domain: string;
    language: string;
    text: string;
    translation?: string;
}

export interface WebCrawledEntry {
    url: string;
    language: string;
    title: string;
    content: string;
}

// Special Indian languages dataset formats (IndicGenBench style)
export interface IndicSummarizationEntry {
    article: string;
    summary: string;
    language: string;
    domain?: string;
    title?: string;
}

export interface IndicTranslationEntry {
    en: string;
    translation: string;
    target_lang: string;
    domain?: string;
    complexity?: 'simple' | 'moderate' | 'complex';
}

export interface IndicQAEntry {
    question: string;
    context: string;
    answer: string;
    language: string;
    answer_start?: number;
    is_impossible?: boolean;
}

export interface IndicCrossLingualQAEntry {
    question: string;
    context_en: string;
    answer: string;
    language: string;
    english_question?: string;
    english_answer?: string;
}

// Legacy dataset sample types - keeping for backwards compatibility
export interface QASample {
    question: string;
    answer: string;
    difficulty: 'basic' | 'intermediate' | 'advanced';
    context: string;
    question_type?: 'factual' | 'conceptual' | 'analytical' | 'application' | 'synthesis';
    metadata?: {
        requires_external_knowledge?: boolean;
        topic_area?: string;
    };
}

export interface RPSample {
    scenario: string;
    system_instruction: string;
    example_conversation: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    complexity_level?: 'beginner' | 'intermediate' | 'complex';
    skills_demonstrated?: string[];
}

export interface ClassifierSample {
    text: string;
    categories: string[];
    explanation: string;
    confidence?: number;
    alternative_categories?: Array<{
        category: string;
        reason_rejected: string;
    }>;
}

export interface MultilingualCorpusSample {
    text: string;
    language: string;
    original_text?: string;
    original_language?: string;
    cultural_notes?: string;
}

export interface ParallelCorpusSample {
    source: string;
    target: string;
    source_lang: string;
    target_lang: string;
    domain?: string;
    complexity?: 'simple' | 'standard' | 'complex';
}

export interface InstructionFollowingSample {
    instruction: string;
    output: string;
    language?: string;
    instruction_type?: 'direct' | 'implicit' | 'multi-step' | 'creative' | 'analytical';
    constraints?: string[];
}

export interface SummarizationSample {
    text: string;
    summary: string;
    language?: string;
    summary_type?: 'extractive' | 'abstractive' | 'hybrid';
    length_ratio?: number;
    key_points_covered?: string[];
}

// New interfaces for modern training formats
export interface AlpacaSample {
    instruction: string;
    input: string;
    output: string;
}

export interface ShareGPTSample {
    conversations: Array<{
        from: 'human' | 'assistant';
        value: string;
    }>;
}

export interface RawCorpusSample {
    text: string;
}

// Dataset results container - updated with standardized formats
export interface DatasetResults {
    // Legacy formats
    qa: { examples: QASample[] };
    rp: { examples: RPSample[] };
    classifier: { examples: ClassifierSample[] };
    multilingual: { examples: MultilingualCorpusSample[] };
    parallel: { examples: ParallelCorpusSample[] };
    instruction: { examples: InstructionFollowingSample[] };
    summarization: { examples: SummarizationSample[] };
    
    // Standardized multilingual formats
    parallel_corpora: { examples: ParallelCorpusEntry[] };
    monolingual_text: { examples: MonolingualTextEntry[] };
    instruction_tuning: { examples: InstructionTuningEntry[] };
    benchmark_evaluation: { examples: BenchmarkEvaluationEntry[] };
    domain_specific: { examples: DomainSpecificEntry[] };
    web_crawled: { examples: WebCrawledEntry[] };
    
    // Modern LLM training formats
    alpaca_instruct: { examples: AlpacaSample[] };
    sharegpt_conversations: { examples: ShareGPTSample[] };
    raw_corpus: { examples: RawCorpusSample[] };

    // Indian languages formats (IndicGenBench style)
    indic_summarization: { examples: IndicSummarizationEntry[] };
    indic_translation: { examples: IndicTranslationEntry[] };
    indic_qa: { examples: IndicQAEntry[] };
    indic_crosslingual_qa: { examples: IndicCrossLingualQAEntry[] };
}

// TRL dataset format types
export interface TRLDatasetFormats {
    format: 'standard' | 'conversational';
    type: 'language_modeling' | 'prompt_only' | 'prompt_completion' | 'preference' | 'unpaired_preference' | 'stepwise_supervision';
}

// Hugging Face dataset configuration
export interface HFDatasetConfig {
    format: 'json' | 'jsonl' | 'csv' | 'parquet' | 'arrow';
    trlFormat?: TRLDatasetFormats;
    upload: boolean;
    repoId?: string;
    private?: boolean;
    token?: string;
    description?: string;
    convertFunctions: {
        // Legacy converters
        qa?: (sample: QASample) => any;
        rp?: (sample: RPSample) => any;
        classifier?: (sample: ClassifierSample) => any;
        multilingual?: (sample: MultilingualCorpusSample) => any;
        parallel?: (sample: ParallelCorpusSample) => any;
        instruction?: (sample: InstructionFollowingSample) => any;
        summarization?: (sample: SummarizationSample) => any;
        
        // Standard multilingual converters
        parallel_corpora?: (sample: ParallelCorpusEntry) => any;
        monolingual_text?: (sample: MonolingualTextEntry) => any;
        instruction_tuning?: (sample: InstructionTuningEntry) => any;
        benchmark_evaluation?: (sample: BenchmarkEvaluationEntry) => any;
        domain_specific?: (sample: DomainSpecificEntry) => any;
        web_crawled?: (sample: WebCrawledEntry) => any;
        
        // Modern LLM training format converters
        alpaca_instruct?: (sample: AlpacaSample) => any;
        sharegpt_conversations?: (sample: ShareGPTSample) => any;
        raw_corpus?: (sample: RawCorpusSample) => any;

        // Indian languages format converters
        indic_summarization?: (sample: IndicSummarizationEntry) => any;
        indic_translation?: (sample: IndicTranslationEntry) => any;
        indic_qa?: (sample: IndicQAEntry) => any;
        indic_crosslingual_qa?: (sample: IndicCrossLingualQAEntry) => any;
    };
}

// CLI options
export interface CLIOptions {
    input: string;
    output: string;
    model: string;
    concurrency: string;
    type: string[];
    samples: string;
    format: string;
    trlFormat: string;
    trlType: string;
    datasetFormat: string;
    upload: boolean;
    repoId?: string;
    private: boolean;
    hfToken?: string;
    description?: string;
    includeIndic: boolean;
    languages: string;
}