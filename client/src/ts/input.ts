import { getLocalPlayer, isGrounded } from "./player";
import { mainCanvas } from "./rendering";

export let inputState = {
    forwards: false,
    backwards: false,
    left: false,
    right: false,
    shift: false
};

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
                if (isGrounded()) {
                    getLocalPlayer().velocity.z = 5;
                }
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
        if (pointerLocked === false) return;

        let x = e.movementX;
        let y = e.movementY;

        let localPlayer = getLocalPlayer();

        localPlayer.yaw += -x / 1000;
        localPlayer.pitch += -y / 1000;
        localPlayer.pitch = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, localPlayer.pitch)
        );
    });

    document.addEventListener("pointerlockchange", lockChangeAlert, false);

    let pointerLocked = false;
    function lockChangeAlert() {
        if (document.pointerLockElement === mainCanvas) {
            console.log("The pointer lock status is now locked");
            pointerLocked = true;
            //document.addEventListener("mousemove", updatePosition, false);
        } else {
            console.log("The pointer lock status is now unlocked");
            pointerLocked = false;
            //document.removeEventListener("mousemove", updatePosition, false);
        }
    }
}
