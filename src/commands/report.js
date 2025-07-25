import fs from 'fs';
import path from 'path';
import { readJSON, getAllFiles } from '../core/utils.js';

export function generateTokenReport() {
  const theme = readJSON('./dcp-registry/tokens/theme.dcp.json');
  const usage = {};
  getAllFiles('./dcp-registry/components').forEach(f => {
    const c = readJSON(`./dcp-registry/components/${f}`);
    Object.values(c.tokensUsed || {}).forEach(t => {
      usage[t] = usage[t] || [];
      usage[t].push(c.name);
    });
  });
  fs.writeFileSync('./dcp-registry/token-usage-report.json', JSON.stringify(usage, null, 2));
  console.log('📊 token-usage-report.json created');
}
