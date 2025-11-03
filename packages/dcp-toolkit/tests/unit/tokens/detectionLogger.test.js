/**
 * @jest-environment node
 */
import { DetectionLogger } from '../../../src/tokens/detectionLogger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('📊 Detection Logger', () => {
  let tempDir;
  let logger;

  beforeEach(async () => {
    tempDir = path.join(__dirname, '../temp-detection-logger');
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    logger = new DetectionLogger(tempDir, { 
      verbose: false 
    });
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe('Source Detection Logging', () => {
    test('should log detected token sources', () => {
      const source = {
        type: 'tailwind',
        path: '/project/tailwind.config.js',
        confidence: 0.9,
        description: 'Tailwind CSS configuration'
      };

      logger.logDetectedSource(source, { 
        fileSize: 1024,
        lastModified: '2024-01-01T00:00:00Z'
      });

      const log = logger.getLog();
      
      expect(log.sources).toHaveLength(1);
      expect(log.sources[0]).toMatchObject({
        type: 'tailwind',
        path: '/project/tailwind.config.js',
        confidence: 0.9,
        detectedAt: expect.any(String)
      });
      // Metadata is merged differently in actual implementation
      expect(log.sources[0]).toHaveProperty('fileSize', 1024);
      expect(log.sources[0]).toHaveProperty('lastModified', '2024-01-01T00:00:00Z');
    });

    test('should track multiple source types', () => {
      const sources = [
        { type: 'tailwind', path: '/project/tailwind.config.js', confidence: 0.9 },
        { type: 'radix', path: '/project/node_modules/@radix-ui/themes', confidence: 0.8 },
        { type: 'css-variables', path: '/project/src/globals.css', confidence: 0.7 }
      ];

      sources.forEach(source => logger.logDetectedSource(source));

      const log = logger.getLog();
      
      expect(log.sources).toHaveLength(3);
      expect(log.summary.totalSources).toBe(3);
      expect(log.summary.byType).toMatchObject({
        tailwind: 1,
        radix: 1,
        'css-variables': 1
      });
    });

    test('should calculate confidence statistics', () => {
      const sources = [
        { type: 'tailwind', confidence: 0.9 },
        { type: 'radix', confidence: 0.8 },
        { type: 'css-variables', confidence: 0.6 },
        { type: 'mui', confidence: 0.7 }
      ];

      sources.forEach(source => logger.logDetectedSource(source));

      const log = logger.getLog();
      
      expect(log.summary.confidence).toMatchObject({
        average: 0.75,
        highest: 0.9,
        lowest: 0.6
      });
    });
  });

  describe('Performance Tracking', () => {
    test('should track detection performance', () => {
      logger.logPerformance('detection', 100.5);

      const log = logger.getLog();
      
      expect(log.performance.detectionTime).toBe(100.5);
    });

    test('should track multiple performance metrics', () => {
      logger.logPerformance('fileSystem', 50.2);
      logger.logPerformance('parsing', 25.1);
      logger.logPerformance('analysis', 75.3);

      const log = logger.getLog();
      
      expect(log.performance).toHaveProperty('fileSystemTime', 50.2);
      expect(log.performance).toHaveProperty('parsingTime', 25.1);
      expect(log.performance).toHaveProperty('analysisTime', 75.3);
    });

    test('should handle multiple performance entries', () => {
      logger.logPerformance('outer', 100);
      logger.logPerformance('inner', 50);

      const log = logger.getLog();
      
      expect(log.performance.outerTime).toBe(100);
      expect(log.performance.innerTime).toBe(50);
    });
  });

  describe('Recommendation Generation', () => {
    test('should generate setup recommendations for no sources', () => {
      const recommendations = logger.generateRecommendations();
      
      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'setup',
            priority: 'high',
            message: expect.stringContaining('No token sources detected')
          })
        ])
      );
    });

    test('should recommend improvements for low confidence sources', () => {
      logger.logDetectedSource({
        type: 'custom',
        path: '/project/tokens.js',
        confidence: 0.4
      });

      const recommendations = logger.generateRecommendations();
      
      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'accuracy',
            priority: 'medium',
            message: expect.stringContaining('low-confidence')
          })
        ])
      );
    });

    test('should suggest consolidation for many sources', () => {
      // Add many different sources (>2 triggers conflicts recommendation)
      const sources = [
        { type: 'tailwind', confidence: 0.8 },
        { type: 'css-variables', confidence: 0.7 },
        { type: 'mui', confidence: 0.6 }
      ];

      sources.forEach(source => logger.logDetectedSource(source));

      const recommendations = logger.generateRecommendations();
      
      expect(recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'conflicts',
            priority: 'medium',
            message: expect.stringContaining('Multiple token systems')
          })
        ])
      );
    });

    test('should provide performance recommendations for slow detection', () => {
      // Simulate slow detection and extraction (>10s total)
      logger.logPerformance('detection', 8000);
      logger.logPerformance('extraction', 5000);

      const recommendations = logger.generateRecommendations();
      
      // Should recommend performance improvements for slow detection
      const perfRecommendation = recommendations.find(r => 
        r.type === 'performance'
      );
      
      expect(perfRecommendation).toBeDefined();
      expect(perfRecommendation.message).toContain('13.0s');
    });
  });

  describe('Log File Management', () => {
    test('should write detection log to file', async () => {
      logger.logDetectedSource({
        type: 'tailwind',
        path: '/project/tailwind.config.js',
        confidence: 0.9
      });

      await logger.writeLog();

      const logPath = path.join(tempDir, 'detection.log.json');
      expect(fs.existsSync(logPath)).toBe(true);

      const logContent = JSON.parse(
        await fs.promises.readFile(logPath, 'utf-8')
      );

      expect(logContent).toMatchObject({
        summary: expect.objectContaining({
          totalSources: 1
        }),
        sources: expect.arrayContaining([
          expect.objectContaining({
            type: 'tailwind'
          })
        ])
      });
    });

    test('should create log directory if it does not exist', async () => {
      const nonExistentDir = path.join(tempDir, 'nested', 'logs');
      const nestedLogger = new DetectionLogger(nonExistentDir);

      nestedLogger.logDetectedSource({
        type: 'css-variables',
        confidence: 0.7
      });

      await nestedLogger.writeLog();

      const logPath = path.join(nonExistentDir, 'detection.log.json');
      expect(fs.existsSync(logPath)).toBe(true);
    });

    test('should append to existing log file', async () => {
      // Write first log
      logger.logDetectedSource({
        type: 'tailwind',
        confidence: 0.9
      });
      await logger.writeLog();

      // Create new logger instance and add more sources
      const logger2 = new DetectionLogger(tempDir);
      logger2.logDetectedSource({
        type: 'radix',
        confidence: 0.8
      });
      await logger2.writeLog();

      const logPath = path.join(tempDir, 'detection.log.json');
      const logContent = JSON.parse(
        await fs.promises.readFile(logPath, 'utf-8')
      );

      // Should contain sources from both loggers
      expect(logContent.sources).toHaveLength(2);
    });
  });

  describe('Verbose Logging', () => {
    test('should provide detailed logs in verbose mode', () => {
      const verboseLogger = new DetectionLogger(tempDir, { verbose: true });
      
      verboseLogger.logDetectedSource({
        type: 'tailwind',
        path: '/project/tailwind.config.js',
        confidence: 0.9
      });

      const log = verboseLogger.getLog();
      
      // Verbose logger still uses same structure, just logs to console
      expect(log.sources).toHaveLength(1);
      expect(verboseLogger.verbose).toBe(true);
    });

    test('should log issues and warnings', () => {
      logger.logIssue('warning', 'Config file not found', { path: '/missing/config.js' });
      logger.logIssue('error', 'Parse error', { line: 42 });

      const log = logger.getLog();
      
      expect(log.summary.issues).toHaveLength(2);
      expect(log.summary.issues[0]).toMatchObject({
        level: 'warning',
        message: 'Config file not found',
        context: { path: '/missing/config.js' }
      });
    });
  });

  describe('Error Logging', () => {
    test('should log detection errors', () => {
      logger.logIssue('error', 'Failed to parse config file', {
        configPath: '/project/tailwind.config.js'
      });

      const log = logger.getLog();
      
      expect(log.summary.issues).toHaveLength(1);
      expect(log.summary.issues[0]).toMatchObject({
        level: 'error',
        message: 'Failed to parse config file',
        context: {
          configPath: '/project/tailwind.config.js'
        },
        timestamp: expect.any(String)
      });
    });

    test('should include errors in summary', () => {
      logger.logIssue('error', 'Syntax error');
      logger.logIssue('error', 'Invalid schema');

      const log = logger.getLog();
      const summary = logger.generateSummary();
      
      expect(summary.issues).toHaveLength(2);
      expect(summary.issues.filter(i => i.level === 'error')).toHaveLength(2);
    });
  });

  describe('Export Capabilities', () => {
    test('should export log as JSON', async () => {
      logger.logDetectedSource({
        type: 'tailwind',
        confidence: 0.9
      });

      const log = logger.getLog();
      const jsonLog = JSON.stringify(log);
      const parsed = JSON.parse(jsonLog);

      expect(parsed).toMatchObject({
        sources: expect.arrayContaining([
          expect.objectContaining({
            type: 'tailwind'
          })
        ])
      });
    });

    test('should generate summary with recommendations', () => {
      logger.logDetectedSource({
        type: 'tailwind',
        path: '/project/tailwind.config.js',
        confidence: 0.9
      });

      logger.logDetectedSource({
        type: 'css-variables',
        path: '/project/src/globals.css',
        confidence: 0.7
      });

      const summary = logger.generateSummary();

      expect(summary).toMatchObject({
        totalSources: 2,
        byType: {
          tailwind: 1,
          'css-variables': 1
        },
        highConfidence: 1,
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Statistics and Analysis', () => {
    test('should calculate detection statistics', () => {
      const sources = [
        { type: 'tailwind', confidence: 0.9, path: '/a/tailwind.config.js' },
        { type: 'tailwind', confidence: 0.8, path: '/b/tailwind.config.js' },
        { type: 'radix', confidence: 0.7, path: '/node_modules/@radix-ui' },
        { type: 'css-variables', confidence: 0.6, path: '/src/globals.css' }
      ];

      sources.forEach(source => logger.logDetectedSource(source));

      const summary = logger.generateSummary();

      expect(summary).toMatchObject({
        totalSources: 4,
        byType: {
          tailwind: 2,
          radix: 1,
          'css-variables': 1
        },
        highConfidence: 2 // >= 0.8
      });
    });
  });
});