"use strict";
(() => {
  // src/code.ts
  var DCPPlugin = class {
    constructor() {
      this.apiUrl = "";
      this.registry = null;
      this.tokens = [];
      figma.showUI(__html__, {
        width: 320,
        height: 600,
        title: "DCP Design System"
      });
      figma.ui.onmessage = this.handleMessage.bind(this);
    }
    async handleMessage(msg) {
      switch (msg.type) {
        case "connect":
          await this.connectToDCP(msg.apiUrl);
          break;
        case "sync-tokens":
          await this.syncTokens();
          break;
        case "validate-selection":
          await this.validateSelection();
          break;
        case "validate-page":
          await this.validatePage();
          break;
      }
    }
    // Connect to DCP API and load registry
    async connectToDCP(apiUrl) {
      var _a;
      try {
        this.apiUrl = apiUrl.replace(/\/$/, "");
        const healthResponse = await this.fetchAPI("/health");
        if (healthResponse.status !== "healthy" && healthResponse.status !== "degraded") {
          throw new Error(`API is ${healthResponse.status}`);
        }
        const registryResponse = await this.fetchAPI("/registry");
        this.registry = registryResponse;
        this.tokens = this.extractTokens(this.registry.tokens);
        figma.ui.postMessage({
          type: "connection-success",
          data: {
            componentsCount: ((_a = this.registry.components) == null ? void 0 : _a.length) || 0,
            tokensCount: this.tokens.length,
            apiHealth: healthResponse.status
          }
        });
      } catch (error) {
        console.error("Connection failed:", error);
        figma.ui.postMessage({
          type: "connection-error",
          error: error instanceof Error ? error.message : "Connection failed"
        });
      }
    }
    // Sync DCP tokens to Figma Variables
    async syncTokens() {
      try {
        if (!this.registry || this.tokens.length === 0) {
          throw new Error("No tokens available. Connect to DCP first.");
        }
        let syncedCount = 0;
        const collections = figma.variables.getLocalVariableCollections();
        let dcpCollection = collections.find((c) => c.name === "DCP Design Tokens");
        if (!dcpCollection) {
          dcpCollection = figma.variables.createVariableCollection("DCP Design Tokens");
        }
        const colorTokens = this.tokens.filter((t) => t.type === "color");
        for (const token of colorTokens) {
          await this.createOrUpdateVariable(dcpCollection, token, "COLOR");
          syncedCount++;
        }
        const spacingTokens = this.tokens.filter((t) => t.category === "spacing");
        for (const token of spacingTokens) {
          const numericValue = this.parseSpacingValue(token.value);
          if (numericValue !== null) {
            await this.createOrUpdateVariable(dcpCollection, token, "FLOAT");
            syncedCount++;
          }
        }
        const typographyTokens = this.tokens.filter((t) => t.category === "typography");
        for (const token of typographyTokens) {
          await this.createOrUpdateVariable(dcpCollection, token, "STRING");
          syncedCount++;
        }
        figma.ui.postMessage({
          type: "tokens-synced",
          data: { count: syncedCount }
        });
      } catch (error) {
        console.error("Token sync failed:", error);
        figma.ui.postMessage({
          type: "tokens-error",
          error: error instanceof Error ? error.message : "Token sync failed"
        });
      }
    }
    // Validate selected layers against design system
    async validateSelection() {
      try {
        const selection = figma.currentPage.selection;
        if (selection.length === 0) {
          figma.ui.postMessage({
            type: "validation-results",
            data: []
          });
          return;
        }
        const results = [];
        for (const node of selection) {
          const layerResults = await this.validateLayer(node);
          results.push(...layerResults);
        }
        figma.ui.postMessage({
          type: "validation-results",
          data: results
        });
      } catch (error) {
        console.error("Validation failed:", error);
        figma.ui.postMessage({
          type: "validation-error",
          error: error instanceof Error ? error.message : "Validation failed"
        });
      }
    }
    // Validate entire current page
    async validatePage() {
      try {
        const allNodes = figma.currentPage.findAll();
        const results = [];
        const nodesToValidate = allNodes.slice(0, 100);
        for (const node of nodesToValidate) {
          const layerResults = await this.validateLayer(node);
          results.push(...layerResults);
        }
        figma.ui.postMessage({
          type: "validation-results",
          data: results
        });
      } catch (error) {
        console.error("Page validation failed:", error);
        figma.ui.postMessage({
          type: "validation-error",
          error: error instanceof Error ? error.message : "Page validation failed"
        });
      }
    }
    // Validate individual layer
    async validateLayer(node) {
      const results = [];
      if (node.type === "GROUP" || node.type === "FRAME") {
        return results;
      }
      if ("fills" in node && node.fills) {
        const fillResults = this.validateFills(node);
        results.push(...fillResults);
      }
      if (node.type === "TEXT") {
        const textResults = this.validateTextNode(node);
        results.push(...textResults);
      }
      if ("strokes" in node && node.strokes) {
        const strokeResults = this.validateStrokes(node);
        results.push(...strokeResults);
      }
      return results;
    }
    // Validate fill colors against token registry
    validateFills(node) {
      const results = [];
      for (const fill of node.fills) {
        if (fill.type === "SOLID") {
          const color = this.rgbToHex(fill.color);
          const matchingToken = this.findTokenByValue(color, "color");
          if (!matchingToken) {
            const suggestions = this.findSimilarColorTokens(color);
            results.push({
              layerName: node.name,
              layerId: node.id,
              message: `Color ${color} not found in design tokens${suggestions.length > 0 ? ". Did you mean: " + suggestions.join(", ") + "?" : ""}`,
              severity: "warning",
              suggestions
            });
          }
        }
      }
      return results;
    }
    // Validate text properties
    validateTextNode(node) {
      const results = [];
      if (typeof node.fontSize === "number") {
        const fontSize = `${node.fontSize}px`;
        const matchingToken = this.findTokenByValue(fontSize, "typography");
        if (!matchingToken) {
          const suggestions = this.findSimilarTypographyTokens(node.fontSize);
          results.push({
            layerName: node.name,
            layerId: node.id,
            message: `Font size ${fontSize} not found in design tokens${suggestions.length > 0 ? ". Suggested sizes: " + suggestions.join(", ") : ""}`,
            severity: "info",
            suggestions
          });
        }
      }
      if (typeof node.fills === "object" && node.fills.length > 0) {
        const textFills = this.validateFills(node);
        results.push(...textFills);
      }
      return results;
    }
    // Validate stroke colors
    validateStrokes(node) {
      const results = [];
      for (const stroke of node.strokes) {
        if (stroke.type === "SOLID") {
          const color = this.rgbToHex(stroke.color);
          const matchingToken = this.findTokenByValue(color, "color");
          if (!matchingToken) {
            const suggestions = this.findSimilarColorTokens(color);
            results.push({
              layerName: node.name,
              layerId: node.id,
              message: `Border color ${color} not found in design tokens${suggestions.length > 0 ? ". Did you mean: " + suggestions.join(", ") + "?" : ""}`,
              severity: "warning",
              suggestions
            });
          }
        }
      }
      return results;
    }
    // Helper methods
    async fetchAPI(endpoint) {
      const url = `${this.apiUrl}${endpoint}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("fetch")) {
          throw new Error("Network error - is the DCP API server running?");
        }
        throw error;
      }
    }
    extractTokens(tokensObj) {
      const tokens = [];
      Object.entries(tokensObj).forEach(([category, categoryTokens]) => {
        if (typeof categoryTokens === "object" && categoryTokens !== null) {
          Object.entries(categoryTokens).forEach(([name, value]) => {
            tokens.push({
              name,
              value: typeof value === "object" ? value.value : String(value),
              type: typeof value === "object" ? value.type || "unknown" : "unknown",
              category,
              description: typeof value === "object" ? value.description : void 0
            });
          });
        }
      });
      return tokens;
    }
    async createOrUpdateVariable(collection, token, type) {
      const existingVar = collection.variableIds.find((id) => {
        const variable2 = figma.variables.getVariableById(id);
        return (variable2 == null ? void 0 : variable2.name) === token.name;
      });
      let variable;
      if (existingVar) {
        variable = figma.variables.getVariableById(existingVar);
      } else {
        variable = figma.variables.createVariable(token.name, collection, type);
      }
      if (token.description) {
        variable.description = token.description;
      }
      const modeId = collection.defaultModeId;
      switch (type) {
        case "COLOR":
          const colorValue = this.parseColorValue(token.value);
          if (colorValue) {
            variable.setValueForMode(modeId, colorValue);
          }
          break;
        case "FLOAT":
          const numericValue = this.parseSpacingValue(token.value);
          if (numericValue !== null) {
            variable.setValueForMode(modeId, numericValue);
          }
          break;
        case "STRING":
          variable.setValueForMode(modeId, token.value);
          break;
      }
    }
    parseColorValue(value) {
      if (value.startsWith("#")) {
        return this.hexToRgb(value);
      }
      if (value.startsWith("hsl")) {
        return this.hslToRgb(value);
      }
      if (value.startsWith("rgb")) {
        return this.rgbStringToRgb(value);
      }
      return null;
    }
    parseSpacingValue(value) {
      const match = value.match(/^(\d+(?:\.\d+)?)(rem|px|em)$/);
      if (match) {
        const num = parseFloat(match[1]);
        const unit = match[2];
        switch (unit) {
          case "rem":
            return num * 16;
          case "px":
            return num;
          case "em":
            return num * 16;
          default:
            return num;
        }
      }
      const plainNumber = parseFloat(value);
      return isNaN(plainNumber) ? null : plainNumber;
    }
    findTokenByValue(value, category) {
      return this.tokens.find((token) => {
        const matches = token.value === value || this.normalizeValue(token.value) === this.normalizeValue(value);
        return matches && (category ? token.category === category : true);
      }) || null;
    }
    findSimilarColorTokens(targetColor) {
      const colorTokens = this.tokens.filter((t) => t.type === "color");
      return colorTokens.slice(0, 3).map((t) => t.name);
    }
    findSimilarTypographyTokens(targetSize) {
      const typographyTokens = this.tokens.filter((t) => t.category === "typography");
      const suggestions = [];
      for (const token of typographyTokens) {
        const tokenValue = this.parseSpacingValue(token.value);
        if (tokenValue && Math.abs(tokenValue - targetSize) <= 4) {
          suggestions.push(`${token.name} (${token.value})`);
        }
      }
      return suggestions.slice(0, 3);
    }
    normalizeValue(value) {
      return value.toLowerCase().replace(/\s+/g, "");
    }
    rgbToHex(rgb) {
      const r = Math.round(rgb.r * 255);
      const g = Math.round(rgb.g * 255);
      const b = Math.round(rgb.b * 255);
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }
    hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      } : null;
    }
    hslToRgb(hsl) {
      const match = hsl.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
      if (!match)
        return null;
      const h = parseInt(match[1]) / 360;
      const s = parseInt(match[2]) / 100;
      const l = parseInt(match[3]) / 100;
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p2, q2, t) => {
          if (t < 0)
            t += 1;
          if (t > 1)
            t -= 1;
          if (t < 1 / 6)
            return p2 + (q2 - p2) * 6 * t;
          if (t < 1 / 2)
            return q2;
          if (t < 2 / 3)
            return p2 + (q2 - p2) * (2 / 3 - t) * 6;
          return p2;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      return { r, g, b };
    }
    rgbStringToRgb(rgb) {
      const match = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (!match)
        return null;
      return {
        r: parseInt(match[1]) / 255,
        g: parseInt(match[2]) / 255,
        b: parseInt(match[3]) / 255
      };
    }
  };
  new DCPPlugin();
})();
