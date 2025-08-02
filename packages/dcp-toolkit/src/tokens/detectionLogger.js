/**
 * Detection Logger - Transparent logging and debugging for token detection
 */

import fs from 'fs';
import path from 'path';

export class DetectionLogger {
  constructor(outputDir, options = {}) {
    this.outputDir = outputDir;
    this.verbose = options.verbose || false;
    this.logFile = path.join(outputDir, 'detection-log.json');
    
    this.log = {
      detectionRun: new Date().toISOString(),
      version: '1.0.0',
      sources: [],
      overrides: {
        appliedFrom: null,
        rules: []
      },
      summary: {
        totalSources: 0,
        byType: {},
        highConfidence: 0,
        issues: []
      },
      performance: {
        startTime: performance.now(),
        detectionTime: null,
        extractionTime: null
      }
    };
  }

  /**
   * Log a detected source
   */
  logDetectedSource(source, metadata = {}) {
    const logEntry = {
      type: source.type,
      path: source.path,
      confidence: source.confidence,
      description: source.description,
      metadata: source.metadata || {},
      detectedAt: new Date().toISOString(),
      ...metadata
    };

    this.log.sources.push(logEntry);

    if (this.verbose) {
      const confidence = `${(source.confidence * 100).toFixed(0)}%`;
      console.log(`📦 ${source.type.toUpperCase()}: ${source.path} (${confidence})`);
    }
  }

  /**
   * Log extraction results for a source
   */
  logExtractionResult(source, result) {
    const sourceLog = this.log.sources.find(s => s.path === source.path);
    if (sourceLog) {
      sourceLog.extraction = {
        success: result.success,
        tokensFound: result.tokensFound || 0,
        categories: result.categories || [],
        error: result.error || null,
        fallbackUsed: result.fallbackUsed || false,
        extractionTime: result.extractionTime || null
      };

      if (result.error && this.verbose) {
        console.warn(`⚠️  ${source.type} extraction failed: ${result.error}`);
      } else if (result.success && this.verbose) {
        console.log(`✅ ${source.type}: ${result.tokensFound} tokens extracted`);
      }
    }
  }

  /**
   * Log applied overrides
   */
  logOverrides(overrideConfig, appliedRules) {
    this.log.overrides.appliedFrom = overrideConfig.configPath || null;
    this.log.overrides.rules = appliedRules.map(rule => ({
      action: rule.action,
      path: rule.path,
      type: rule.type,
      reason: rule.reason || null,
      appliedAt: new Date().toISOString()
    }));

    if (this.verbose && appliedRules.length > 0) {
      console.log(`🔧 Applied ${appliedRules.length} override rule(s)`);
      appliedRules.forEach(rule => {
        console.log(`   ${rule.action}: ${rule.path}`);
      });
    }
  }

  /**
   * Log performance metrics
   */
  logPerformance(phase, time) {
    this.log.performance[`${phase}Time`] = time;
    
    if (this.verbose) {
      console.log(`⏱️  ${phase}: ${time.toFixed(1)}ms`);
    }
  }

