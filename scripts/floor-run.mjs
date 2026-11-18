#!/usr/bin/env node
// Hook "Run" do andar no Maestri (botão play): sobe o app em modo de desenvolvimento.
// Configure no Maestri (Configurar hooks… → Run):  node scripts/floor-run.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { c, readJson } from './lib/util.mjs';

const floor = path.resolve(process.env.MAESTRI_FLOOR_PATH || process.cwd());
const pkg = readJson(path.join(floor, 'package.json'));
if (!pkg?.scripts?.dev) {
  console.log(c.yellow('! ainda não há o que rodar: o script `dev` do package.json nasce na tarefa da casca Tauri (marco 0).'));
  process.exit(0);
}
const pm = fs.existsSync(path.join(floor, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm';
const r = spawnSync(`${pm} run dev`, { cwd: floor, shell: true, stdio: 'inherit' });
process.exit(r.status ?? 1);
