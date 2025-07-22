import { createServer } from 'vite';
import { startStorybook } from '@storybook/react-vite';
import { program } from 'commander';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

program
  .option('-p, --port <number>', 'Port to run the server on', '6006')
  .option('-c, --config <path>', 'Path to config file', 'sds.config.json')
  .option('--storybook-config <path>', 'Path to Storybook config directory', '.storybook')
  .option('--loglevel <level>', 'Level of logging (error, warn, info, debug)', 'info')
  .option('--quiet', 'Suppress all logs', false)
  .option('--docs', 'Build and serve documentation', false)
  .option('--ci', 'Run in CI mode', false)
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

async function startDevServer() {
  try {
    // Pre-flight checks
    try {
      require.resolve('vite');
      require.resolve('@vitejs/plugin-react');
    } catch (err) {
      log('error', '❌ Missing peer dependencies. Please run:');
      log('error', 'npm install --save-dev vite @vitejs/plugin-react');
      process.exit(1);
    }

    // Create Vite server for component development
    const vite = await createServer({
      configFile: path.resolve(process.cwd(), 'vite.config.js'),
      server: {
        port: parseInt(options.port),
        strictPort: true,
        hmr: {
          port: parseInt(options.port) + 1
        }
      },
      logLevel: options.quiet ? 'silent' : options.loglevel
    });

    // Start Vite server
    await vite.listen();
    log('info', `🚀 DCP development server running at http://localhost:${options.port}`);

    // Start Storybook
    const storybookPort = parseInt(options.port) + 2;
    const storybookOptions = {
      configDir: path.resolve(process.cwd(), options.storybookConfig),
      port: storybookPort,
      ci: options.ci,
      docs: options.docs,
      quiet: options.quiet
    };

    await startStorybook(storybookOptions);
    log('info', `📚 Storybook running at http://localhost:${storybookPort}`);

    // Handle cleanup on process termination
    const cleanup = async () => {
      log('info', '\nShutting down servers...');
      await vite.close();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

  } catch (err) {
    log('error', 'Failed to start development server:', err);
    process.exit(1);
  }
}

startDevServer();
