const http = require("http");
const serveStatic = require("serve-static");
const url = require("url");
const ws = require("ws");

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

  let socketServer = new ws.Server({ server: httpServer });
  let sockets = [];

  socketServer.on("connection", socket => {
    sockets.push(socket);
    socket.on("message", msg => {
      sockets.forEach(sendSocket => {
        if (socket !== sendSocket) {
          sendSocket.send(msg);
        }
      });
    });
  });
  //(httpServer);

  console.log("HTTP server created and listening on port " + PORT);
}

exports.createHTTPServer = createHTTPServer;
