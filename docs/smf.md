# SMF (Snype Map File) Documentation

## Table of Contents

- [SMF (Snype Map File) Documentation](#smf-snype-map-file-documentation)
	- [Table of Contents](#table-of-contents)
	- [File Header](#file-header)
	- [Metadata](#metadata)
		- [Embedded options](#embedded-options)
	- [Objects](#objects)
		- [Spawn Point](#spawn-point)
		- [Wall](#wall)
		- [Box](#box)
		- [Option Flags](#option-flags)
	- [Comments](#comments)
	- [Example File](#example-file)

## File Header

Each .smf file's first line must denote the version of the file so that the parser can know that it is dealing with a compatible version.

The version is denoted with a shabang (`#!`) and version number seperated by a space. For example, all v1 .smf files start with this line:

```
#! v1
```

## Metadata

Any file metadata (options shown below) is stored between two lines containing a triple - (`---`). It must come before the object data in the file.

Example:

```
---
name: Example level
wallHeight: 4
---
```

### Embedded options

These are the different options you can embed into the metadata. The only required field is the name of the map. The rest of the options have defaults which are listed. You are permitted to add any other non listed metadata such as author and date here, they will be parsed and can later be targeted, but will serve no actual use to snype.

- `name`: The name of the map (**Required**)
- `wallHeight`: The height of the walls (**Default: 4**)
- `objectColor`: Default color of non-wall objects on the map (**Default: 0x2a2a2a**)

## Objects

This is the meat of the file. It contains the size and position data of every object on the stage.

### Spawn Point

A Spawn point denotes the coordinates of a valid spawnpoint in the map. These are randomly picked when spawning in players.

Syntax:

```
Spawn x y z
```

Example:

```
Spawn 0 0 0
```

### Wall

A wall is a basic box with static color and static height (see `wallHeight` in [embedded options](#embedded-options)). It is denoted with the position (x and y) followed with the size (x and y).

Syntax:

```
Wall position:x position:y size:x size:y
```

Example:

```
Wall 0 0 15 1
```

### Box

A box is a basic cuboid and is the basic building block of a snype map. Is denoted with the position (x, y and z) followed by the size (x, y and z).

Syntax:

```
Box position:x position:y position:z size:x size:y size:z
```

Example:

```
Box 2 3 0 3 1 2
```

### Option Flags

Optionally, you can add an option (or multiple) to an object with the following syntax:

```
--<option> <value>
```

Options:

- `color` (hex) Overrides global object color.

Example with option:

```
Box 2 3 0 3 1 2 --color 0xff0000
```

## Comments

Any lines that are only whitespace or have // as the first content are ignored.

```css
// SMF is comment friendly!!
```

## Example File

This is an example file that actually works for a very basic level "Level 1":

```
#! v1

---


name: "Level 1"
author: "Finbar Giusti"
wallHeight: 5
objectColor: 0x000000


---

// Spawns
Spawn 5 2 0
Spawn 14 3 0
Spawn 2 10 0
Spawn 11 10 0

// Walls
Wall 0 0 15 1
Wall 0 0 1 15
Wall 15 0 1 15
Wall 0 15 15 1

// Boxes
Box 2 3 0 3 1 2
Box 2 4 0 1 1 2
Box 10 2 0 3 1 2
Box 12 4 0 1 1 2
Box 9 5 0 4 1 2
Box 10 4 0 1 1 1 --color 0xffff00
Box 5 9 0 2 1 2
Box 3 10 0 4 1 2
Box 13 9 0 1 3 2
```
