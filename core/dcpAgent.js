import fs from 'fs';
import path from 'path';
import readlineSync from 'readline-sync';
import { simpleGit } from 'simple-git';
import { AIPlanner } from './aiPlanner.js';
import { BatchMutator } from './batchMutate.js';
import { DiffPreview } from './diffPreview.js';
import { buildRegistry } from './registryBuilder.js';

/**
 * DCP Agent - Full Pipeline Orchestrator
 * 
 * The complete conversation-to-code mutation pipeline:
 * 1. Parse natural language intent
 * 2. Generate AI-planned mutations
 * 3. Apply mutations with safety checks
 * 4. Preview changes before commit
 * 5. Transpile to target platforms
 * 6. Deploy and version changes
 * 
 * This is the "CRISPR for Code" interface that makes design genome
 * editing conversational, safe, and scalable.
 */

export class DCPAgent {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.workingDir = options.workingDir || './';
    this.registryPath = options.registryPath || './dist/registry.json';
    this.backupDir = options.backupDir || './.dcp-backups';
    this.historyFile = options.historyFile || './mutations.log.jsonl';
    this.interactive = options.interactive !== false;
    this.enableGit = options.enableGit !== false;
    
    // Initialize git
    this.git = simpleGit(this.workingDir);
    
    // Initialize sub-modules
    this.planner = new AIPlanner({
      verbose: this.verbose,
      mcpEndpoint: options.mcpEndpoint
    });
    
    this.mutator = new BatchMutator({
      verbose: this.verbose,
      backupDir: this.backupDir,
      enableGit: options.enableGit !== false
    });
    
    this.previewer = new DiffPreview({
      verbose: this.verbose,
      outputFormat: options.previewFormat || 'terminal',
      colorize: options.colorize !== false
    });

