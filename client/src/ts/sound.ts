export let playPop = (pos?: THREE.Vector3, offset?: number) => {
    let pop = new Howl({ src: ["/static/pop.wav"] });
    pop.rate(Math.random() * 0.4 + offset);
    pop.pannerAttr({
        rolloffFactor: 1,
        distanceModel: "inverse",
        maxDistance: 1000,
        panningModel: "HRTF",
        refDistance: 1
    });
    if (pos) pop.pos(pos.x, pos.y, pos.z);
    pop.play();
};