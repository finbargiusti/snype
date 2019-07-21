// Parser Script

const SUPPORTED_VERSIONS = ["v1"];

const literalParse = (string: string) => {
  if (string === "true" || string === "false") {
    return string === "true";
  }

  if (string.charAt(0) === '"') {
    let endChar = string.lastIndexOf('"');
    return string.slice(1, endChar);
  }

  return Number(string);
};

const parseOptions = (items: string[]) => {
  let options = {};

  items.forEach((string, i) => {
    if (string.startsWith("--")) {
      options[string.slice(2)] = literalParse(items[i + 1]);
    }
  });

  return options;
};

export const parse = (file: string) => {
  let lp = literalParse;

  const lines = file.split("\n");

  // Verify and Acquire version

  let fileVersion: string;
  if (lines[0].startsWith("#! ")) {
    if (SUPPORTED_VERSIONS.includes(lines[0].slice(3))) {
      fileVersion = lines[0].slice(3);
    } else {
      throw new Error("SMF Version not supported");
    }
  } else {
    throw new Error("Incorrect SMF Header");
  }

  // Get Metadata

  let metadata_counter = 0;

  let metadata = {};

  let spawnPoints = [];

  let objects = [];

  for (let i = 1; i < lines.length; ++i) {
    let line = lines[i];

    if (!line.trim()) {
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

      switch (items[0]) {
        case "Spawn":
          {
            obj = {
              x: lp(items[1]),
              y: lp(items[2]),
              z: lp(items[3])
            };
            spawnPoints.push(obj);
          }
          break;

        case "Wall":
          {
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
            objects.push(obj);
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
      }

      obj["options"] = parseOptions(items);
    }
  }

  return {
    metadata,
    spawnPoints,
    objects
  };
};
