import { buildRegistry } from '../core/registryBuilder.js';
import { loadConfig } from '../core/configHandler.js';
import path from 'path';
import fs from 'fs';

export async function runBuild(options = {}) {
  const {
    configPath = './dcp.config.json',
    verbose = false,
    glob = null,
    withStorybook = false,
    storybookJson = null,
  } = options;

  try {
    // Load and validate config
    const config = loadConfig(configPath, verbose);
    const outputDir = path.dirname(config.output);

    // Build registry
    const result = await buildRegistry({
      componentsPath: config.componentSource,
      tokensPath: config.tokens,
      outputPath: config.output,
      rootDir: path.dirname(configPath),
      verbose,
      glob: glob || config.componentPatterns,
      storybookJson
    });

    if (verbose) {
      console.log(`✅ Built ${result.components.length} components`);
      console.log(`📦 Registry written to: ${config.output}`);
    }

    // Build Storybook if enabled
    if (withStorybook || config.storybook?.docsBuild) {
      const sbConfigDir = config.storybook?.configDir || '.storybook';
      const sbOutputDir = path.join(outputDir, config.storybook?.staticDir || 'storybook-static');

      if (verbose) {
        console.log('📚 Building Storybook documentation...');
      }

      const { execa } = await import('execa');
      const args = ['build', '--config-dir', sbConfigDir, '--output-dir', sbOutputDir];
      if (!verbose) args.push('--quiet');
      await execa('storybook', args);

      // Add Storybook URLs to component metadata
      const components = JSON.parse(fs.readFileSync(config.output, 'utf8'));
      components.components = components.components.map(component => ({
        ...component,
        docsUrl: `./storybook-static/iframe.html?id=${component.name.toLowerCase()}--docs`
      }));
      fs.writeFileSync(config.output, JSON.stringify(components, null, 2));

      if (verbose) {
        console.log(`📖 Storybook documentation built to: ${sbOutputDir}`);
      }
    }

    return result;
  } catch (error) {
    throw new Error(`Build failed: ${error.message}`);
  }
}