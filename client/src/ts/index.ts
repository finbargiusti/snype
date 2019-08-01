import "./rendering";
import "./net";
import { parse } from "./smfparser.js";
import { SnypeMap } from "./map";
import { gameState } from "./game_state";
import { createLocalPlayer, players } from "./player";
import { openSocket, socketSend, socket } from "./net";
import { initEditor } from "./editor";
import { mainCanvas } from "./rendering";

let gameEl = document.querySelector(".game") as HTMLElement;

let loadLevel = async (url: any) => {
    gameEl.style.filter = "";

    let response = await fetch(url);
    let text = await response.text();

    let rawSMFData = parse(text);

    let newMap = new SnypeMap(rawSMFData);

    gameState.currentMap = newMap;

    createLocalPlayer();
    if (!gameState.isEditor) {
        socketSend("connect", {
            playerId: gameState.localPlayer.id,
            mapUrl: url
        });
        gameState.localPlayer.spawn();
    } else {
        initEditor();
    }
};

let listMaps = async (url: any) => {
    gameEl.style.filter = "blur(30px)";
    let mapEl = document.getElementById("maps") as HTMLDivElement;
    mapEl.style.display = "block";
    let response = await fetch(url);
    let text = await response.text();

    let maps = JSON.parse(text);

    mapEl.querySelectorAll("p").forEach(child => {
        mapEl.removeChild(child);
    });

    maps.forEach((map: any) => {
        let button = document.createElement("p");
        button.innerText = `${map.metadata.name} by ${map.metadata.author ||
            "anon"}`;
        button.onclick = () => {
            mapEl.style.display = "none";
            loadLevel(map.path);
        };
        mapEl.appendChild(button);
    });
};

let init = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    let isEditor = urlParams.get("editor") === "true";
    gameState.isEditor = isEditor;

    if (isEditor) {
        await loadLevel("static/platforms.smf");
        initEditor();
        return;
    }

    listMaps("/defaultmaps");
    openSocket();
};

let leaveLobby = async () => {
    gameState.currentMap = null;
    players.clear();
    gameState.localPlayer = null;
    socketSend("leave", {});
    listMaps("/defaultmaps");
};

document.getElementById("leave").addEventListener("mousedown", leaveLobby);

window.addEventListener("load", init);
