#!/usr/bin/env bun
/**
 * TuneForge - Hugging Face Dataset Generator for AI Instruction Tuning
 * 
 * Converts content (text, PDFs) into instruction tuning datasets 
 * compatible with Hugging Face, supporting various formats (JSON, JSONL, CSV)
 * with direct upload capability to Hugging Face Hub.
 */

// Import the CLI runner from the refactored structure
import './src/cli/index';