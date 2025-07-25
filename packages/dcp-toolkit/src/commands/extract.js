import { program } from 'commander';
import path from 'path';
import fs from 'fs/promises';

program
  .option('--storybook-json <path>', 'Path to Storybook JSON output from build --dry-run-json')
  .option('-o, --output <path>', 'Output directory for DCP component files', 'dist')
  .option('--loglevel <level>', 'Level of logging (error, warn, info, debug)', 'info')
  .option('--quiet', 'Suppress all logs', false)
  .parse(process.argv);

const options = program.opts();

// Configure logging based on options
const logLevels = ['error', 'warn', 'info', 'debug'];
const logLevel = logLevels.indexOf(options.loglevel);

function log(level, ...args) {
  if (options.quiet) return;
  const msgLevel = logLevels.indexOf(level);
  if (msgLevel <= logLevel) {
    console[level === 'info' ? 'log' : level](...args);
  }
}

async function extractStorybook() {
  try {
    // Read Storybook JSON
    const storybookData = JSON.parse(
      await fs.readFile(options.storybookJson, 'utf-8')
    );

    // Process each story entry
    const components = new Map();
    
    for (const story of storybookData.stories) {
      const {
        title,
        name: storyName,
        component,
        parameters,
        args,
        argTypes,
        tags
      } = story;

      // Skip if marked as internal
      if (tags?.includes('!autodocs')) {
        log('debug', `Skipping internal story: ${title}/${storyName}`);
        continue;
      }

      // Extract component metadata
      const componentName = title.split('/').pop();
      if (!components.has(componentName)) {
        components.set(componentName, {
          name: componentName,
          description: parameters?.docs?.description || '',
          props: {},
          stories: [],
          private: false,
          testCoverage: 0,
          supportedInteractions: new Set()
        });
      }

      const componentData = components.get(componentName);

      // Add props from argTypes
      if (argTypes) {
        for (const [propName, propData] of Object.entries(argTypes)) {
          componentData.props[propName] = {
            name: propName,
            type: propData.type?.name || 'any',
            description: propData.description || '',
            required: propData.required || false,
            defaultValue: propData.defaultValue
          };
        }
      }

      // Add story
      const storyData = {
        name: storyName,
        description: parameters?.docs?.storyDescription || '',
        args: args || {},
        parameters: parameters || {}
      };

      // Extract interaction coverage from play function
      if (story.play) {
        const playFn = story.play.toString();
        componentData.testCoverage++;
        
        // Detect interaction types
        if (playFn.includes('userEvent.type')) {
          componentData.supportedInteractions.add('type');
        }
        if (playFn.includes('userEvent.click')) {
          componentData.supportedInteractions.add('click');
        }
        if (playFn.includes('userEvent.hover')) {
          componentData.supportedInteractions.add('hover');
        }
      }

      componentData.stories.push(storyData);
    }

    // Convert to DCP format and write files
    await fs.mkdir(options.output, { recursive: true });

    for (const [name, data] of components) {
      const dcpData = {
        name: data.name,
        description: data.description,
        props: data.props,
        metadata: {
          stories: data.stories,
          private: data.private,
          testCoverage: data.testCoverage,
          supportedInteractions: Array.from(data.supportedInteractions)
        }
      };

      const outputPath = path.join(options.output, `${name}.dcp.json`);
      await fs.writeFile(outputPath, JSON.stringify(dcpData, null, 2));
      log('info', `✓ Generated ${outputPath}`);
    }

    log('info', `\n📦 Extracted ${components.size} components from Storybook`);

  } catch (err) {
    log('error', 'Failed to extract Storybook data:', err);
    process.exit(1);
  }
}

extractStorybook(); 