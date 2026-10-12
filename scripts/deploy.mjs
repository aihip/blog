import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
const root = process.cwd();
const staged = root.includes('*');
const working = staged ? mkdtempSync(join(tmpdir(), 'pheth-deploy-')) : root;
if (staged) {
  for (const name of ['dist', 'functions', 'wrangler.toml', 'node_modules']) cpSync(join(root, name), join(working, name), { recursive: true });
}
const child = spawn(process.execPath, [join(working, 'node_modules/wrangler/bin/wrangler.js'), 'pages', 'deploy', 'dist', '--project-name=pheth-blog', '--branch=main', '--commit-dirty=true'], { cwd: working, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => {
  if (staged) rmSync(working, { recursive: true, force: true });
  process.exit(code ?? 1);
});