  /**
   * Log issues and warnings
   */
  logIssue(level, message, context = {}) {
    const issue = {
      level, // 'warning', 'error', 'info'
      message,
      context,
      timestamp: new Date().toISOString()
    };

    this.log.summary.issues.push(issue);

    if (this.verbose) {
      const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    const sources = this.log.sources;
    
    // Count by type
    const byType = {};
    sources.forEach(source => {
      byType[source.type] = (byType[source.type] || 0) + 1;
    });

    // High confidence sources (>= 80%)
    const highConfidence = sources.filter(s => s.confidence >= 0.8).length;

    // Success rate
    const successful = sources.filter(s => s.extraction?.success).length;
    const successRate = sources.length > 0 ? (successful / sources.length) : 0;

    // Total tokens extracted
    const totalTokens = sources.reduce((sum, s) => sum + (s.extraction?.tokensFound || 0), 0);

    this.log.summary = {
      totalSources: sources.length,
      byType,
      highConfidence,
      successRate: Math.round(successRate * 100),
      totalTokens,
      issues: this.log.summary.issues
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations();
    this.log.summary.recommendations = recommendations;

    return this.log.summary;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const sources = this.log.sources;
    const summary = this.log.summary;

    // No sources found
    if (sources.length === 0) {
      recommendations.push({
        type: 'setup',
        priority: 'high',
        message: 'No token sources detected. Consider setting up a design token system.',
        actions: [
          'Create a tokens.json file',
          'Set up CSS custom properties',
          'Configure Tailwind CSS theme'
        ]
      });
    }

    // Low confidence detections
    const lowConfidence = sources.filter(s => s.confidence < 0.5);
    if (lowConfidence.length > 0) {
      recommendations.push({
        type: 'accuracy',
        priority: 'medium', 
        message: `${lowConfidence.length} low-confidence detections may be incorrect.`,
        actions: [
          'Review detected sources in detection-log.json',
          'Use dcp.config.json to override detection',
          'Rename files to follow standard conventions'
        ]
      });
    }

    // Extraction failures
    const failures = sources.filter(s => s.extraction && !s.extraction.success);
    if (failures.length > 0) {
      recommendations.push({
        type: 'extraction',
        priority: 'high',
        message: `${failures.length} sources failed to extract tokens.`,
        actions: [
          'Check file permissions and syntax',
          'Install missing dependencies',
          'Use --verbose flag for detailed error messages'
        ]
      });
    }

    // Multiple token systems (potential conflicts)
    if (Object.keys(summary.byType).length > 2) {
      recommendations.push({
        type: 'conflicts',
        priority: 'medium',
        message: `Multiple token systems detected (${Object.keys(summary.byType).join(', ')}).`,
        actions: [
          'Consider using --conflict-strategy to handle duplicates',
          'Standardize on a single token system',
          'Use dcp.config.json to exclude unwanted sources'
        ]
      });
    }

    // Performance issues
    const totalTime = this.log.performance.detectionTime + this.log.performance.extractionTime;
    if (totalTime > 10000) { // > 10 seconds
      recommendations.push({
        type: 'performance',
        priority: 'low',
        message: `Token detection took ${(totalTime/1000).toFixed(1)}s. Consider optimization.`,
        actions: [
          'Use .dcpignore to exclude large directories',
          'Reduce --max-depth for deep directory scans',
          'Consider using specific --tokens paths instead of auto-detection'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Write detection log to file
   */
  async writeLog() {
    try {
      // Ensure output directory exists
      await fs.promises.mkdir(this.outputDir, { recursive: true });
      
      // Finalize summary
      this.generateSummary();
      
      // Add total runtime
      this.log.performance.totalTime = performance.now() - this.log.performance.startTime;
      
      // Write log file
      await fs.promises.writeFile(
        this.logFile, 
        JSON.stringify(this.log, null, 2),
        'utf8'
      );

      if (this.verbose) {
        console.log(`📝 Detection log written to: ${this.logFile}`);
      }

      return this.logFile;
    } catch (error) {
      console.error('Failed to write detection log:', error.message);
      throw error;
    }
  }

  /**
   * Print summary to console
   */
  printSummary() {
    const summary = this.log.summary;
    
    console.log('\n🎯 Detection Summary:');
    console.log(`   Sources found: ${summary.totalSources}`);
    console.log(`   High confidence: ${summary.highConfidence}`);
    console.log(`   Success rate: ${summary.successRate}%`);
    console.log(`   Total tokens: ${summary.totalTokens}`);
    
    if (Object.keys(summary.byType).length > 0) {
      console.log('   By type:');
      Object.entries(summary.byType).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });
    }

    // Show recommendations
    if (summary.recommendations && summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      summary.recommendations.forEach(rec => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`   ${priority} ${rec.message}`);
      });
    }

    // Show issues
    if (summary.issues && summary.issues.length > 0) {
      const errors = summary.issues.filter(i => i.level === 'error').length;
      const warnings = summary.issues.filter(i => i.level === 'warning').length;
      
      if (errors > 0 || warnings > 0) {
        console.log(`\n⚠️  Issues: ${errors} error(s), ${warnings} warning(s)`);
        console.log(`   See ${this.logFile} for details`);
      }
    }
  }

  /**
   * Get log data for programmatic access
   */
  getLog() {
    return this.log;
  }
}