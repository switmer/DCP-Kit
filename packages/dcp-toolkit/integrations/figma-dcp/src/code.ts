// Figma Plugin - DCP Design System Integration
// Sync design tokens and validate designs against code registry

interface DCPRegistry {
  components: DCPComponent[];
  tokens: Record<string, any>;
  metadata?: any;
}

interface DCPComponent {
  name: string;
  description?: string;
  category?: string;
  props: DCPProp[];
  variants?: string[];
}

interface DCPProp {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

interface DCPToken {
  name: string;
  value: string;
  type: string;
  category: string;
  description?: string;
}

interface ValidationResult {
  layerName: string;
  layerId: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestions?: string[];
}

class DCPPlugin {
  private apiUrl: string = '';
  private registry: DCPRegistry | null = null;
  private tokens: DCPToken[] = [];

  constructor() {
    // Plugin lifecycle
    figma.showUI(__html__, { 
      width: 320, 
      height: 600,
      title: 'DCP Design System'
    });

    // Handle messages from UI
    figma.ui.onmessage = this.handleMessage.bind(this);
  }

  private async handleMessage(msg: any) {
    switch (msg.type) {
      case 'connect':
        await this.connectToDCP(msg.apiUrl);
        break;
      
      case 'sync-tokens':
        await this.syncTokens();
        break;
      
      case 'validate-selection':
        await this.validateSelection();
        break;
      
      case 'validate-page':
        await this.validatePage();
        break;
    }
  }

  // Connect to DCP API and load registry
  private async connectToDCP(apiUrl: string) {
    try {
      this.apiUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
      
      // Test connection with health check
      const healthResponse = await this.fetchAPI('/health');
      
      if (healthResponse.status !== 'healthy' && healthResponse.status !== 'degraded') {
        throw new Error(`API is ${healthResponse.status}`);
      }

      // Load registry
      const registryResponse = await this.fetchAPI('/registry');
      this.registry = registryResponse;
      
      // Extract and flatten tokens
      this.tokens = this.extractTokens(this.registry.tokens);
      
      figma.ui.postMessage({
        type: 'connection-success',
        data: {
          componentsCount: this.registry.components?.length || 0,
          tokensCount: this.tokens.length,
          apiHealth: healthResponse.status
        }
      });

    } catch (error) {
      console.error('Connection failed:', error);
      figma.ui.postMessage({
        type: 'connection-error',
        error: error instanceof Error ? error.message : 'Connection failed'
      });
    }
  }

  // Sync DCP tokens to Figma Variables
  private async syncTokens() {
    try {
      if (!this.registry || this.tokens.length === 0) {
        throw new Error('No tokens available. Connect to DCP first.');
      }

      let syncedCount = 0;

      // Get or create local variable collections
      const collections = figma.variables.getLocalVariableCollections();
      let dcpCollection = collections.find(c => c.name === 'DCP Design Tokens');
      
      if (!dcpCollection) {
        dcpCollection = figma.variables.createVariableCollection('DCP Design Tokens');
      }

      // Sync color tokens
      const colorTokens = this.tokens.filter(t => t.type === 'color');
      for (const token of colorTokens) {
        await this.createOrUpdateVariable(dcpCollection, token, 'COLOR');
        syncedCount++;
      }

      // Sync spacing tokens as floats (for padding/margin)
      const spacingTokens = this.tokens.filter(t => t.category === 'spacing');
      for (const token of spacingTokens) {
        const numericValue = this.parseSpacingValue(token.value);
        if (numericValue !== null) {
          await this.createOrUpdateVariable(dcpCollection, token, 'FLOAT');
          syncedCount++;
        }
      }

      // Sync typography tokens as strings
      const typographyTokens = this.tokens.filter(t => t.category === 'typography');
      for (const token of typographyTokens) {
        await this.createOrUpdateVariable(dcpCollection, token, 'STRING');
        syncedCount++;
      }

      figma.ui.postMessage({
        type: 'tokens-synced',
        data: { count: syncedCount }
      });

    } catch (error) {
      console.error('Token sync failed:', error);
      figma.ui.postMessage({
        type: 'tokens-error',
        error: error instanceof Error ? error.message : 'Token sync failed'
      });
    }
  }

  // Validate selected layers against design system
  private async validateSelection() {
    try {
      const selection = figma.currentPage.selection;
      
      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'validation-results',
          data: []
        });
        return;
      }

      const results: ValidationResult[] = [];
      