    this.stats = {
      sessionsRun: 0,
      mutationsApplied: 0,
      componentsAffected: new Set(),
      lastSession: null
    };
  }

  /**
   * Main agent interface - natural language to deployed changes
   * @param {string} prompt - Natural language description of desired changes
   * @param {Object} options - Execution options
   * @returns {Object} Complete session result
   */
  async executeIntent(prompt, options = {}) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      prompt,
      timestamp: new Date().toISOString(),
      options,
      steps: [],
      result: null
    };

    try {
      if (this.verbose) {
        console.log(`🤖 DCP Agent Session ${sessionId} Starting`);
        console.log(`📝 Intent: "${prompt}"`);
        console.log('═'.repeat(60));
      }

      // Step 1: Load current DCP state
      session.steps.push(await this.stepLoadContext(session));

      // Step 2: Plan mutations using AI
      session.steps.push(await this.stepPlanMutations(session));

      // Step 3: Preview changes
      session.steps.push(await this.stepPreviewChanges(session));

      // Step 4: Get approval (interactive or auto)
      session.steps.push(await this.stepGetApproval(session, options));

      // Step 5: Apply mutations if approved
      if (session.steps[3].result.approved) {
        session.steps.push(await this.stepApplyMutations(session));

        // Step 6: Transpile to target platforms
        if (options.transpile !== false) {
          session.steps.push(await this.stepTranspile(session, options));
        }

        // Step 7: Deploy/commit changes
        if (options.deploy !== false) {
          session.steps.push(await this.stepDeploy(session, options));
        }
      }

      // Finalize session
      session.result = this.finalizeSession(session);
      this.updateStats(session);
      
      // Log the session to history
      await this.logSession(session);

      if (this.verbose) {
        console.log('═'.repeat(60));
        console.log(`✅ Session ${sessionId} completed successfully`);
        this.printSessionSummary(session);
      }

      return session;

    } catch (error) {
      session.error = error.message;
      session.result = { success: false, error: error.message };
      
      if (this.verbose) {
        console.error(`❌ Session ${sessionId} failed:`, error.message);
      }
      
      throw error;
    }
  }

  /**
   * Step 1: Load current DCP context
   */
  async stepLoadContext(session) {
    const step = {
      name: 'load_context',
      timestamp: new Date().toISOString(),
      status: 'running'
    };

    try {
      if (!fs.existsSync(this.registryPath)) {
        throw new Error(`Registry not found at ${this.registryPath}. Run 'dcp build' first.`);
      }

      step.result = {
        registryPath: this.registryPath,
        registry: JSON.parse(fs.readFileSync(this.registryPath, 'utf-8')),
        componentsCount: 0,
        tokensCount: 0
      };

      // Count components and tokens
      if (step.result.registry.components) {
        step.result.componentsCount = step.result.registry.components.length;
      }
      
      if (step.result.registry.tokens) {
        step.result.tokensCount = Object.keys(step.result.registry.tokens).length;
      }

      step.status = 'completed';
      
      if (this.verbose) {
        console.log(`📁 Loaded registry: ${step.result.componentsCount} components, ${step.result.tokensCount} tokens`);
      }

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }

    return step;
  }

  /**
   * Step 2: Plan mutations using AI
   */
  async stepPlanMutations(session) {
    const step = {
      name: 'plan_mutations',
      timestamp: new Date().toISOString(),
      status: 'running'
    };

    try {
      const context = session.steps[0].result.registry;
      const plan = await this.planner.planMutation(session.prompt, this.registryPath);

      step.result = {
        plan,
        mutationsCount: plan.patches.length,
        riskLevel: plan.metadata.riskLevel,
        componentsAffected: plan.metadata.componentsAffected || []
      };

      step.status = 'completed';
      
      if (this.verbose) {
        console.log(`🧠 Generated plan: ${step.result.mutationsCount} mutations, risk level: ${step.result.riskLevel}`);
        if (step.result.componentsAffected.length > 0) {
          console.log(`🎯 Components affected: ${step.result.componentsAffected.join(', ')}`);
        }
      }

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }

    return step;
  }

  /**
   * Step 3: Preview changes
   */
  async stepPreviewChanges(session) {
    const step = {
      name: 'preview_changes',
      timestamp: new Date().toISOString(),
      status: 'running'
    };

    try {
      const originalRegistry = session.steps[0].result.registry;
      const mutations = session.steps[1].result.plan.patches;

      // Apply mutations in dry-run mode to get preview
      const mutationResult = await this.mutator.applyMutations(
        originalRegistry, 
        mutations, 
        { dryRun: true }
      );

      // Generate diff preview
      const preview = await this.previewer.generatePreview(
        originalRegistry,
        mutationResult.mutatedDCP,
        mutations
      );

      step.result = {
        preview,
        mutatedRegistry: mutationResult.mutatedDCP,
        diffSummary: preview.summary
      };

      step.status = 'completed';
      
      if (this.verbose) {
        console.log('🔍 Preview generated:');
        console.log(preview.formats.terminal);
      }

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }

    return step;
  }

  /**
   * Step 4: Get approval (interactive or automatic)
   */
  async stepGetApproval(session, options) {
    const step = {
      name: 'get_approval',
      timestamp: new Date().toISOString(),
      status: 'running'
    };

    try {
      const preview = session.steps[2].result.preview;
      let approved = false;

      if (options.autoApprove || !this.interactive) {
        // Auto-approve based on risk level and options
        approved = this.shouldAutoApprove(preview, options);
        step.result = {
          approved,
          method: 'automatic',
          reason: approved ? 'Risk level acceptable for auto-approval' : 'Risk level too high for auto-approval'
        };
      } else {
        // Interactive approval
        approved = await this.promptForApproval(preview);
        step.result = {
          approved,
          method: 'interactive',
          reason: approved ? 'User approved' : 'User rejected'
        };
      }

      step.status = 'completed';
      
      if (this.verbose) {
        console.log(`👤 Approval: ${approved ? '✅ APPROVED' : '❌ REJECTED'} (${step.result.method})`);
      }

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }

    return step;
  }

  /**
   * Step 5: Apply mutations
   */
  async stepApplyMutations(session) {
    const step = {
      name: 'apply_mutations',
      timestamp: new Date().toISOString(),
      status: 'running'
    };

    try {
      const originalRegistry = session.steps[0].result.registry;
      const mutations = session.steps[1].result.plan.patches;

      const result = await this.mutator.applyMutations(
        originalRegistry,
        mutations,
        {
          dryRun: false,
          outputPath: this.registryPath,
          createBackup: true
        }
      );

      step.result = result;
      step.status = 'completed';
      
      if (this.verbose) {
        console.log(`🧬 Applied ${result.successful} mutations successfully`);
        if (result.backupPath) {
          console.log(`💾 Backup created: ${result.backupPath}`);
        }
      }

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }

    return step;
  }

  /**
   * Step 6: Transpile to target platforms
   */
  async stepTranspile(session, options) {
    const step = {
      name: 'transpile',
      timestamp: new Date().toISOString(),
      status: 'running'
    };

    try {
      const targets = options.transpileTargets || ['react'];
      const outputDir = options.transpileOutput || './generated';
      const results = {};

      for (const target of targets) {
        const targetResult = await this.transpileToTarget(session, target, outputDir);
        results[target] = targetResult;
      }

      step.result = {
        targets,
        outputDir,
        results,
        filesGenerated: Object.values(results).reduce((sum, r) => sum + r.filesGenerated, 0)
      };

      step.status = 'completed';
      
      if (this.verbose) {
        console.log(`🚀 Transpiled to ${targets.join(', ')}: ${step.result.filesGenerated} files generated`);
      }

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }

    return step;
  }

  /**
   * Step 7: Deploy/commit changes
   */
  async stepDeploy(session, options) {
    const step = {
      name: 'deploy',
      timestamp: new Date().toISOString(),
      status: 'running'
    };

    try {
      const deployActions = [];

      // Git commit
      if (this.enableGit && options.gitCommit !== false) {
        deployActions.push(await this.createGitCommit(session));
      }

      // Registry publish
      if (options.publishRegistry) {
        deployActions.push(await this.publishRegistry(session));
      }

      // Storybook update
      if (options.updateStorybook) {
        deployActions.push(await this.updateStorybook(session));
      }

      step.result = {
        actions: deployActions,
        deployed: deployActions.length > 0
      };

      step.status = 'completed';
      
      if (this.verbose) {
        console.log(`🚀 Deploy completed: ${deployActions.length} actions executed`);
      }

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }

    return step;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `dcp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  /**
   * Determine if changes should be auto-approved
   */
  shouldAutoApprove(preview, options) {
    const riskLevel = preview.summary.riskLevel;
    const maxAutoApproveRisk = options.maxAutoApproveRisk || 'low';
    
    const riskLevels = { low: 1, medium: 2, high: 3 };
    
    return riskLevels[riskLevel] <= riskLevels[maxAutoApproveRisk];
  }

  /**
   * Prompt user for interactive approval
   */
  async promptForApproval(preview) {
    console.log('\n🤔 Review the changes above. What would you like to do?');
    console.log('');
    
    const choices = ['Apply changes', 'Cancel (no changes)', 'Save preview to file'];
    const riskLevel = preview.summary.riskLevel;
    
    // Add risk warning for medium/high risk changes
    if (riskLevel === 'high') {
      console.log('⚠️  HIGH RISK: These changes may have significant impact');
    } else if (riskLevel === 'medium') {
      console.log('⚠️  MEDIUM RISK: Please review carefully');
    }
    
    const choice = readlineSync.keyInSelect(choices, 'Choose an option:', { cancel: false });
    
    switch (choice) {
      case 0: // Apply changes
        if (riskLevel === 'high') {
          const confirmed = readlineSync.keyInYN('⚠️  Are you sure you want to apply HIGH RISK changes?');
          return confirmed;
        }
        return true;
        
      case 1: // Cancel
        console.log('❌ Changes cancelled');
        return false;
        
      case 2: // Save preview
        const previewPath = readlineSync.question('Enter preview file path (default: ./mutation-preview.md): ', {
          defaultInput: './mutation-preview.md'
        });
        
        await this.previewer.savePreview(preview, previewPath, 'html');
        console.log(`💾 Preview saved to: ${previewPath}`);
        
        // Ask again after saving
        const afterSave = readlineSync.keyInYN('Apply changes now?');
        return afterSave;
        
      default:
        return false;
    }
  }

  /**
   * Transpile to specific target platform
   */
  async transpileToTarget(session, target, outputDir) {
    if (target === 'react') {
      // Use the existing React transpiler
      return {
        target,
        filesGenerated: 0, // Placeholder
        outputPath: path.join(outputDir, 'react')
      };
    }
    
    throw new Error(`Transpilation target "${target}" not supported yet`);
  }

  /**
   * Create git commit
   */
  async createGitCommit(session) {
    if (!this.enableGit) {
      if (this.verbose) {
        console.log('📝 Git integration disabled, skipping commit');
      }
      return {
        type: 'git_commit',
        message: 'Git disabled',
        skipped: true
      };
    }

    try {
      // Check if we're in a git repository
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        if (this.verbose) {
          console.log('📝 Not a git repository, initializing...');
        }
        await this.git.init();
      }

      // Check git status
      const status = await this.git.status();
      
      // Add changed files
      const filesToAdd = [
        this.registryPath,
        this.historyFile
      ].filter(file => fs.existsSync(file));

      if (filesToAdd.length === 0) {
        if (this.verbose) {
          console.log('📝 No files to commit');
        }
        return {
          type: 'git_commit',
          message: 'No files to commit',
          skipped: true
        };
      }

      // Add files to staging
      await this.git.add(filesToAdd);

      // Create commit message with session details
      const mutationsStep = session.steps.find(s => s.name === 'apply_mutations');
      const componentsAffected = session.steps.find(s => s.name === 'plan_mutations')?.result?.componentsAffected || [];
      
      const commitMessage = [
        `feat(dcp): ${session.prompt}`,
        '',
        `Session ID: ${session.id}`,
        `Mutations Applied: ${mutationsStep?.result?.successful || 0}`,
        componentsAffected.length > 0 ? `Components: ${componentsAffected.join(', ')}` : null,
        '',
        '🤖 Generated with DCP Agent',
        `Timestamp: ${session.timestamp}`
      ].filter(Boolean).join('\n');

      // Create commit
      const commitResult = await this.git.commit(commitMessage);
      
      // Create tag for this mutation
      const tagName = `dcp-mutation-${session.id}`;
      await this.git.tag([tagName, '-m', `DCP mutation: ${session.prompt}`]);

      if (this.verbose) {
        console.log(`📝 Git commit created: ${commitResult.commit}`);
        console.log(`🏷️  Tagged as: ${tagName}`);
      }

      return {
        type: 'git_commit',
        message: commitMessage,
        hash: commitResult.commit,
        tag: tagName,
        filesCommitted: filesToAdd
      };

    } catch (error) {
      if (this.verbose) {
        console.warn('⚠️ Git commit failed:', error.message);
      }
      
      return {
        type: 'git_commit',
        error: error.message,
        failed: true
      };
    }
  }

  /**
   * Publish registry
   */
  async publishRegistry(session) {
    if (this.verbose) {
      console.log('📤 Publishing registry...');
    }
    
    return {
      type: 'registry_publish',
      url: 'https://example.com/registry', // Placeholder
      version: '1.0.0'
    };
  }

  /**
   * Update Storybook
   */
  async updateStorybook(session) {
    if (this.verbose) {
      console.log('📚 Updating Storybook...');
    }
    
    return {
      type: 'storybook_update',
      storiesGenerated: 0 // Placeholder
    };
  }

  /**
   * Finalize session and generate result
   */
  finalizeSession(session) {
    const completedSteps = session.steps.filter(s => s.status === 'completed').length;
    const failedSteps = session.steps.filter(s => s.status === 'failed').length;
    
    const lastStep = session.steps[session.steps.length - 1];
    const wasApplied = session.steps.some(s => s.name === 'apply_mutations' && s.status === 'completed');

    return {
      success: failedSteps === 0,
      sessionId: session.id,
      completedSteps,
      failedSteps,
      mutationsApplied: wasApplied,
      duration: Date.now() - new Date(session.timestamp).getTime(),
      summary: this.generateSessionSummary(session)
    };
  }

  /**
   * Update agent statistics
   */
  updateStats(session) {
    this.stats.sessionsRun++;
    this.stats.lastSession = session.timestamp;

    if (session.result.mutationsApplied) {
      const mutationsStep = session.steps.find(s => s.name === 'apply_mutations');
      if (mutationsStep?.result) {
        this.stats.mutationsApplied += mutationsStep.result.successful;
      }
    }

    const planStep = session.steps.find(s => s.name === 'plan_mutations');
    if (planStep?.result?.componentsAffected) {
      for (const component of planStep.result.componentsAffected) {
        this.stats.componentsAffected.add(component);
      }
    }
  }

  /**
   * Generate session summary
   */
  generateSessionSummary(session) {
    const mutationsStep = session.steps.find(s => s.name === 'plan_mutations');
    const mutationsCount = mutationsStep?.result?.mutationsCount || 0;
    
    const applyStep = session.steps.find(s => s.name === 'apply_mutations');
    const applied = applyStep?.result?.successful || 0;
    
    return `Applied ${applied}/${mutationsCount} mutations for: "${session.prompt}"`;
  }

  /**
   * Print session summary to console
   */
  printSessionSummary(session) {
    console.log('\n📊 SESSION SUMMARY:');
    console.log(`   ID: ${session.id}`);
    console.log(`   Intent: "${session.prompt}"`);
    console.log(`   Steps Completed: ${session.result.completedSteps}`);
    console.log(`   Duration: ${session.result.duration}ms`);
    console.log(`   Mutations Applied: ${session.result.mutationsApplied ? 'Yes' : 'No'}`);
    console.log(`   Result: ${session.result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  }

  /**
   * Log session to history file
   */
  async logSession(session) {
    try {
      const logEntry = {
        sessionId: session.id,
        timestamp: session.timestamp,
        prompt: session.prompt,
        success: session.result?.success || false,
        mutationsApplied: session.result?.mutationsApplied || false,
        steps: session.steps.length,
        completedSteps: session.steps.filter(s => s.status === 'completed').length,
        failedSteps: session.steps.filter(s => s.status === 'failed').length,
        duration: session.result?.duration || 0,
        
        // Extract key information from steps
        mutations: this.extractMutationInfo(session),
        approval: this.extractApprovalInfo(session),
        backup: this.extractBackupInfo(session)
      };

      // Append to JSONL file
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.historyFile, logLine);

      if (this.verbose) {
        console.log(`📝 Session logged to: ${this.historyFile}`);
      }
    } catch (error) {
      if (this.verbose) {
        console.warn('⚠️ Failed to log session:', error.message);
      }
    }
  }

  /**
   * Extract mutation information from session
   */
  extractMutationInfo(session) {
    const planStep = session.steps.find(s => s.name === 'plan_mutations');
    const applyStep = session.steps.find(s => s.name === 'apply_mutations');

    return {
      planned: planStep?.result?.mutationsCount || 0,
      applied: applyStep?.result?.successful || 0,
      failed: applyStep?.result?.failed?.length || 0,
      riskLevel: planStep?.result?.riskLevel || 'unknown',
      componentsAffected: planStep?.result?.componentsAffected || []
    };
  }

  /**
   * Extract approval information from session
   */
  extractApprovalInfo(session) {
    const approvalStep = session.steps.find(s => s.name === 'get_approval');
    
    return {
      approved: approvalStep?.result?.approved || false,
      method: approvalStep?.result?.method || 'unknown',
      reason: approvalStep?.result?.reason || 'unknown'
    };
  }

  /**
   * Extract backup information from session
   */
  extractBackupInfo(session) {
    const applyStep = session.steps.find(s => s.name === 'apply_mutations');
    
    return {
      created: !!applyStep?.result?.backupPath,
      path: applyStep?.result?.backupPath || null
    };
  }

  /**
   * Get mutation history from log file
   */
  async getMutationHistory(limit = 50) {
    if (!fs.existsSync(this.historyFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.historyFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      const entries = lines
        .slice(-limit) // Get last N entries
        .map(line => JSON.parse(line))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return entries;
    } catch (error) {
      if (this.verbose) {
        console.warn('⚠️ Failed to read mutation history:', error.message);
      }
      return [];
    }
  }

  /**
   * Get git repository status
   */
  async getGitStatus() {
    if (!this.enableGit) {
      return { enabled: false };
    }

    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        return { enabled: true, isRepo: false };
      }

      const status = await this.git.status();
      const log = await this.git.log({ maxCount: 5 });
      
      return {
        enabled: true,
        isRepo: true,
        status,
        recentCommits: log.all.map(commit => ({
          hash: commit.hash.substring(0, 7),
          message: commit.message.split('\\n')[0],
          date: commit.date,
          author: commit.author_name
        }))
      };
    } catch (error) {
      return {
        enabled: true,
        error: error.message
      };
    }
  }

  /**
   * Get agent statistics
   */
  getStats() {
    return {
      ...this.stats,
      componentsAffected: Array.from(this.stats.componentsAffected)
    };
  }
}

