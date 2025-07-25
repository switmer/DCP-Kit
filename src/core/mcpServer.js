import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { createRPCServer } from './rpcRouter.js';

export function startMCPServer({ registryPath, port = 7400, enableMCP = false, auth }) {
  const app = express();
  const rpc = createRPCServer({ registryPath });

  /* --- optional API-key auth --- */
  if (auth) {
    app.use((req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token !== auth) return res.status(401).json({ error: 'Unauthorized' });
      next();
    });
  }

  app.use(bodyParser.json());
  app.post('/rpc', (req, res) => {
    rpc.receive(req.body).then(json => (json ? res.json(json) : res.status(204).end()));
  });

  /* MCP root */
  app.get('/context', (_, res) =>
    res.json({
      "@context": "https://modelcontext.org/v1",
      registry: "/context/registry",
      components: "/context/components",
      tokens: "/context/tokens",
      analytics: "/context/analytics",
      diffs: "/context/changes",
      capabilities: "/context/capabilities",
    })
  );

  /* static helpers */
  const sendJson = rel =>
    (_, res) => {
      const f = path.join(registryPath, rel);
      res.json(fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : { error: 404 });
    };

  app.get('/context/registry', sendJson('manifest.json'));
  app.get('/context/tokens', sendJson('tokens/theme.dcp.json'));
  app.get('/context/analytics', sendJson('token-usage-report.json'));
  app.get('/context/changes', sendJson('diff-report.json'));

  /* component list & detail */
  app.get('/context/components', (_, res) => {
    const list = fs.readdirSync(path.join(registryPath, 'components')).map(f => f.replace('.dcp.json', ''));
    res.json({ components: list });
  });
  app.get('/context/components/:name', (req, res) => {
    const f = path.join(registryPath, 'components', `${req.params.name}.dcp.json`);
    res.json(fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : { error: 404 });
  });

  /* browse UI (preview) */
  app.set('view engine', 'ejs');
  app.set('views', path.resolve('./views'));
  app.get('/browse', (_, res) => {
    const comps = fs.readdirSync(path.join(registryPath, 'components')).map(f =>
      JSON.parse(fs.readFileSync(path.join(registryPath, 'components', f)))
    );
    res.render('index', { components: comps });
  });

  app.listen(port, () => console.log(`🧠 MCP server on http://localhost:${port}/context`));
}
