import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Create directory if it doesn't exist
 * @param {string} dir Directory path
 * @param {boolean} verbose Enable verbose logging
 */
function ensureDir(dir, verbose = false) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    if (verbose) {
      console.log(`📁 Created directory: ${dir}`);
    }
  }
}

/**
 * Copy template file with variable substitution
 * @param {string} src Source template path
 * @param {string} dest Destination path
 * @param {Object} vars Variables to substitute
 * @param {boolean} verbose Enable verbose logging
 */
function copyTemplate(src, dest, vars = {}, verbose = false) {
  let content = fs.readFileSync(src, 'utf8');
  
  // Replace variables in content
  Object.entries(vars).forEach(([key, value]) => {
    content = content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
  });

  fs.writeFileSync(dest, content);
  if (verbose) {
    console.log(`📝 Created file: ${dest}`);
  }
}

/**
 * Scaffold a new DCP-Transformer project
 * @param {Object} options Command options
 */
export async function runScaffold(options = {}) {
  const {
    name = 'my-design-system',
    verbose = false
  } = options;

  try {
    // Create project structure
    const dirs = [
      './src/components',
      './tokens',
      './dist'
    ];

    console.log(`🚀 Creating new DCP-Transformer project: ${name}`);
    
    // Create directories
    dirs.forEach(dir => ensureDir(dir, verbose));

    // Copy templates
    const templateDir = path.resolve(__dirname, '../../templates');
    const vars = {
      projectName: name,
      year: new Date().getFullYear()
    };

    // Copy and process templates
    copyTemplate(
      path.join(templateDir, 'dcp.config.json'),
      './dcp.config.json',
      vars,
      verbose
    );

    copyTemplate(
      path.join(templateDir, 'Button.tsx'),
      './src/components/Button.tsx',
      vars,
      verbose
    );

    copyTemplate(
      path.join(templateDir, 'tokens.json'),
      './tokens/index.json',
      vars,
      verbose
    );

    // Create README.md
    const readme = `# ${name}

A design system built with DCP-Transformer.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Build the registry:
   \`\`\`bash
   npx dcp-transformer build
   \`\`\`

3. Start development:
   \`\`\`bash
   npm run dev
   \`\`\`

## Project Structure

- \`/src/components\` - React components
- \`/tokens\` - Design tokens
- \`/dist\` - Built registry

## Commands

- \`npm run build\` - Build the registry
- \`npm run dev\` - Start development server
- \`npm run test\` - Run tests
`;

    fs.writeFileSync('README.md', readme);
    if (verbose) {
      console.log('📝 Created README.md');
    }

    // Create package.json if it doesn't exist
    if (!fs.existsSync('package.json')) {
      const pkg = {
        name,
        version: '1.0.0',
        private: true,
        scripts: {
          build: 'dcp-transformer build',
          dev: 'dcp-transformer build --watch',
          test: 'jest'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          typescript: '^5.0.0',
          jest: '^29.0.0',
          'dcp-transformer': 'latest'
        }
      };

      fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
      if (verbose) {
        console.log('📝 Created package.json');
      }
    }

    console.log(`
✅ Project created successfully!

Next steps:
1. cd ${name}
2. npm install
3. npm run build

For more information, check out the README.md file.
`);

  } catch (error) {
    console.error('❌ Failed to scaffold project:', error.message);
    if (verbose) {
      console.error(error);
    }
    throw error;
  }
} 