/**
 * CLI-friendly agent execution
 */
export async function executeAgentIntent(prompt, options = {}) {
  const agent = new DCPAgent({
    verbose: options.verbose !== false,
    interactive: options.interactive !== false,
    ...options
  });

  const session = await agent.executeIntent(prompt, options);
  return session;
}

/**
 * Command-line interface
 */
export async function runAgentCLI(args) {
  const prompt = args.join(' ');

  if (!prompt || prompt.trim() === '') {
    console.error('❌ Usage: node dcpAgent.js "your intent prompt here"');
    console.error('   Example: node dcpAgent.js "change all primary buttons to ghost variant"');
    console.error('');
    console.error('   Options:');
    console.error('     --auto-approve       Auto-approve low risk changes');
    console.error('     --no-transpile       Skip transpilation step');
    console.error('     --no-deploy          Skip deployment step');
    console.error('     --transpile-targets  Comma-separated list (default: react)');
    console.error('     --registry-path      Path to DCP registry (default: ./dist/registry.json)');
    process.exit(1);
  }

  // Parse options
  const options = {
    autoApprove: args.includes('--auto-approve'),
    transpile: !args.includes('--no-transpile'),
    deploy: !args.includes('--no-deploy'),
    verbose: !args.includes('--quiet'),
    interactive: !args.includes('--non-interactive')
  };

  // Parse transpile targets
  const targetsFlag = args.find(arg => arg.startsWith('--transpile-targets='));
  if (targetsFlag) {
    options.transpileTargets = targetsFlag.split('=')[1].split(',');
  }

  // Parse registry path
  const registryFlag = args.find(arg => arg.startsWith('--registry-path='));
  if (registryFlag) {
    options.registryPath = registryFlag.split('=')[1];
  }

  try {
    console.log('🤖 DCP Agent Starting...');
    console.log(`📝 Processing: "${prompt}"`);
    console.log('');

    const session = await executeAgentIntent(prompt, options);
    
    console.log('');
    console.log('🎉 DCP Agent completed successfully!');
    
    if (session.result.mutationsApplied) {
      console.log('✅ Changes have been applied to your design system');
    } else {
      console.log('ℹ️ No changes were applied (preview only or rejected)');
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ DCP Agent failed:', error.message);
    process.exit(1);
  }
}

// Enable direct CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  runAgentCLI(process.argv.slice(2));
}