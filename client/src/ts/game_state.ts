import type { SnypeMap } from "./map";
import type { Player } from "./player";

export const gameState: 
    {
    currentMap: SnypeMap,
    localPlayer: Player,
    isEditor: boolean
    } = {
    currentMap: null,
    localPlayer: null,
    isEditor: false
};
