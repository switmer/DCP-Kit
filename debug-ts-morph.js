import { createTSMorphExtractor } from './packages/dcp-toolkit/src/extractors/tsMorphExtractor.js';
import path from 'path';
import fs from 'fs';

async function debugBlockComponent() {
  console.log('🔍 Creating ts-morph extractor...');
  
  const extractor = createTSMorphExtractor({
    fallbackToUnknown: true,
    includeInheritedProps: true,
    maxDepth: 10
  });
  
  console.log('🔧 Initializing extractor...');
  const baseweb = path.resolve('./baseweb');
  const success = await extractor.initialize(baseweb);
  console.log(`✅ Initialized: ${success}`);
  
  const filePath = path.resolve('./baseweb/src/block/block.tsx');
  console.log(`📂 File exists: ${fs.existsSync(filePath)}`);
  console.log(`🔍 Extracting from: ${filePath}`);
  
  // Let's debug the individual steps
  console.log('\n🔍 Debugging individual steps...');
  
  // Add the source file to the project
  const sourceFile = extractor.project.addSourceFileAtPath(filePath);
  console.log(`📁 Source file added: ${sourceFile.getFilePath()}`);
  
  // Find the component
  const component = extractor.findComponent(sourceFile, 'Block');
  console.log(`🎯 Component found: ${component ? component.getKind() : 'null'}`);
  
  if (component) {
    console.log(`📝 Component name: ${component.getText().slice(0, 200)}...`);
    
    // Test the prop type extraction
    const propType = extractor.getComponentPropType(component);
    console.log(`🔧 Prop type found: ${propType ? 'YES' : 'NO'}`);
    
    if (propType) {
      console.log(`📋 Prop type text: ${propType.getText().slice(0, 200)}...`);
      
      // Test property resolution
      const props = extractor.resolveTypeProperties(propType);
      console.log(`📊 Resolved ${props.length} properties`);
    }
  }
  
  const result = await extractor.extractComponentProps(filePath, 'Block');
  console.log('\n📊 Final Results:', JSON.stringify(result, null, 2));
  
  // Show cache stats
  if (extractor.cacheStats) {
    console.log('📈 Cache stats:', extractor.cacheStats);
  }
}

debugBlockComponent().catch(console.error);