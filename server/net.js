const http = require("http");
const serveStatic = require("serve-static");
const url = require("url");
const pather = require("path");
const ws = require("ws");
const { parse } = require("../client/src/ts/smfparser");
const fs = require("fs");

const serve = serveStatic(__dirname + "/../client/dist", {
    setHeaders(res) {
        // For now. Caching is evil!
        res.setHeader("Cache-Control", "no-cache");
    }
});

const localServe = serveStatic(__dirname, {
    setHeaders(res) {
        res.setHeader("Cache-Control", "no-cache");
    }
});

let routes = {};

routes["/defaultmaps"] = (request, response) => {
    let defaultMaps = fs.readdirSync(
        pather.resolve(__dirname + "/maps/default")
    );

    defaultMaps = defaultMaps.map(path => {
        return {
            metadata: parse(
                fs
                    .readFileSync(
                        pather.resolve(__dirname + `/maps/default/${path}`)
                    )
                    .toString()
            ).metadata,
            path: "/maps/default/" + path
        };
    });

    response.writeHead(200);
    response.end(JSON.stringify(defaultMaps));
};

const PORT = 20003;
function createHTTPServer() {
    let httpServer = http.createServer();
    httpServer.listen(PORT);

    httpServer.on("request", (request, response) => {
        let urlObj = url.parse(request.url, { parseQueryString: true });

        response.setHeader("Access-Control-Allow-Origin", "*");

        if (Object.keys(routes).includes(urlObj.path)) {
            routes[urlObj.path](request, response);
        } else if (urlObj.path.startsWith("/maps/")) {
            localServe(request, response, () => {
                response.writeHead(404);
                response.end("404");
            });
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

    players.forEach(a => {
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

            removePlayer(socket);
        }
    });

    console.log("Fired up the WS server.");
}

let removePlayer = socket => {
    let player = socketPlayerAssociation.get(socket);
    if (player) {
        players.delete(player);

        sockets.forEach(socket2 => {
            socketSend(socket2, "removePlayer", {
                id: player.id
            });
        });
    }
};

socketMessageHandlers["leave"] = function(socket, data) {
    removePlayer(socket);
};

socketMessageHandlers["connect"] = function(socket, data) {
    let newPlayer = new Player(data.playerId);
    newPlayer.mapUrl = data.mapUrl;
    newPlayer.socket = socket;
    newPlayer.init();

    players.add(newPlayer);
    socketPlayerAssociation.set(socket, newPlayer);

    players.forEach(playa => {
        if (playa === newPlayer || playa.mapUrl !== newPlayer.mapUrl) return;
        socketSend(socket, "addPlayer", formatPlayer(playa));
    });
};

class Player {
    constructor(id) {
        this.id = id;
        this.mapUrl = "";
        this.socket = null;
        this.position = { x: 5, y: 5, z: 0 };
        this.health = 100;
    }

    init() {
        // Something.

        this.broadcastAll();
    }

    broadcastAll() {
        players.forEach(player => {
            if (this === player || this.mapUrl !== player.mapUrl) return;

            socketSend(player.socket, "addPlayer", formatPlayer(this));
        });
    }

    isDead() {
        return this.health <= 0;
    }

    dealDamage(dmg, source) {
        if (this.isDead()) return; // Can't deal damage to a dead man.
        if (dmg <= 0) return;

        this.health -= dmg;
        if (this.health < 0) this.health = 0;

        socketSend(this.socket, "updateHealth", {
            health: this.health
        });

        if (this.isDead()) {
            sockets.forEach(socket => {
                socketSend(socket, "death", {
                    playerId: this.id,
                    source: {
                        type: "player",
                        id: source.id
                    }
                });
            });

            setTimeout(() => {
                this.health = 100;

                sockets.forEach(socket => {
                    socketSend(socket, "respawn", {
                        playerId: this.id
                    });
                });
            }, 2000);
        }
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
    players.forEach(targetPlayer => {
        if (targetPlayer === player || player.mapUrl !== targetPlayer.mapUrl)
            return;

        socketSend(targetPlayer.socket, "updatePlayer", playerUpdateData);
    });
};

socketMessageHandlers["createProjectile"] = function(socket, data) {
    let player = socketPlayerAssociation.get(socket);
    // Simply relay to all other players.

    players.forEach(targetPlayer => {
        if (targetPlayer === player || player.mapUrl !== targetPlayer.mapUrl)
            return;

        data.shooterId = player.id;

        socketSend(targetPlayer.socket, "createProjectile", data);
    });
};

socketMessageHandlers["removeProjectile"] = function(socket, data) {
    let player = socketPlayerAssociation.get(socket);
    // Simply relay to all other players.

    players.forEach(targetPlayer => {
        if (targetPlayer === player || player.mapUrl !== targetPlayer.mapUrl)
            return;

        socketSend(targetPlayer.socket, "removeProjectile", data);
    });
};

socketMessageHandlers["playerHit"] = function(socket, data) {
    let player = getPlayerById(data.id);
    if (player) {
        // We assume here they didn't shoot themselves.
        // Just tell the player they've been hit.

        let culprit = socketPlayerAssociation.get(socket);

        socketSend(player.socket, "hit", {
            damage: data.damage,
            culprit: culprit.id
        });

        player.dealDamage(data.damage, culprit);
    }
};

exports.createHTTPServer = createHTTPServer;
