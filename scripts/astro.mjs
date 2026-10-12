// Work around dependency resolvers treating a literal * in a directory as a wildcard.
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
const root = process.cwd();
const command = process.argv[2] || 'dev';
const staged = root.includes('*');
const working = staged ? mkdtempSync(join(tmpdir(), 'pheth-blog-')) : root;
if (staged) {
  console.log('Working around the * in the project path using a temporary build directory.');
  for (const name of ['src', 'public', 'node_modules', 'package.json', 'tsconfig.json', 'astro.config.mjs']) {
    cpSync(join(root, name), join(working, name), { recursive: true });
  }
  if (command === 'preview' && existsSync(join(root, 'dist'))) cpSync(join(root, 'dist'), join(working, 'dist'), {recursive:true});
  if (command === 'dev') console.log('This preview is a snapshot; restart after editing files.');
}
const child = spawn(process.execPath, [join(working, 'node_modules/astro/bin/astro.mjs'), command, ...process.argv.slice(3)], { cwd: working, stdio: 'inherit', env: {...process.env, ASTRO_TELEMETRY_DISABLED:'1'} });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => {
  if (staged && code === 0 && command === 'build') {
    rmSync(join(root, 'dist'), { recursive: true, force: true });
    cpSync(join(working, 'dist'), join(root, 'dist'), { recursive: true });
  }
  if (staged) rmSync(working, {recursive:true, force:true});
  process.exit(code ?? 1);
});