      for (const node of selection) {
        const layerResults = await this.validateLayer(node);
        results.push(...layerResults);
      }

      figma.ui.postMessage({
        type: 'validation-results',
        data: results
      });

    } catch (error) {
      console.error('Validation failed:', error);
      figma.ui.postMessage({
        type: 'validation-error',
        error: error instanceof Error ? error.message : 'Validation failed'
      });
    }
  }

  // Validate entire current page
  private async validatePage() {
    try {
      const allNodes = figma.currentPage.findAll();
      const results: ValidationResult[] = [];
      
      // Limit to prevent performance issues
      const nodesToValidate = allNodes.slice(0, 100);
      
      for (const node of nodesToValidate) {
        const layerResults = await this.validateLayer(node);
        results.push(...layerResults);
      }

      figma.ui.postMessage({
        type: 'validation-results',
        data: results
      });

    } catch (error) {
      console.error('Page validation failed:', error);
      figma.ui.postMessage({
        type: 'validation-error',
        error: error instanceof Error ? error.message : 'Page validation failed'
      });
    }
  }

  // Validate individual layer
  private async validateLayer(node: SceneNode): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Skip certain node types
    if (node.type === 'GROUP' || node.type === 'FRAME') {
      return results;
    }

    // Validate fills (background colors)
    if ('fills' in node && node.fills) {
      const fillResults = this.validateFills(node);
      results.push(...fillResults);
    }

    // Validate text styles
    if (node.type === 'TEXT') {
      const textResults = this.validateTextNode(node);
      results.push(...textResults);
    }

    // Validate strokes (border colors)
    if ('strokes' in node && node.strokes) {
      const strokeResults = this.validateStrokes(node);
      results.push(...strokeResults);
    }

    return results;
  }

  // Validate fill colors against token registry
  private validateFills(node: SceneNode & { fills: readonly Paint[] }): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    for (const fill of node.fills) {
      if (fill.type === 'SOLID') {
        const color = this.rgbToHex(fill.color);
        const matchingToken = this.findTokenByValue(color, 'color');
        
        if (!matchingToken) {
          // Check if it's close to a known token
          const suggestions = this.findSimilarColorTokens(color);
          
          results.push({
            layerName: node.name,
            layerId: node.id,
            message: `Color ${color} not found in design tokens${suggestions.length > 0 ? '. Did you mean: ' + suggestions.join(', ') + '?' : ''}`,
            severity: 'warning',
            suggestions
          });
        }
      }
    }
    
    return results;
  }

  // Validate text properties
  private validateTextNode(node: TextNode): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Validate font size
    if (typeof node.fontSize === 'number') {
      const fontSize = `${node.fontSize}px`;
      const matchingToken = this.findTokenByValue(fontSize, 'typography');
      
      if (!matchingToken) {
        const suggestions = this.findSimilarTypographyTokens(node.fontSize);
        results.push({
          layerName: node.name,
          layerId: node.id,
          message: `Font size ${fontSize} not found in design tokens${suggestions.length > 0 ? '. Suggested sizes: ' + suggestions.join(', ') : ''}`,
          severity: 'info',
          suggestions
        });
      }
    }

    // Validate text color
    if (typeof node.fills === 'object' && node.fills.length > 0) {
      const textFills = this.validateFills(node as any);
      results.push(...textFills);
    }
    
    return results;
  }

  // Validate stroke colors
  private validateStrokes(node: SceneNode & { strokes: readonly Paint[] }): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    for (const stroke of node.strokes) {
      if (stroke.type === 'SOLID') {
        const color = this.rgbToHex(stroke.color);
        const matchingToken = this.findTokenByValue(color, 'color');
        
        if (!matchingToken) {
          const suggestions = this.findSimilarColorTokens(color);
          
          results.push({
            layerName: node.name,
            layerId: node.id,
            message: `Border color ${color} not found in design tokens${suggestions.length > 0 ? '. Did you mean: ' + suggestions.join(', ') + '?' : ''}`,
            severity: 'warning',
            suggestions
          });
        }
      }
    }
    
    return results;
  }

  // Helper methods
  private async fetchAPI(endpoint: string): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error - is the DCP API server running?');
      }
      throw error;
    }
  }

  private extractTokens(tokensObj: Record<string, any>): DCPToken[] {
    const tokens: DCPToken[] = [];
    
    Object.entries(tokensObj).forEach(([category, categoryTokens]) => {
      if (typeof categoryTokens === 'object' && categoryTokens !== null) {
        Object.entries(categoryTokens).forEach(([name, value]) => {
          tokens.push({
            name,
            value: typeof value === 'object' ? (value as any).value : String(value),
            type: typeof value === 'object' ? (value as any).type || 'unknown' : 'unknown',
            category,
            description: typeof value === 'object' ? (value as any).description : undefined
          });
        });
      }
    });
    
    return tokens;
  }

  private async createOrUpdateVariable(
    collection: VariableCollection,
    token: DCPToken,
    type: VariableResolvedDataType
  ) {
    // Check if variable already exists
    const existingVar = collection.variableIds.find(id => {
      const variable = figma.variables.getVariableById(id);
      return variable?.name === token.name;
    });

    let variable: Variable;
    
    if (existingVar) {
      variable = figma.variables.getVariableById(existingVar)!;
    } else {
      variable = figma.variables.createVariable(token.name, collection, type);
    }

    // Set description
    if (token.description) {
      variable.description = token.description;
    }

    // Set value based on type
    const modeId = collection.defaultModeId;
    
    switch (type) {
      case 'COLOR':
        const colorValue = this.parseColorValue(token.value);
        if (colorValue) {
          variable.setValueForMode(modeId, colorValue);
        }
        break;
      
      case 'FLOAT':
        const numericValue = this.parseSpacingValue(token.value);
        if (numericValue !== null) {
          variable.setValueForMode(modeId, numericValue);
        }
        break;
      
      case 'STRING':
        variable.setValueForMode(modeId, token.value);
        break;
    }
  }

  private parseColorValue(value: string): RGB | null {
    // Handle hex colors
    if (value.startsWith('#')) {
      return this.hexToRgb(value);
    }
    
    // Handle HSL colors
    if (value.startsWith('hsl')) {
      return this.hslToRgb(value);
    }
    
    // Handle RGB colors
    if (value.startsWith('rgb')) {
      return this.rgbStringToRgb(value);
    }
    
    return null;
  }

  private parseSpacingValue(value: string): number | null {
    // Parse rem, px, em values
    const match = value.match(/^(\d+(?:\.\d+)?)(rem|px|em)$/);
    if (match) {
      const num = parseFloat(match[1]);
      const unit = match[2];
      
      // Convert to pixels (assuming 16px = 1rem)
      switch (unit) {
        case 'rem':
          return num * 16;
        case 'px':
          return num;
        case 'em':
          return num * 16; // Approximate
        default:
          return num;
      }
    }
    
    // Try to parse as plain number
    const plainNumber = parseFloat(value);
    return isNaN(plainNumber) ? null : plainNumber;
  }

  private findTokenByValue(value: string, category?: string): DCPToken | null {
    return this.tokens.find(token => {
      const matches = token.value === value || this.normalizeValue(token.value) === this.normalizeValue(value);
      return matches && (category ? token.category === category : true);
    }) || null;
  }

  private findSimilarColorTokens(targetColor: string): string[] {
    const colorTokens = this.tokens.filter(t => t.type === 'color');
    
    // For now, just return first few color token names
    // TODO: Implement actual color distance calculation
    return colorTokens.slice(0, 3).map(t => t.name);
  }

  private findSimilarTypographyTokens(targetSize: number): string[] {
    const typographyTokens = this.tokens.filter(t => t.category === 'typography');
    
    // Find tokens with similar numeric values
    const suggestions: string[] = [];
    
    for (const token of typographyTokens) {
      const tokenValue = this.parseSpacingValue(token.value);
      if (tokenValue && Math.abs(tokenValue - targetSize) <= 4) {
        suggestions.push(`${token.name} (${token.value})`);
      }
    }
    
    return suggestions.slice(0, 3);
  }

  private normalizeValue(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '');
  }

  private rgbToHex(rgb: RGB): string {
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private hexToRgb(hex: string): RGB | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : null;
  }

  private hslToRgb(hsl: string): RGB | null {
    // Parse HSL string like "hsl(222, 47%, 11%)"
    const match = hsl.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
    if (!match) return null;

    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return { r, g, b };
  }

  private rgbStringToRgb(rgb: string): RGB | null {
    // Parse RGB string like "rgb(123, 45, 67)"
    const match = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (!match) return null;

    return {
      r: parseInt(match[1]) / 255,
      g: parseInt(match[2]) / 255,
      b: parseInt(match[3]) / 255
    };
  }
}

// Initialize plugin
new DCPPlugin();