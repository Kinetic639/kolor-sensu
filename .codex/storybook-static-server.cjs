const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve("apps/storybook/storybook-static");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };

http.createServer((request, response) => {
  const requested = decodeURIComponent((request.url ?? "/").split("?")[0]);
  const relative = requested === "/" ? "index.html" : requested.replace(/^\//, "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(root)) { response.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404).end(); return; }
    response.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
    response.end(data);
  });
}).listen(6006, "127.0.0.1");
