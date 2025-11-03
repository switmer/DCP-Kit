/**
 * Development Commands Registration
 * Development tools and utilities
 */

import watch from './watch.js';
import transpile from './transpile.js';
import validateCi from './validate-ci.js';
import demo from './demo.js';
import docs from './docs.js';
import api from './api.js';
import companion from './companion.js';

export function registerDevCommands(devGroup) {
  // Watch for changes and auto-rebuild
  devGroup
    .command('watch [path]')
    .description('Watch for file changes and auto-rebuild registry')
    .option('-c, --config <file>', 'configuration file path', './dcp.config.json')
    .option('--poll <interval>', 'polling interval in ms (for network drives)', '')
    .option('--ignore <patterns>', 'comma-separated ignore patterns', 'node_modules,dist,.git')
    .option('--debounce <ms>', 'debounce delay for rapid changes', '300')
    .option('--no-initial', 'skip initial build on startup')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp dev watch
  $ dcp dev watch ./src/components --debounce 500
  $ dcp dev watch --ignore "*.test.js,*.stories.js" --verbose`)
    .action(watch);

  // Transpile components for different targets
  devGroup
    .command('transpile <source>')
    .description('Transpile components for different runtime targets')
    .option('-t, --target <target>', 'transpilation target (es2020, es2018, commonjs)', 'es2020')
    .option('-o, --output <dir>', 'output directory', './dist')
    .option('--jsx <pragma>', 'JSX pragma (React.createElement, h)', 'React.createElement')
    .option('--typescript', 'preserve TypeScript output')
    .option('--sourcemaps', 'generate source maps')
    .option('--minify', 'minify output')
    .option('--bundle', 'bundle dependencies')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp dev transpile ./src/components
  $ dcp dev transpile ./src --target commonjs --minify
  $ dcp dev transpile ./src --jsx h --bundle`)
    .action(transpile);

  // Validate for CI/CD environments
  devGroup
    .command('validate-ci [path]')
    .description('Comprehensive validation for CI/CD pipelines')
    .option('--strict', 'strict validation mode (fail on warnings)')
    .option('--timeout <ms>', 'validation timeout in milliseconds', '60000')
    .option('--parallel <count>', 'parallel validation workers', '4')
    .option('--cache-dir <dir>', 'validation cache directory', './.dcp-cache')
    .option('--no-cache', 'disable validation caching')
    .option('--exit-code', 'use exit codes for CI integration')
    .option('--coverage', 'require test coverage reports')
    .option('--security-audit', 'run security audit checks')
    .option('--performance', 'run performance benchmarks')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp dev validate-ci --strict --exit-code
  $ dcp dev validate-ci --parallel 8 --timeout 120000
  $ dcp dev validate-ci --coverage --security-audit`)
    .action(validateCi);

  // Generate interactive demo
  devGroup
    .command('demo [components]')
    .description('Generate interactive component demos and playground')
    .option('-o, --output <dir>', 'demo output directory', './demo')
    .option('--port <port>', 'development server port', '3000')
    .option('--template <template>', 'demo template (storybook, docusaurus, vite)', 'vite')
    .option('--theme <theme>', 'demo theme (light, dark, auto)', 'auto')
    .option('--examples', 'include usage examples')
    .option('--interactive', 'enable interactive prop editing')
    .option('--no-serve', 'generate files without starting server')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp dev demo
  $ dcp dev demo Button Card --template storybook
  $ dcp dev demo --port 8080 --interactive --examples`)
    .action(demo);

  // Generate documentation
  devGroup
    .command('docs [source]')
    .description('Generate comprehensive component documentation')
    .option('-o, --output <dir>', 'documentation output directory', './docs')
    .option('--format <format>', 'documentation format (markdown, html, json)', 'markdown')
    .option('--template <template>', 'documentation template', 'default')
    .option('--api-docs', 'include API documentation')
    .option('--usage-examples', 'include usage examples')
    .option('--design-tokens', 'document design tokens')
    .option('--accessibility', 'include accessibility guidelines')
    .option('--no-toc', 'skip table of contents generation')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp dev docs
  $ dcp dev docs ./src/components --format html
  $ dcp dev docs --api-docs --usage-examples --accessibility`)
    .action(docs);

  // Start API server
  devGroup
    .command('api [registry]')
    .description('Start development API server for registry access')
    .option('-p, --port <port>', 'server port', '7400')
    .option('-h, --host <host>', 'server host', 'localhost')
    .option('--cors', 'enable CORS for all origins')
    .option('--auth <method>', 'authentication method (none, jwt, api-key)', 'none')
    .option('--rate-limit <requests>', 'requests per minute limit', '100')
    .option('--cache', 'enable response caching')
    .option('--hot-reload', 'enable hot-reload for registry changes')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp dev api ./registry.json
  $ dcp dev api --port 8080 --cors --hot-reload
  $ dcp dev api --auth jwt --rate-limit 200`)
    .action(api);

  // AI companion for development
  devGroup
    .command('companion')
    .description('AI-powered development companion and assistant')
    .option('--model <model>', 'AI model for assistance', 'claude-3-sonnet')
    .option('--mode <mode>', 'companion mode (interactive, watch, batch)', 'interactive')
    .option('--context <dir>', 'project context directory', '.')
    .option('--suggestions', 'enable proactive suggestions')
    .option('--auto-fix', 'automatically fix simple issues')
    .option('--confidence <threshold>', 'minimum confidence for auto-actions', '0.8')
    .option('--learning', 'enable learning from user feedback')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp dev companion
  $ dcp dev companion --mode watch --suggestions
  $ dcp dev companion --auto-fix --confidence 0.9`)
    .action(companion);
}