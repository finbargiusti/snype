import { mainCanvas } from "./rendering";
import { createLocalPlayer } from "./player";
import { gameState } from "./game_state";

export let inputState = {
    pointerLocked: false,
    forwards: false,
    backwards: false,
    left: false,
    right: false,
    shift: false,
    spacebar: false,
    primaryMb: false,
    secondaryMb: false
};

export let inputEventDispatcher = new EventTarget();

window.addEventListener("keydown", e => {
    let keyCode = e.keyCode;
    //console.log(keyCode);
    inputEventDispatcher.dispatchEvent(new KeyboardEvent(e.type, e));

    switch (keyCode) {
        case 87:
            {
                inputState.forwards = true;
            }
            break;
        case 83:
            {
                inputState.backwards = true;
            }
            break;
        case 65:
            {
                inputState.left = true;
            }
            break;
        case 68:
            {
                inputState.right = true;
            }
            break;
        case 32:
            {
                inputState.spacebar = true;
            }
            break;
        case 16:
            {
                // shift
                inputState.shift = true;
            }
            break;
        case 81: {
            
        }
    }
});

window.addEventListener("keyup", e => {
    let keyCode = e.keyCode;

    switch (keyCode) {
        case 87:
            {
                inputState.forwards = false;
            }
            break;
        case 83:
            {
                inputState.backwards = false;
            }
            break;
        case 65:
            {
                inputState.left = false;
            }
            break;
        case 68:
            {
                inputState.right = false;
            }
            break;
        case 32:
            {
                inputState.spacebar = false;
            }
            break;
        case 16:
            {
                // shift
                inputState.shift = false;
            }
            break;
    }
});

window.addEventListener("mousedown", e => {
    //if (!inputState.pointerLocked) return;

    if (e.button === 0) {
        inputState.primaryMb = true;
    }
    if (e.button === 2) {
        inputState.secondaryMb = true;
    }

    inputEventDispatcher.dispatchEvent(new MouseEvent(e.type, e));
});

window.addEventListener("mouseup", e => {
    if (e.button === 0) {
        inputState.primaryMb = false;
    }

    if (e.button === 2) {
        inputState.secondaryMb = false;
    }

    inputEventDispatcher.dispatchEvent(new MouseEvent(e.type, e));
});

export function initCanvasListeners() {
    mainCanvas.addEventListener("click", () => {
        if (!gameState.isEditor) mainCanvas.requestPointerLock();
    });

    mainCanvas.addEventListener("mousemove", e => {
        inputEventDispatcher.dispatchEvent(new MouseEvent(e.type, e));
    });

    document.addEventListener("pointerlockchange", lockChangeAlert, false);

    function lockChangeAlert() {
        if (document.pointerLockElement === mainCanvas) {
            //console.log("The pointer lock status is now locked");
            inputState.pointerLocked = true;
            //document.addEventListener("mousemove", updatePosition, false);
        } else {
            //console.log("The pointer lock status is now unlocked");
            inputState.pointerLocked = false;
            //document.removeEventListener("mousemove", updatePosition, false);
        }
    }
}
