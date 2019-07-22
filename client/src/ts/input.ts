import { mainCanvas } from "./rendering";

export let inputState = {
    pointerLocked: false,
    forwards: false,
    backwards: false,
    left: false,
    right: false,
    shift: false,
    spacebar: false
};

export let inputEventDispatcher = new EventTarget();

window.addEventListener("keydown", e => {
    let keyCode = e.keyCode;
    console.log(keyCode);    

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
        case 16: { // shift
            inputState.shift = true; 
        }; break;
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
        case 16: { // shift
            inputState.shift = false; 
        }; break;
    }
});

export function initCanvasListeners() {
    mainCanvas.addEventListener("click", () => {
        mainCanvas.requestPointerLock();
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
