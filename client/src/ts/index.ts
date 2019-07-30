import "./rendering";
import "./net";
import { parse } from "./smfparser.js";
import { SnypeMap } from "./map";
import { gameState } from "./game_state";
import { createLocalPlayer } from "./player";
import { openSocket, socketSend } from "./net";
import { initEditor } from "./editor";

let loadLevel = async (url: any) => {
    const urlParams = new URLSearchParams(window.location.search);
    let isEditor = urlParams.get("editor") === "true";

    gameState.isEditor = isEditor;

    let response = await fetch(url);
    let text = await response.text();

    let rawSMFData = parse(text);
    console.log(rawSMFData);

    let newMap = new SnypeMap(rawSMFData);
    console.log(newMap);

    gameState.currentMap = newMap;

    createLocalPlayer();
    if (!isEditor) {
        socketSend("connect", {
            playerId: gameState.localPlayer.id,
            mapUrl: url
        });
        gameState.localPlayer.spawn();
    }

    if (isEditor) {
        initEditor();
    }
};

let listMaps = async (url: any) => {
    let mapEl = document.getElementById("maps") as HTMLDivElement;
    mapEl.style.display = "block";
    let response = await fetch(url);
    let text = await response.text();

    let maps = JSON.parse(text);

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
    listMaps("/defaultmaps");
    openSocket();
};

init();
