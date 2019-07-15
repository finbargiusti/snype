const http = require("http");
const serveStatic = require("serve-static");
const url = require("url");

const serve = serveStatic(__dirname + "/../client/dist", {
  setHeaders(res) {
    // For now. Caching is evil!
    res.setHeader("Cache-Control", "no-cache");
  }
});

const PORT = 20003;
function createHTTPServer() {
  let httpServer = http.createServer();
  httpServer.listen(PORT);

  httpServer.on("request", (request, response) => {
    let urlObj = url.parse(request.url, { parseQueryString: true });

    response.setHeader("Access-Control-Allow-Origin", "*");

    if (false) {
      // Don't question me
    } else {
      serve(request, response, () => {
        response.writeHead(404);
        response.end("404");
      });
    }
  });

  //(httpServer);

  console.log("HTTP server created and listening on port " + PORT);
}

exports.createHTTPServer = createHTTPServer;
