#!/usr/bin/env node

/**
 * Performance test for ts-morph extractor caching optimizations
 * Tests the Block component from BaseWeb which has complex intersection types
 */

import { createTSMorphExtractor } from './packages/dcp-toolkit/src/extractors/tsMorphExtractor.js';
import path from 'path';

const testFilePath = path.resolve('./baseweb/src/button/button.tsx');
const componentName = 'ForwardedButton';

async function testPerformance() {
  console.log('🧪 Testing ts-morph extractor performance optimizations...\n');
  
  // Create extractor instance
  const extractor = createTSMorphExtractor({
    fallbackToUnknown: true,
    includeInheritedProps: true,
    maxDepth: 10
  });
  
  // Initialize with project
  console.log('📦 Initializing ts-morph project...');
  const success = await extractor.initialize('./baseweb');
  
  if (!success) {
    console.log('❌ Failed to initialize ts-morph project');
    return;
  }
  
  console.log('✅ ts-morph project initialized successfully\n');
  
  // Test extraction performance
  console.log(`🔍 Extracting props for ${componentName} component...`);
  console.log(`📄 File: ${testFilePath}\n`);
  
  const startTime = performance.now();
  
  const result = await extractor.extractComponentProps(testFilePath, componentName);
  
  const endTime = performance.now();
  const duration = (endTime - startTime).toFixed(2);
  
  console.log(`⏱️  Extraction completed in ${duration}ms\n`);
  
  if (result.success) {
    console.log(`✅ Successfully extracted ${result.props.length} props:`);
    
    // Show first few props as examples
    const sampleProps = result.props.slice(0, 5);
    sampleProps.forEach(prop => {
      console.log(`   • ${prop.name}: ${prop.type} ${prop.required ? '(required)' : '(optional)'}`);
    });
    
    if (result.props.length > 5) {
      console.log(`   ... and ${result.props.length - 5} more props`);
    }
    
    console.log(`\n📊 Performance metrics:`);
    console.log(`   • Total props extracted: ${result.props.length}`);
    console.log(`   • Extraction speed: ${duration}ms`);
    console.log(`   • Component type: ${result.component.type}`);
    
    // Show cache statistics if available
    if (extractor.cacheStats) {
      const stats = extractor.cacheStats;
      console.log(`\n🚀 Cache performance:`);
      console.log(`   • Type cache hits: ${stats.typeCacheHits}`);
      console.log(`   • Symbol cache hits: ${stats.symbolCacheHits}`);
      console.log(`   • Intersection cache hits: ${stats.intersectionCacheHits}`);
      console.log(`   • React DOM skips: ${stats.reactDomSkips}`);
      console.log(`   • Total queries: ${stats.totalQueries}`);
      
      const cacheHitRate = stats.totalQueries > 0 
        ? ((stats.typeCacheHits + stats.symbolCacheHits + stats.intersectionCacheHits) / stats.totalQueries * 100).toFixed(1)
        : 0;
      
      console.log(`   • Cache hit rate: ${cacheHitRate}%`);
    }
    
  } else {
    console.log(`❌ Extraction failed: ${result.error}`);
  }
  
  // Cleanup
  extractor.cleanup();
  
  console.log(`\n🎯 Performance test completed successfully!`);
  console.log(`💡 The caching optimizations should eliminate redundant type analysis`);
  console.log(`🚀 Without caching, this would analyze the same React DOM types repeatedly`);
}

// Run the test
testPerformance().catch(console.error);