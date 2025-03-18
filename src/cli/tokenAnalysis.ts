#!/usr/bin/env bun
/**
 * Token Analysis CLI
 * 
 * Command-line tool for analyzing token usage in generated datasets
 */
import { Command } from 'commander';
import colors from '../utils/colors';
import { analyzeDirectory, analyzeFile, printTokenAnalysis } from '../utils/tokenAnalyzer';
import path from 'node:path';
import fs from 'node:fs';

// Read version from package.json directly for TypeScript compatibility
const version = "1.0.0";

// Main program configuration
const program = new Command()
  .name('token-analyze')
  .description(colors.bold('TuneForge Token Analyzer: Analyze token usage in generated datasets'))
  .version(version);

// Add command-line options
program
  .argument('<path>', 'Path to a file or directory to analyze')
  .option('-r, --recursive', 'Recursively analyze subdirectories', false)
  .option('-o, --output <file>', 'Save analysis results to a JSON file')
  .option('-v, --verbose', 'Show detailed analysis for each field', false)
  .option('-s, --summary-only', 'Show only the summary, not per-file details', false)
  .parse(process.argv);

// Main function to run the analysis
async function main() {
  const options = program.opts();
  const targetPath = program.args[0];

  if (!targetPath) {
    console.error(colors.red('Error: Path to analyze is required'));
    process.exit(1);
  }

  try {
    // Resolve the path
    const resolvedPath = path.resolve(targetPath);

    console.log(colors.cyan(`TuneForge Token Analyzer`));
    console.log(colors.cyan(`Version: ${version}\n`));

    // Check if the path exists
    if (!fs.existsSync(resolvedPath)) {
      console.error(colors.red(`Error: Path does not exist: ${resolvedPath}`));
      process.exit(1);
    }

    // Get path stats
    const stats = fs.statSync(resolvedPath);

    let results = [];

    if (stats.isFile()) {
      // Analyze a single file
      console.log(colors.yellow(`Analyzing file: ${path.basename(resolvedPath)}`));
      const analysis = await analyzeFile(resolvedPath);
      
      // Print the analysis
      console.log(colors.cyan('===== Token Usage Analysis ====='));
      console.log(colors.cyan(`File: ${analysis.fileName}`));
      console.log(colors.cyan(`Size: ${analysis.fileSize} bytes`));
      console.log(colors.cyan(`Entries: ${analysis.entryCount}`));
      console.log(colors.cyan(`Total tokens: ${analysis.totalTokens.toLocaleString()}`));
      console.log(colors.cyan(`Avg tokens per entry: ${analysis.avgTokensPerEntry.toFixed(2)}`));
      console.log(colors.cyan(`Max tokens in an entry: ${analysis.maxTokensInEntry}`));
      
      if (!options.summaryOnly) {
        console.log(colors.green('\nField breakdown:'));
        analysis.fields.forEach(field => {
          console.log(colors.green(`  ${field.fieldName}: ${field.tokenCount.toLocaleString()} tokens (${field.tokenRatio.toFixed(3)} tokens/char)`));
        });
      }
      
      results.push({
        type: 'file',
        analysis
      });
    } else if (stats.isDirectory()) {
      // Analyze a directory
      console.log(colors.yellow(`Analyzing directory: ${path.basename(resolvedPath)}`));
      
      if (options.recursive) {
        // Recursive analysis
        const allResults = [];
        
        // Get all directories (including the root)
        const directories = [resolvedPath];
        
        // If recursive, add all subdirectories
        interface DirectoryItem {
          path: string;
          isDirectory: boolean;
        }

        async function addSubdirectories(dir: string): Promise<void> {
          const items: string[] = await fs.promises.readdir(dir);
          for (const item of items) {
            const itemPath: string = path.join(dir, item);
            const itemStats: fs.Stats = await fs.promises.stat(itemPath);
            if (itemStats.isDirectory()) {
              directories.push(itemPath);
              await addSubdirectories(itemPath);
            }
          }
        }
        
        // Add all subdirectories
        await addSubdirectories(resolvedPath);
        
        // Analyze each directory
        console.log(colors.blue(`Found ${directories.length} directories to analyze`));
        
        for (const dir of directories) {
          try {
            const dirName = path.relative(resolvedPath, dir) || path.basename(resolvedPath);
            console.log(colors.blue(`Analyzing directory: ${dirName}`));
            const analysis = await analyzeDirectory(dir);
            
            if (analysis.fileCount > 0) {
              if (!options.summaryOnly) {
                printTokenAnalysis(analysis);
              } else {
                console.log(colors.cyan(`Directory: ${dirName}`));
                console.log(colors.cyan(`  Files: ${analysis.fileCount}`));
                console.log(colors.cyan(`  Entries: ${analysis.totalEntries}`));
                console.log(colors.cyan(`  Total tokens: ${analysis.totalTokens.toLocaleString()}\n`));
              }
              
              allResults.push({
                directoryPath: dir,
                analysis
              });
            }
          } catch (error) {
            console.error(colors.red(`Error analyzing directory ${dir}: ${(error as Error).message}`));
          }
        }
        
        // Calculate grand totals
        const grandTotal = {
          directories: allResults.length,
          files: allResults.reduce((sum, res) => sum + res.analysis.fileCount, 0),
          entries: allResults.reduce((sum, res) => sum + res.analysis.totalEntries, 0),
          tokens: allResults.reduce((sum, res) => sum + res.analysis.totalTokens, 0)
        };
        
        console.log(colors.magenta('\n===== Grand Totals ====='));
        console.log(colors.magenta(`Directories analyzed: ${grandTotal.directories}`));
        console.log(colors.magenta(`Total files: ${grandTotal.files}`));
        console.log(colors.magenta(`Total entries: ${grandTotal.entries}`));
        console.log(colors.magenta(`Total tokens: ${grandTotal.tokens.toLocaleString()}`));
        
        results = allResults;
      } else {
        // Non-recursive analysis (just one directory)
        const analysis = await analyzeDirectory(resolvedPath);
        
        if (!options.summaryOnly) {
          printTokenAnalysis(analysis);
        } else {
          console.log(colors.cyan('===== Token Usage Summary ====='));
          console.log(colors.cyan(`Directory: ${path.basename(resolvedPath)}`));
          console.log(colors.cyan(`Files analyzed: ${analysis.fileCount}`));
          console.log(colors.cyan(`Total entries: ${analysis.totalEntries}`));
          console.log(colors.cyan(`Total tokens: ${analysis.totalTokens.toLocaleString()}`));
        }
        
        results.push({
          type: 'directory',
          analysis
        });
      }
    } else {
      console.error(colors.red(`Error: Path is neither a file nor a directory: ${resolvedPath}`));
      process.exit(1);
    }

    // Save results to file if requested
    if (options.output) {
      const outputPath = path.resolve(options.output);
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(colors.green(`\nAnalysis results saved to ${outputPath}`));
    }

    console.log(colors.green('\nAnalysis complete! ✨'));
  } catch (error) {
    console.error(colors.red(`\nError: ${(error as Error).message}`));
    process.exit(1);
  }
}

// Run the program
main().catch(error => {
  console.error(colors.red(`\nUnexpected error: ${error.message}`));
  process.exit(1);
});