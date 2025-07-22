import fs from 'fs';
import path from 'path';
import { JSONRPCServer } from 'json-rpc-2.0';
import { flatten } from './utils.js';

export function createRPCServer({ registryPath }) {
  const s = new JSONRPCServer();
  const load = p => JSON.parse(fs.readFileSync(path.join(registryPath, p), 'utf8'));

  s.addMethod('getComponent', ({ name }) => {
    const fp = `components/${name}.dcp.json`;
    return fs.existsSync(path.join(registryPath, fp)) ? load(fp) : null;
  });

  s.addMethod('listComponents', () =>
    fs.readdirSync(path.join(registryPath, 'components')).map(f => f.replace('.dcp.json', ''))
  );

  s.addMethod('listTokens', () => {
    const flat = flatten(load('tokens/theme.dcp.json').tokens);
    return Object.keys(flat);
  });

  return s;
}
