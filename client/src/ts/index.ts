import "./rendering";
import "./net";
import { parse } from "./smfparser.js";
import { SnypeMap } from "./map";
import { gameState } from "./game_state";
import { createLocalPlayer } from "./player";
import { openSocket } from "./net";
import { initEditor } from "./editor";

async function loadLevel(url: any) {
    const urlParams = new URLSearchParams(window.location.search)
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
    if (!isEditor) openSocket();

    if (isEditor) {
        initEditor();
    }
}

async function init() {
    await loadLevel("/static/platforms.smf");
}

init();
