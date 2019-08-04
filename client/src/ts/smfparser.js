function degToRad(deg) {
    return deg / 180 * Math.PI;
}

function radToDeg(rad) {
    return rad / Math.PI * 180;
}

// Parser Script

const SUPPORTED_VERSIONS = ["v1", "v2"];

const literalParse = (string) => {
    if (string === "true" || string === "false") {
        return string === "true";
    }

    if (string.charAt(0) === '"') {
        let endChar = string.lastIndexOf('"');
        return string.slice(1, endChar);
    }

    return Number(string);
};

const parseOptions = (items) => {
    let options = {};

    items.forEach((string, i) => {
        if (string.startsWith("--")) {
            options[string.slice(2)] = literalParse(items[i + 1]);
        }
    });

    return options;
};

const parse = (file) => {
    let lp = literalParse;

    const lines = file.split("\n");

    // Verify and Acquire version

    let fileVersion;
    let fileVersionNumber;
    let firstLine = lines[0].trim();
    if (firstLine.startsWith("#! ")) {
        if (SUPPORTED_VERSIONS.includes(firstLine.slice(3))) {
            fileVersion = firstLine.slice(3);
            fileVersionNumber = Number(fileVersion.slice(1));
        } else {
            throw new Error("SMF Version not supported");
        }
    } else {
        throw new Error("Incorrect SMF Header");
    }

    // Get Metadata

    let metadata_counter = 0;

    let metadata = {};

    let sky = { color: 0x7ec0ee };
    let sun = { direction: { x: -40, y: -40, z: -50 }, color: 0xffffff, intensity: 1 };
    let ambience = { color: 0xffffff, intensity: 0.3 };

    let spawnPoints = []
    let powerUps = [];
    let objects = [];

    let wall = null;
    let wallMinX = 0;
    let wallMaxX = 0;
    let wallMinY = 0;
    let wallMaxY = 0;

    for (let i = 1; i < lines.length; ++i) {
        let line = lines[i];
        line = line.trim();

        if (!line) {
            continue;
        }

        if (line.startsWith("//")) {
            continue;
        }

        if (line.startsWith("---")) {
            metadata_counter++;
            continue;
        }

        if (metadata_counter === 1) {
            const colonIndex = line.indexOf(":");
            const name = line.slice(0, colonIndex);
            const value = lp(line.slice(colonIndex + 2));

            metadata[name] = value;
            continue;
        }

        if (metadata_counter === 2) {
            const items = line.split(" ");
            let obj = null;

            for (let j = 0; j < items.length; j++) {
                if (!items[j].trim()) {
                    items.splice(j--, 1);
                }
            }

            switch (items[0]) {
                case "Sky": {
                    sky.color = lp(items[1]);

                    obj = sky;
                }; break;
                case "Sun": {
                    sun.direction.x = lp(items[1]);
                    sun.direction.y = lp(items[2]);
                    sun.direction.z = lp(items[3]);
                    sun.color = lp(items[4]);
                    sun.intensity = lp(items[5]);

                    obj = sun;
                }; break;
                case "Ambience": {
                    ambience.color = lp(items[1]);
                    ambience.intensity = lp(items[2]);

                    obj = ambience;
                }; break;
                case "Spawn":
                    {
                        obj = {
                            x: lp(items[1]),
                            y: lp(items[2]),
                            z: lp(items[3]),
                            yaw: degToRad((lp(items[4])) || 0)
                        };
                        spawnPoints.push(obj);
                    }
                    break;

                case "Wall":
                    {
                        if (fileVersionNumber === 1) {
                            // OLD: Don't use directly.
                            obj = {
                                type: "wall",
                                position: {
                                    x: lp(items[1]),
                                    y: lp(items[2])
                                },
                                size: {
                                    x: lp(items[3]),
                                    y: lp(items[4])
                                }
                            };

                            wallMinX = Math.min(wallMinX, obj.position.x + obj.size.x);
                            wallMaxX = Math.max(wallMaxX, obj.position.x);
                            wallMinY = Math.min(wallMinY, obj.position.y + obj.size.y);
                            wallMaxY = Math.max(wallMaxY, obj.position.y);
                        } else {
                            if (wall === null) {
                                wall = {
                                    minX: lp(items[1]),
                                    maxX: lp(items[2]),
                                    minY: lp(items[3]),
                                    maxY: lp(items[4])
                                };
                            } else {
                                throw new Error("Can't have more than one Wall definition!");
                            }
                        }

                        continue;
                        
                        //objects.push(obj);
                    }
                    break;

                case "Box":
                    {
                        obj = {
                            type: "box",
                            position: {
                                x: lp(items[1]),
                                y: lp(items[2]),
                                z: lp(items[3])
                            },
                            size: {
                                x: lp(items[4]),
                                y: lp(items[5]),
                                z: lp(items[6])
                            }
                        };
                        objects.push(obj);
                    }
                    break;
                case "Ramp":
                    {
                        obj = {
                            type: "ramp",
                            position: {
                                x: lp(items[1]),
                                y: lp(items[2]),
                                z: lp(items[3])
                            },
                            size: {
                                x: lp(items[4]),
                                y: lp(items[5]),
                                z: lp(items[6])
                            },
                            orientation: lp(items[7])
                        };
                        objects.push(obj);
                    }
                    break;
                case "PowerUp":
                    {
                        obj = {
                            type: "powerUp",
                            position: {
                                x: lp(items[1]),
                                y: lp(items[2]),
                                z: lp(items[3])
                            },
                        };
                        powerUps.push(obj);
                    }
                    break;
            }

            obj.options = parseOptions(items);
        }
    }

    if (wall === null) {
        wall = {
            minX: wallMinX,
            maxX: wallMaxX,
            minY: wallMinY,
            maxY: wallMaxY
        };
    }

    return {
        metadata,
        spawnPoints,
        powerUps,
        objects,
        sky,
        sun,
        ambience,
        wall
    };
};

if (typeof module !== "undefined") {
    // We're in Node

    module.exports.parse = parse;
}