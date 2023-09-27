
class MapTile {
    #value = 0;
    #position = { x: 0, y: 0 };
    /**
     * 
     * @param {number} value
     * @param {{x: number, y: number }} position
     */
    constructor(value, position) {
        this.#value = value || 0;
        this.#position = position || { x: 4, y: 4 };
    }

    get up() { return this.#value % 2 == 1 }
    get down() { return this.#value % 5 == 1 }
    get left() { return this.#value % 7 == 1 }
    get right() { return this.#value % 3 == 1 }
    get spawn() { return this.#value > 249 && this.#value < 500 }
    get pot() { return this.#value >= 500 && this.#value < 750 }
    get defender() { return this.#value >= 750 && this.#value < 999 }
    get troom() { return this.#value == 126 }
    get border() { return this.#value == 1 }
    get splits() { return 0 + this.up + this.down + this.right + this.left }
    get x() { return this.#position.x }
    get y() { return this.#position.y }
    get value() { return this.#value }

    equals(t2) {
        return this.up == t2.up &&
               this.down == t2.down &&
               this.left == t2.left &&
               this.right == t2.right &&
               this.spawn == t2.spawn &&
               this.pot == t2.pot &&
               this.defender == t2.defender &&
               this.border == t2.border &&
               this.splits == t2.splits;
    }
    serialize() {
        if (this.border) return 25;
        if (!this.splits) return 0;
        if (this.troom) return 16;
        if (this.defender) return 17 + [this.up, this.right, this.down, this.left].findIndex(i => i);
        if (this.pot) return 21 + [this.up, this.right, this.down, this.left].findIndex(i => i);
        return (this.spawn ? 40 : 0) + (this.left << 3) | (this.down << 2) | (this.right << 1) | this.up;
    }

    static deserialize(byte, x, y) {
        if (byte == 0) return new MapTile(0, { x, y });
        if (byte == 16) return new MapTile(126, { x, y });
        if (byte == 25) return new MapTile(1, { x, y });
        if ([17, 18, 19, 20].includes(byte)) { 
            const [up, right, down, left] = [17, 18, 19, 20].map(v => v == byte);
            return new MapTile(MapTile.getRoomNumber(up, right, down, left, false, false, true), { x, y });
        }
        if ([21, 22, 23, 24].includes(byte)) {
            const [up, right, down, left] = [21, 22, 23, 24].map(v => v == byte);
            return new MapTile(MapTile.getRoomNumber(up, right, down, left, false, true, false), { x, y });
        }
        let spawn = false;
        if (byte > 40) {
            byte -= 40;
            spawn = true;
        }
        const [up, right, down, left] = [0b0001, 0b0010, 0b0100, 0b1000].map((v) => Boolean(byte & v))
        return new MapTile(MapTile.getRoomNumber(up, right, down, left, spawn, false, false), { x, y });
    }

    static getRoomNumber(up, right, down, left, spawn, pots, defender) {
        let startn;
        let num = 0;
        if (up) { startn = 1; } else { startn = 0; }
        for (let i = startn; i < 250; i += 2) {

            if (((i % 2 == 1 && up) || (i % 2 == 0 && !up)) && ((i % 3 == 1 && right) || (i % 3 == 0 && !right)) && ((i % 5 == 1 && down) || (i % 5 == 0 && !down)) && ((i % 7 == 1 && left) || (i % 7 == 0 && !left))) {
                num = i;
                break;
            }
        }
        let limit = 0;
        if (spawn) { limit = 250; }
        if (pots) { limit = 500; }
        if (defender) { limit = 750; }
        while (num < limit) { num += 210; }
        if (num == 1) { num += 210; }
        return num;
    }
}
const WIDTH = 9;
const LENGTH = 9;
const pos = (x, y) =>{
    if (x >= WIDTH || x < 0 || y >= WIDTH || y < 0) return false;
    return x * WIDTH + y;
} 
const above = (x, y) => pos(x, y - 1);
const below = (x, y) => pos(x, y + 1);
const toLeft = (x, y) => pos(x - 1, y);
const toRight = (x, y) => pos(x + 1, y);
const point = (position) => ({ 
    x: (position - position % WIDTH) / WIDTH,
    y: position % WIDTH
})
const rotate = (arr) => {
    let map2 = [];
    for (let x = 0; x < 9; x++) {
        let row = [];
        for (let y = 0; y < 9; y++) {
            row.push(arr[y * WIDTH + x]);
        }
        map2.push(row);
    }
    return map2;
}
function serialize(map) {

    map = rotate(map);

    let arr = map.flat().map(v => String.fromCharCode(v.serialize() + 65));
    let out = [];
    while (arr.length) {
        let count = 1;
        let char = arr.shift();
        while (arr.length && arr[0] == char) {
            count++;
            arr.shift();
        }
        if (count > 1) out.push(count);
        out.push(char);
    }
    return out.join('');
}

const obj = {
    MapTile,
    serialize,
    point,
    make: function() {
        function shuffle(array) {
            let current, top = array.length;

            if(top) while(--top) {
                current = Math.floor(Math.random() * (top + 1));
                [array[current], array[top]] = [array[top], array[current]];
            }

            return array;
        }

        const IDS = {
            empty: 0,
            spawn: 1,
            troom: 2,
            defender: 3,
            pot: 4,
            loopTopLeft: 5,
            loopTopRight: 6,
            loopBottomLeft: 7,
            loopBottomRight: 8,
            room: 9,
        }

        Object.keys(IDS).forEach(key => IDS[IDS[key]] = key);

        const firstPassRules = {
            spawn: {
                any: [ 'room' ],
                up: [ 'loopBottomLeft', 'loopBottomRight' ],
                down: [ 'loopTopLeft', 'loopTopRight' ],
                left: [ 'loopTopRight', 'loopBottomRight' ],
                right: [ ]
            }
        }
        const directions = {
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 },
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 }
        }

        const reverse_direction = {
            left: 'right',
            up: 'down',
            right: 'left',
            down: 'up'
        }





        const placeMBC = (x, y) => {
            const room = pos(x, y); //66: 7,3

            const sides = [
                { direction: 'left', center: pos(x - 2, y) },
                { direction: 'right', center: pos(x + 2, y) },
                { direction: 'up', center: pos(x, y - 2) },
                { direction: 'down', center: pos(x, y + 2) }
            ]
            shuffle(sides);

            pick_side:
            for (const { direction, center } of sides) {
                const pt = point(center); //64, 7, 1
                if (pt.x >= 8 || pt.x <= 0 || pt.y >= 8 || pt.y <= 0) continue;

                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (map[pos(pt.x + i, pt.y + j)]) continue pick_side;
                    }
                }

                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        map[pos(pt.x + i, pt.y + j)] = { type: 'mbc' };
                    }
                }       
                const wall = directions[direction];
                const defender = pos(x + wall.x, y + wall.y);
                map[defender] = { type: 'defender', [reverse_direction[direction]]: true };

                map[pos(x, y)][direction] = true;
                
                return true;
            }

            return false;
        }

        const SPAWN = { x: Math.floor(WIDTH / 2), y: Math.floor(WIDTH / 2) };

        const map = Array(81).fill(0);

        map[pos(SPAWN.x, SPAWN.y)] = { type: 'spawn' };
        let looped = false;

        const placeLoop = (x, y, depth) => {
            if (looped) return false;
            const loop_rooms = shuffle([
                { type: 'room', left: true, down: true, corner: { x: 1, y: 0 } },
                { type: 'room', left: true, up: true, corner: { x: 1, y: 1 }},
                { type: 'room', right: true, up: true, corner: { x: 0, y: 1 } },
                { type: 'room', right: true, down: true, corner: { x: 0, y: 0 } }
            ]);
            const sides = shuffle([
                { direction: 'left', tile: pos(x - 1, y) },
                { direction: 'right', tile: pos(x + 1, y) },
                { direction: 'up', tile: pos(x, y - 1) },
                { direction: 'down', tile: pos(x, y + 1) }
            ]);

            for (const { direction, tile } of sides) {
                const filtered = loop_rooms.filter(lr => !lr[direction]);
                for (const room of filtered) {
                    const pt = room.corner;
                    let failed = false;
                    for (const corner of loop_rooms) {
                        const loop_tile = pos(x + pt.x + corner.corner.x, y + pt.y + corner.corner.y);
                        if (loop_tile === false || map[loop_tile]) {
                            failed = true;
                            break;
                        }
                        map[loop_tile] = {...corner };
                    }

                    if (!failed) {
                        map[pos(x, y)][direction] = true;
                        map[pos(x + pt.x, y + pt.y)][reverse_direction[direction]] = true;
                        
                        looped = true;
                        for (const loop_room of loop_rooms) {
                            const loop_tile = pos(x + pt.x + loop_room.corner.x, y + pt.y + loop_room.corner.y);
                            const loop_pt = point(loop_tile);
                            if (placeRoom(loop_pt.x, loop_pt.y, depth + 1))
                                return true;
                        }
                    }

                    for (const loop_room of loop_rooms) {
                        const loop_tile = pos(x + pt.x + loop_room.corner.x, y + pt.y + loop_room.corner.y);
                        if (map[loop_tile] && map[loop_tile].corner) map[loop_tile] = 0;
                    }
                    looped = false;
                }
            }
        }

        const placeRoom = (x, y, depth) => {
            if (x >= WIDTH || x < 0 || y >= WIDTH || y < 0 || pos(x, y) === false) 
                return false; 
            if (depth == LENGTH) {
                return placeMBC(x, y);
            }
            if (!looped && Math.random() <= .2) {
                const result = placeLoop(x, y, depth);
                if (result) {
                    looped = true;
                    return true;
                }
            }
            const sides = shuffle([
                { direction: 'left', tile: pos(x - 1, y) },
                { direction: 'right', tile: pos(x + 1, y) },
                { direction: 'up', tile: pos(x, y - 1) },
                { direction: 'down', tile: pos(x, y + 1) }
            ]);
            for ( const { direction, tile } of sides) {
                if (tile === false || map[tile]) continue;
                const pt = point(tile);
                map[pos(x, y)][direction] = true;
                map[tile] = { type: 'room', [reverse_direction[direction]]: true };
                if (placeRoom(pt.x, pt.y, depth + 1)) {
                    return true;
                }

                map[pos(x, y)][direction] = false;
                map[tile] = 0;
            }
            return false;
        }

        const getRoomNumber = (up, right, down, left, spawn, pots, defender, troom) => {
            if (troom) return 126;
            let startn;
            let num = 0;
            if (up) { startn = 1; } else { startn = 0; }
            for (let i = startn; i < 250; i += 2) {
    
                if (((i % 2 == 1 && up) || (i % 2 == 0 && !up)) && ((i % 3 == 1 && right) || (i % 3 == 0 && !right)) && ((i % 5 == 1 && down) || (i % 5 == 0 && !down)) && ((i % 7 == 1 && left) || (i % 7 == 0 && !left))) {
                    num = i;
                    break;
                }
            }
            let limit = 0;
            if (spawn) { limit = 250; }
            if (pots) { limit = 500; }
            if (defender) { limit = 750; }
            while (num < limit) { num += 210; }
            if (num == 1) { num += 210; }
            return num;
        };

        placeRoom(SPAWN.x, SPAWN.y, 0);
        
        return map.map((tile, idx) => getRoomNumber(tile.up, tile.right, tile.down, tile.left, tile.type === 'spawn', tile.type === 'pot', tile.type === 'defender', tile.type === 'troom'));
    },
    maps: [],
    test_map: function() {
        const map = obj.make();
        const serialized = serialize(map.map((m, i) => new MapTile(m, point(i))));
        console.log(`https://husky-rotmg.github.io/MapReadingPractice-Web/?map=${serialized}`);
        obj.maps.push({ serialized, map, rotated: rotate(map) });
    },
    /**
     * 
     * @param {number[]} arr 
     */
    print: function(arr) {
        for (let x = 0; x < WIDTH; x++) {
            console.log(`[${arr[x].join(', ')}]`);
        }
    }
}

module.exports = obj;