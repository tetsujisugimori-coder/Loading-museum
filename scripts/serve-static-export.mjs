// Local acceptance server, using the same buffered response strategy as the
// current main's practical/Then & Now probes. Prints one URL for its caller.
import {createServer} from 'node:http';
import {readFile, realpath} from 'node:fs/promises';
import path from 'node:path';
const root = await realpath(process.argv[2] || 'out');
const types = {'.js':'text/javascript', '.css':'text/css', '.html':'text/html',
  '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml',
  '.woff2':'font/woff2', '.ico':'image/x-icon'};
const server = createServer(async (request, response) => {
  try {
    let relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      .replace(/^\/Loading-museum(?=\/)/, '');
    if (relative.endsWith('/')) relative += 'index.html';
    const file = await realpath(path.resolve(root, '.' + relative));
    if (!file.startsWith(root + path.sep)) throw Error('outside export');
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch {
    response.statusCode = 404;
    response.end('missing');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
console.log(`http://127.0.0.1:${server.address().port}/Loading-museum/`);
