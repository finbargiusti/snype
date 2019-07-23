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

    console.log("HTTP server created and listening on port " + PORT);

    createWebSocketServer(httpServer);
}

let sockets = new Set();
let socketMessageHandlers = {};
let players = new Set();
let socketPlayerAssociation = new WeakMap();

function getPlayerById(id) {
    let player = null;

    players.forEach((a) => {
        if (a.id === id) player = a;
    });

    return player;
}

function createWebSocketServer(httpServer) {
    let socketServer = new ws.Server({ server: httpServer });

    socketServer.on("connection", socket => {
        console.log("Socket connected.");

        sockets.add(socket);

        socket.on("message", msg => {
            let json;

            try {
                json = JSON.parse(msg);
            } catch (e) {
                console.error("JSON parse error: ", e);
                return;
            }

            if (!json.command) {
                console.error("Socket message needs a command!");
                return;
            }

            let handler = socketMessageHandlers[json.command];
            if (handler) {
                handler(socket, json.data);
            } else {
                console.warn("Received unhandled command: " + json.command);
            }
        });

        socket.on("close", () => {
            console.log("Socket disconnected.");
            close();
        });

        socket.on("error", e => {
            console.log("Socket error.", e);
            close();
        });

        // Catch the deep error
        socket._socket.on("error", e => {
            //console.log("Socket deep error.", e);
            close();
        });

        function close() {
            sockets.delete(socket);

            let player = socketPlayerAssociation.get(socket);
            if (player) {
                players.delete(player);

                sockets.forEach(socket2 => {
                    socketSend(socket2, "removePlayer", {
                        id: player.id
                    });
                });
            }
        }
    });

    console.log("Fired up the WS server.");
}

socketMessageHandlers["connect"] = function(socket, data) {
    let newPlayer = new Player(data.playerId);
    newPlayer.socket = socket;
    newPlayer.init();

    players.add(newPlayer);
    socketPlayerAssociation.set(socket, newPlayer);

    players.forEach(playa => {
        socketSend(socket, "addPlayer", formatPlayer(playa));
    });
};

class Player {
    constructor(id) {
        this.id = id;
        this.socket = null;
        this.position = { x: 5, y: 5, z: 0 };
    }

    init() {
        // Something.

        this.broadcastAll();
    }

    broadcastAll() {
        sockets.forEach(socket2 => {
            if (this.socket === socket2) return;

            socketSend(socket2, "addPlayer", formatPlayer(this));
        });
    }
}

function socketSend(socket, command, data) {
    if (socket.readyState !== 1) return;

    socket.send(JSON.stringify({ command, data }));
}

function formatPlayer(obj) {
    let result = {};

    if (obj.id) result.id = obj.id;
    if (obj.position) result.position = obj.position;

    return result;
}

socketMessageHandlers["updatePosition"] = function(socket, data) {
    let player = socketPlayerAssociation.get(socket);
    if (!player) {
        console.error("You are big gay.");
        return;
    }

    player.position.x = data.position.x;
    player.position.y = data.position.y;
    player.position.z = data.position.z;

    let playerUpdateData = { id: player.id, position: player.position };
    sockets.forEach(socket2 => {
        if (socket === socket2) return;

        socketSend(socket2, "updatePlayer", playerUpdateData);
    });
};

socketMessageHandlers["createProjectile"] = function(socket, data) {
    // Simple relay to all other players.

    sockets.forEach((socket2) => {
        if (socket === socket2) return;

        socketSend(socket2, "createProjectile", data);
    });
};

socketMessageHandlers["removeProjectile"] = function(socket, data) {
    // Simple relay to all other players.

    sockets.forEach((socket2) => {
        if (socket === socket2) return;

        socketSend(socket2, "removeProjectile", data);
    });
};

socketMessageHandlers["playerHit"] = function(socket, data) {
    let player = getPlayerById(data.id);
    if (player) {
        // We assume here they didn't shoot themselves.
        // Just tell the player they've been hit.
        socketSend(player.socket, "hit", {});
    }
};

exports.createHTTPServer = createHTTPServer;