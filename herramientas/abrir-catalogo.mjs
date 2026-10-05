// SPDX-License-Identifier: MIT
// Abre catalogo/index.html en el navegador predeterminado (Windows, macOS o Linux). No usa red ni servidor.
import { spawn } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pagina = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'catalogo', 'index.html');
const [cmd, args] =
  process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', pagina]] : process.platform === 'darwin' ? ['open', [pagina]] : ['xdg-open', [pagina]];
spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
console.log(`catalogo: ${pagina}`);
