import { Command } from 'commander';
import path from 'path';
import { convertCSSToTokens } from '../core/cssParser.js';

export const command = new Command('parse-css')
  .description('Parse CSS files into design tokens')
  .argument('<input>', 'Input CSS file path')
  .option('-o, --output <path>', 'Output JSON file path', 'tokens.json')
  .option('-v, --verbose', 'Show verbose output')
  .action(async (input, options) => {
    global.verbose = options.verbose;
    
    const inputPath = path.resolve(process.cwd(), input);
    const outputPath = path.resolve(process.cwd(), options.output);
    
    try {
      const success = await convertCSSToTokens(inputPath, outputPath);
      if (success) {
        console.log(`✅ Successfully converted ${input} to ${options.output}`);
        if (global.verbose) {
          console.log(`Full paths:\nInput: ${inputPath}\nOutput: ${outputPath}`);
        }
      } else {
        console.error(`❌ Failed to process ${input}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Error processing ${input}:`, error.message);
      if (global.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  }); 