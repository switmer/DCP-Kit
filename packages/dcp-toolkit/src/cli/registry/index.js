/**
 * Registry Commands Registration
 * Registry management operations
 */

import generate from './generate.js';
import item from './item.js';
import buildPacks from './buildPacks.js';
import serve from './serve.js';
import publish from './publish.js';
import add from './add.js';
import validate from './validate.js';

export function registerRegistryCommands(registryGroup) {
  // Generate ShadCN registry
  registryGroup
    .command('generate <source>')
    .description('Generate ShadCN-compatible registry from component directory')
    .option('--format <format>', 'output format (shadcn, dcp)', 'shadcn')
    .option('--name <name>', 'registry name', 'custom-ui')
    .option('--homepage <url>', 'registry homepage URL')
    .option('-o, --output <dir>', 'output directory', './registry')
    .option('--verbose', 'verbose logging')
    .addHelpText('after', `
Examples:
  $ dcp registry generate ./src/components/ui
  $ dcp registry generate ./components --name "my-design-system" --output ./my-registry`)
    .action(generate);

  // Generate single registry item
  registryGroup
    .command('item <component>')
    .description('Generate single registry item from component file or DCP JSON')
    .option('--format <format>', 'output format (shadcn, dcp)', 'shadcn')
    .option('-o, --output <file>', 'output file path')
    .option('--verbose', 'verbose logging')
    .addHelpText('after', `
Examples:
  $ dcp registry item ./src/components/Button.tsx
  $ dcp registry item ./registry/Button.dcp.json --output button-registry.json`)
    .action(item);

  // Build component packs
  registryGroup
    .command('build-packs <registry>')
    .description('Build static component packages for distribution')
    .option('-o, --out <dir>', 'output directory for component packs', './dist/packs')
    .option('--base-url <url>', 'base URL for hosted blobs', '')
    .option('--namespace <name>', 'component namespace/scope', 'ui')
    .option('--version <version>', 'package version', '1.0.0')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp registry build-packs registry.json --out dist/packs
  $ dcp registry build-packs registry.json --base-url https://cdn.example.com
  $ dcp registry build-packs registry.json --namespace acme-ui --version 2.1.0`)
    .action(buildPacks);

  // Serve registry
  registryGroup
    .command('serve [packs-dir]')
    .description('Serve component packs via HTTP for development')
    .option('-p, --port <number>', 'server port', '7401')
    .option('-h, --host <host>', 'server host', 'localhost')
    .option('--no-cors', 'disable CORS')
    .option('--secret <secret>', 'JWT secret for private registries')
    .option('--base-url <url>', 'base URL for hosted files')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp registry serve dist/packs
  $ dcp registry serve dist/packs --port 8080 --verbose
  $ dcp registry serve dist/packs --secret mytoken --base-url https://cdn.example.com`)
    .action(serve);

  // Publish registry
  registryGroup
    .command('publish <packs-dir>')
    .description('Publish component packs to static hosting')
    .option('--provider <provider>', 'hosting provider (s3, github-pages, generic)', 'detect')
    .option('--bucket <bucket>', 'S3 bucket name')
    .option('--region <region>', 'AWS region', 'us-east-1')
    .option('--base-url <url>', 'base URL for hosted files')
    .option('--namespace <name>', 'component namespace', 'ui')
    .option('--dry-run', 'preview without uploading')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp registry publish dist/packs --bucket my-components --region us-west-2
  $ dcp registry publish dist/packs --provider github-pages
  $ dcp registry publish dist/packs --provider generic --base-url https://cdn.example.com`)
    .action(publish);

  // Add/install component
  registryGroup
    .command('add <component-url>')
    .description('Install a component from a registry (Zero-Fetch v2)')
    .option('-t, --target <dir>', 'target directory for components (auto-detect from components.json)')
    .option('--pm <manager>', 'package manager (npm|pnpm|yarn|bun, auto-detect from lockfiles)')
    .option('--token <token>', 'authentication token for private registries (or DCP_REGISTRY_TOKEN env)')
    .option('--dry-run', 'preview installation without making changes')
    .option('--yes, -y', 'skip confirmation prompts')
    .option('--overwrite <policy>', 'file conflict policy: skip|prompt|force (default: prompt)')
    .option('--registry-format <format>', 'target format: shadcn|raw (default: shadcn)')
    .option('--force', 'shorthand for --overwrite force')
    .option('--verbose', 'verbose logging')
    .option('--json', 'output machine-readable JSON')
    .addHelpText('after', `
Examples:
  $ dcp registry add https://demo.dcp.dev/r/ui/button
  $ dcp registry add http://localhost:7401/r/ui/card@2.1.0
  $ dcp registry add ./dist/packs/r/ui/avatar --target ./src/components
  $ dcp registry add https://private.example.com/r/ui/button --token abc123
  $ dcp registry add https://registry.example.com/r/ui/button --dry-run --verbose`)
    .action(add);

  // Validate registry
  registryGroup
    .command('validate <registry>')
    .description('Validate registry structure against DCP schema')
    .option('--json', 'output machine-readable JSON')
    .option('--strict', 'enable strict validation mode')
    .option('--agent-schema', 'validate agent/LLM compatibility')
    .option('--comprehensive', 'run comprehensive validation checks')
    .option('--check-examples', 'validate component examples')
    .option('--check-tokens', 'validate design token usage')
    .option('--strict-tokens', 'strict token value format validation')
    .option('--check-source <dir>', 'validate against source code')
    .option('--check-naming', 'validate naming conventions')
    .option('--check-combinations', 'validate prop combinations')
    .option('--check-jsx', 'validate JSX syntax in examples')
    .option('--check-typescript', 'validate TypeScript compatibility')
    .option('--security-audit', 'run security audit on dependencies')
    .option('--check-vulnerabilities', 'check for known vulnerabilities')
    .option('--check-licenses', 'validate license compatibility')
    .option('--verify-integrity', 'verify registry checksums and signatures')
    .addHelpText('after', `
Examples:
  $ dcp registry validate registry.json --json
  $ dcp registry validate registry.json --strict
  $ dcp registry validate registry.json --comprehensive`)
    .action(validate);
}