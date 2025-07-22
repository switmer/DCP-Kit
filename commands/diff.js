import fs from 'fs';
import path from 'path';
import { readJSON } from '../core/utils.js';

export function diffRegistries({ from = './v1', to = './v2' }) {
  const list = p => fs.readdirSync(path.join(p, 'components')).filter(x => x.endsWith('.json'));
  const fromFiles = list(from);
  const toFiles = list(to);

  const added = toFiles.filter(f => !fromFiles.includes(f));
  const removed = fromFiles.filter(f => !toFiles.includes(f));

  added.forEach(a => console.log('🟢 Added:', a));
  removed.forEach(r => console.log('🔴 Removed:', r));
}
