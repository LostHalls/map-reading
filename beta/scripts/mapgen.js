
function rand(min, max) {
    if (!min && !max)
        return Math.random();

    if (!!min && !max)
        return (Math.random() * min) ^ 0;

    return (Math.random() * (max - min) + min) ^ 0;
}

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
            return new MapTile(MapTile.getRoomNumber({up, right, down, left, spawn: false, pots: false, defender: true}), { x, y });
        }
        if ([21, 22, 23, 24].includes(byte)) {
            const [up, right, down, left] = [21, 22, 23, 24].map(v => v == byte);
            return new MapTile(MapTile.getRoomNumber({up, right, down, left, spawn: false, pots: true, defender: false}), { x, y });
        }
        let spawn = false;
        if (byte > 40) {
            byte -= 40;
            spawn = true;
        }
        const [up, right, down, left] = [0b0001, 0b0010, 0b0100, 0b1000].map((v) => {
            return Boolean(byte & v)
        })
        return new MapTile(MapTile.getRoomNumber({up, right, down, left, spawn}), { x, y });
    }

    static getRoomNumber({up, right, down, left, spawn, pots, defender}) {
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
/**
 *   Generates Lost Halls maps. Generation code is highly derived from https://github.com/RichmondD/Lost_Halls/tree/4.3
 */
class MapGenerator {
    #map;
    #mainpath;
    #mainloop;
    #forceloop;
    #mainlength;
    /**
     * 
     * @returns {MapTile[][]}
     */
    generate() {
        this.#map = MapGenerator.emptyMap();
        this.#mainpath = MapGenerator.emptyMap();
        this.#mainloop = false;
        this.#forceloop = false;
        this.#map[4][4] = 420;

        this.#mainlength = 10;

        this.#createNextRoom(4, 4, 0, 0, this.#mainlength, false);
        this.#findMainPath(4, 4, 1);
        this.#createPots();
        this.#cleanMap();
        
        //this.main = this.blowupMainPath();
        return this.tileMap;
    }

    /**
     * @type {number[][]}
     */
    get rawMap() {
        return this.#map;
    }

    /**
     * @type {MapTile[][]}
     */
    get tileMap() {
        return MapGenerator.of(this.#map);
    }

    /** 
     * @param {number[][]} base
     * @returns {MapTile[][]}
     */
    static of(base) {
        const converted = MapGenerator.emptyMap();
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                converted[i][j] = new MapTile(base[i][j], { x: i, y: j });
            }
        }
        return converted; 
    }

    /**
     * 
     * @param {MapTile[][]} map 
     * @returns {string}
     */
    static serialize(map) {
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

    /**
     * 
     * @param {string} str 
     * @returns {MapTile[][]}
     */
    static deserialize(str) {
        str = str.match(/(\d*\w)/gi).reduce((s, c) => s + (c.length == 1 ? c : c[c.length - 1].repeat(c.match(/\d+/)[0])), "");
        const arr = [];
        while (str) {
            arr.push(str.slice(0, 9));
            str = str.substring(9);
        }

        for (let i = 0; i < 9; i++) {
            let r = arr[i];
            const row = [];
            for (let j = 0; j < 9; j++) {
                row.push(MapTile.deserialize(r.charCodeAt(j) - 65, i, j));
            }
            arr[i] = row;
        }
        return arr;
    }

    static emptyMap() {
        let map = [];
        for (let i = 0; i < 9; i++) {
            let row = [];
            for (let j = 0; j < 9; j++)
                row.push(0);
            map.push(row);
        }
        return map;
    }

    /**
     * 
     * @param {MapTile[][]} map
     * @returns {MapTile[][]} 
     */
    static unshift(map) {
        const newmap = MapGenerator.deserialize(MapGenerator.serialize(map));
        for (let x = 0; x < 9; x++) {
            for (let y = 0; y < 9; y++) {
                if (newmap[x][y].value == 1) newmap[x][y] = new MapTile(0, { x, y })
            }
        }
        return newmap;
    }

    /**
     * 
     * @param {MapTile[][]} map
     * @returns {MapTile[][]} 
     */
    static shift(map) {
        map = MapGenerator.deserialize(MapGenerator.serialize(map));

        //mark defender rooms so shift is affected properly
        outer:
        for (let x = 0; x < 9; x++) {
            for (let y = 0; y < 9; y++) {
                if (map[x][y].defender) {
                    const tile = map[x][y];
                    const center = { x, y }
                    
                    if (tile.up) center.x++
                    if (tile.down) center.x-- 
                    if (tile.left) center.y++
                    if (tile.right) center.y--

                    for (let i = -1; i <= 1; i++) {
                        for (let j = -1; j <= 1; j++) {
                            if (!map[center.x + i][center.y + j].value)
                                map[center.x + i][center.y + j] = new MapTile(-1, { x: center.x + i, y: center.y + j })
                        }
                    }
                    
                    break outer;
                }
            }
        }


        let up_shift = 0;
        outer:
        for (let x = 0; x < 9; x++) {
            for (let y = 0; y < 9; y++) {
                if (map[x][y].value) break outer;
            }
            up_shift++;
        }

        let down_shift = 0;
        outer:
        for (let x = 8; x >= 0; x--) {
            for (let y = 0; y < 9; y++) {
                if (map[x][y].value) break outer;
            }
            down_shift++;
        }

        let left_shift = 0;
        outer:
        for (let y = 0; y < 9; y++) {
            for (let x = 0; x < 9; x++) {
                if (map[x][y].value) break outer; 
            }
            left_shift++;
        }

        let right_shift = 0;
        outer:
        for (let y = 8; y >= 0; y--) {
            for (let x = 0; x < 9; x++) {
                if (map[x][y].value) break outer; 
            }
            right_shift++;
        }   
        const vertical = up_shift - down_shift;
        const horizontal = left_shift - right_shift;
        console.log(up_shift, down_shift, left_shift, right_shift);
        console.log(vertical, horizontal);
        for (let x = 0; x < 9; x++) {
            for (let y = 0; y < 9; y++) {
                if ((vertical > 0 && x < vertical) || 
                    (vertical < 0 && x >= 9 + vertical) || 
                    (horizontal > 0&& y < horizontal) || 
                    (horizontal < 0 && y >= 9 + horizontal))
                    map[x][y] = new MapTile(1, { x, y })
            }
        }
    
        for (let x = 0; x < 9; x++) {
            for (let y = 0; y < 9; y++) {
                if (map[x][y].value === -1) map[x][y] = new MapTile(0, { x, y })
            }
        }
        return map;
    }

    #createNextRoom(x, y, pathtype, depth, length, loop) {
        if (depth == length) {
            if (pathtype == 0) {
                return this.#placeMBC(x, y);
            }
            if (pathtype == 1) {
                return this.#map[y][x] == 126;
            }
            if (pathtype == 2) {
                while (this.#map[y][x] < 500) {
                    this.#map[y][x] += 210;
                }
                return true;
            }
            return false;
        }

        let available = [];
        let options = [];
        let pick, works = false;

        if (loop) {
            available = [];
            for (let i = 0; i < 4; i++)
                available.push(true);

            let count = 0;

            while (available.some(a => a)) {
                options = [];
                for (let i = 0; i < 4; i++) {
                    if (available[i]) {
                        let di = (i / 2) ^ 0;
                        count = ((y + di > 0 && (this.#map[y + di - 1][x + i % 2] == 0)) ? 1 : 0) + ((y + di < 8 && (this.#map[y + di + 1][x + i % 2] == 0)) ? 1 : 0) + ((x + i % 2 > 0 && (this.#map[y + di][x + i % 2 - 1] == 0)) ? 1 : 0) + ((x + i % 2 < 8 && (this.#map[y + di][x + i % 2 + 1] == 0)) ? 1 : 0);

                        while (count > 0) {
                            options.push(i);
                            count--;
                        }
                    }
                }

                if (!options.length)
                    break;

                pick = options[rand(options.length)];

                if (pick == 0) {
                    works = this.#createNextRoom(x, y, pathtype, depth, length, false);
                    if (!works) { available[0] = false; } else { return true; }
                }
                if (pick == 1) {
                    works = this.#createNextRoom(x + 1, y, pathtype, depth, length, false);
                    if (!works) { available[1] = false; } else { return true; }
                }
                if (pick == 2) {
                    works = this.#createNextRoom(x + 1, y + 1, pathtype, depth, length, false);
                    if (!works) { available[2] = false; } else { return true; }
                }
                if (pick == 3) {
                    works = this.#createNextRoom(x, y + 1, pathtype, depth, length, false);
                    if (!works) { available[3] = false; } else { return true; }
                }
            }
            return false;
        }

        if ((!this.#mainloop && pathtype == 0 && (rand() <= 1.0 / this.#mainlength)) || (this.#forceloop && !this.#mainloop)) {
            this.#mainloop = true;

            available = this.#loopSpace(x, y);
            const lookup = [
                [-1, -2, 0, 0, -1, 2],
                [0, -2, 0, 0, -1, 2],
                [1, -1, 1, 1, 0, 3],
                [1, 0, 1, 1, 0, 3],
                [0, 1, 2, 0, 1, 0],
                [-1, 1, 2, 0, 1, 0],
                [-2, 0, 3, -1, 0, 1],
                [-2, -1, 3, -1, 0, 1]
            ];
            while (available.some(a => a)) {
                options = [];
                for (let i = 0; i < 8; i++)
                    if (available[i])
                        options.push(i);

                pick = options[rand(options.length)];

                this.#createLoop(x + lookup[pick][0], y + lookup[pick][1]);
                this.#changeRoom(x, y, lookup[pick][2]);
                this.#changeRoom(x + lookup[pick][3], y + lookup[pick][4], lookup[pick][5]);
                if (this.#createNextRoom(x + lookup[pick][0], y + lookup[pick][1], pathtype, depth + 1, length, true))
                    return true;
                available[pick] = false;
                this.#createLoop(x + lookup[pick][0], y + lookup[pick][1]);
                this.#changeRoom(x, y, lookup[pick][2]);
                this.#changeRoom(x + lookup[pick][3], y + lookup[pick][4], lookup[pick][5]);
            }
            this.#mainloop = false;
            if (this.#forceloop) return false;
        }

        available = [];
        for (let i = 0; i < 4; i++)
            available.push(false);
        if (this.#map[y][x] % 2 == 0 && y > 0) {
            if (this.#map[y - 1][x] == 0) { available[0] = true; }
        }
        if (this.#map[y][x] % 3 == 0 && x < 8) {
            if (this.#map[y][x + 1] == 0) { available[1] = true; }
        }
        if (this.#map[y][x] % 5 == 0 && y < 8) {
            if (this.#map[y + 1][x] == 0) { available[2] = true; }
        }
        if (this.#map[y][x] % 7 == 0 && x > 0) {
            if (this.#map[y][x - 1] == 0) { available[3] = true; }
        }

        if (pathtype == 1) {
            const x = true;
        }

        const lookup = [
            [0, -1, 2],
            [1, 0, 3],
            [0, 1, 0],
            [-1, 0, 1]
        ];
        
        while (available.some(a => a)) {
            options = [];
            for (let i = 0; i < 4; i++)
                if (available[i])
                    options.push(i);
                
            pick = options[rand(options.length)];

            this.#changeRoom(x, y, pick);
            this.#changeRoom(x + lookup[pick][0], y + lookup[pick][1], lookup[pick][2]);
            if (this.#createNextRoom(x + lookup[pick][0], y + lookup[pick][1], pathtype, depth + 1, length, false))
                return true;
            
            available[pick] = false;
            this.#changeRoom(x, y, pick);
            this.#changeRoom(x + lookup[pick][0], y + lookup[pick][1], lookup[pick][2]);

        }

        if (pathtype == 0 && (depth == this.#mainlength - 2) && (!this.#mainloop) && (!this.#forceloop) && (rand() <= .4)) {
            this.#forceloop = true;
            works = this.#createNextRoom(x, y, pathtype, depth, length, false);
            this.#forceloop = false;
            return works;
        }
        return false;
    }

    #createPots() {
        while (!this.#createNewPot(4, 4, 0, true));

        let potsplaced = 0;
        let potspaceavailable = true;
        let tries = 0;

        while (potspaceavailable && potsplaced < 5) {
            if (this.#createNewPot(4, 4, 0, false)) { potsplaced++; }
            if (tries > 30 && potsplaced < 5) {
                if (this.#createNewPot(4, 4, 3, false)) { potsplaced++; } 
                else if (this.#createNewPot(4, 4, 2, false)) { potsplaced++; } 
                else { potspaceavailable = false; }
            }
            tries++;
        }
    }

    #createNewPot(x, y, forcepots, troom) {
        let works = false;
        if ((rand() < 1.0 / this.#mainlength) || (forcepots > 0)) {
            if (troom) { works = this.#createNextRoom(x, y, 1, 0, rand(2) + 2, false); } 
            else if (forcepots > 0) { works = this.#createNextRoom(x, y, 2, 0, rand(forcepots - 1) + 2, false); } 
            else { works = this.#createNextRoom(x, y, 2, 0, rand(2) + 2, false); }
            if (works) { return true; }
        }
        const lookup = [[-1, 0], [0, 1], [1, 0], [0, -1]];
        for (let idx = 0; idx < 4; idx++) {
            const prime = [2, 3, 5, 7][idx];
            if (this.#map[y][x] % prime) {
                if (this.#mainpath[y + lookup[idx][0]][x + lookup[idx][1]] == this.#mainpath[y][x] + 1) {
                    if (this.#createNewPot(x + lookup[idx][1], y + lookup[idx][0], forcepots, troom))
                        return true;
                }
            }
        }

        return false;
    }

    #findMainPath(x, y, depth) {
        if (this.#map[y][x] > 750) { return; }
        this.#mainpath[y][x] = depth;

        if (this.#map[y][x] % 2 == 1) {
            if (this.#map[y - 1][x] < 1000 && this.#mainpath[y - 1][x] == 0) { this.#findMainPath(x, y - 1, depth + 1); }
        }
        if (this.#map[y][x] % 3 == 1) {
            if (this.#map[y][x + 1] < 1000 && this.#mainpath[y][x + 1] == 0) { this.#findMainPath(x + 1, y, depth + 1); }
        }
        if (this.#map[y][x] % 5 == 1) {
            if (this.#map[y + 1][x] < 1000 && this.#mainpath[y + 1][x] == 0) { this.#findMainPath(x, y + 1, depth + 1); }
        }
        if (this.#map[y][x] % 7 == 1) {
            if (this.#map[y][x - 1] < 1000 && this.#mainpath[y][x - 1] == 0) { this.#findMainPath(x - 1, y, depth + 1); }
        }
        return;
    }

    #placeMBC(x, y) {
        if (this.#map[y][x] % 5 == 1 && x > 0 && x < 8 && y > 1) {
            this.#changeRoom(x, y, 2);
            if (this.#spaceForMBC(x, y - 1)) {
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) { this.#map[y + i - 2][x + j - 1] = -1; }
                }
                this.#map[y][x] = 756;
                return true;
            }
            this.#changeRoom(x, y, 2);
        }
        if (this.#map[y][x] % 7 == 1 && x < 7 && y > 0 && y < 8) {
            this.#changeRoom(x, y, 3);
            if (this.#spaceForMBC(x + 1, y)) {
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) { this.#map[y + i - 1][x + j] = -1; }
                }
                this.#map[y][x] = 960;
                return true;
            }
            this.#changeRoom(x, y, 3);
        }
        if (this.#map[y][x] % 2 == 1 && x > 0 && x < 8 && y < 7) {
            this.#changeRoom(x, y, 0);
            if (this.#spaceForMBC(x, y + 1)) {
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) { this.#map[y + i][x + j - 1] = -1; }
                }
                this.#map[y][x] = 945;
                return true;
            }
            this.#changeRoom(x, y, 0);
        }
        if (this.#map[y][x] % 3 == 1 && x > 1 && y > 0 && y < 8) {
            this.#changeRoom(x, y, 1);
            if (this.#spaceForMBC(x - 1, y)) {
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) { this.#map[y + i - 1][x + j - 2] = -1; }
                }
                this.#map[y][x] = 910;
                return true;
            }
            this.#changeRoom(x, y, 1);
        }

        return false;
    }

    #spaceForMBC(x, y) {
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++)
                if (this.#map[y + i - 1][x + j - 1] != 0)
                    return false;
        return true;
    }

    #loopSpace(x, y) {
        let available = [];
        for (let i = 0; i < 8; i++)
            available.push(false);

        if (x > 0 && y > 1) {
            if (this.#map[y - 1][x - 1] == 0 && this.#map[y - 2][x - 1] == 0 && this.#map[y - 1][x] == 0 && this.#map[y - 2][x] == 0) { available[0] = true; }
        }
        if (x < 8 && y > 1) {
            if (this.#map[y - 1][x] == 0 && this.#map[y - 2][x] == 0 && this.#map[y - 1][x + 1] == 0 && this.#map[y - 2][x + 1] == 0) { available[1] = true; }
        }
        if (x < 7 && y > 0) {
            if (this.#map[y - 1][x + 1] == 0 && this.#map[y - 1][x + 2] == 0 && this.#map[y][x + 1] == 0 && this.#map[y][x + 2] == 0) { available[2] = true; }
        }
        if (x < 7 && y < 8) {
            if (this.#map[y][x + 1] == 0 && this.#map[y][x + 2] == 0 && this.#map[y + 1][x + 1] == 0 && this.#map[y + 1][x + 2] == 0) { available[3] = true; }
        }
        if (x < 8 && y < 7) {
            if (this.#map[y + 1][x] == 0 && this.#map[y + 2][x] == 0 && this.#map[y + 1][x + 1] == 0 && this.#map[y + 2][x + 1] == 0) { available[4] = true; }
        }
        if (x > 0 && y < 7) {
            if (this.#map[y + 1][x - 1] == 0 && this.#map[y + 2][x - 1] == 0 && this.#map[y + 1][x] == 0 && this.#map[y + 2][x] == 0) { available[5] = true; }
        }
        if (x > 1 && y < 8) {
            if (this.#map[y][x - 1] == 0 && this.#map[y][x - 2] == 0 && this.#map[y + 1][x - 1] == 0 && this.#map[y + 1][x - 2] == 0) { available[6] = true; }
        }
        if (x > 1 && y > 0) {
            if (this.#map[y - 1][x - 1] == 0 && this.#map[y - 1][x - 2] == 0 && this.#map[y][x - 1] == 0 && this.#map[y][x - 2] == 0) { available[7] = true; }
        }

        return available;
    }

    #cleanMap() {
        let oldm = MapGenerator.emptyMap();

        for (let i = 0; i < 9; i++)
            for (let j = 0; j < 9; j++)
                oldm[i][j] = this.#map[i][j];

        const sidespace = Array(4).fill(0);

        for (let idx = 0; idx < 4; idx++) {
            let rowempty = true;
            let col =  idx != 0 && idx != 3 ? 8 : 0;
            while (rowempty) {
                for (let i = 0; i < 9; i++) {
                    let x = col, y = i;
                    if (idx % 2 == 1) [x, y] = [y, x];
                    if (this.#map[x][y] != 0) {
                        rowempty = false;
                        break;
                    }

                }
                if (rowempty) {
                    sidespace[idx]++;
                    col += idx != 0 && idx != 3 ? -1 : 1;
                }
            }
        }
        let newm = [];
        for (let i = 0; i < 9; i++) {
            let row = [];
            for (let j = 0; j < 9; j++)
                row.push(0);
            newm.push(row);
        }

        let mainn = [];
        for (let i = 0; i < 9; i++) {
            let row = [];
            for (let j = 0; j < 9; j++)
                row.push(0);
            mainn.push(row);
        }
        let shiftx = Math.floor((sidespace[1] - sidespace[3]) / 2.0);
        let shifty = Math.floor((sidespace[2] - sidespace[0]) / 2.0);

        for (let i = sidespace[0]; i < 9 - sidespace[2]; i++) {
            for (let j = sidespace[3]; j < 9 - sidespace[1]; j++) {
                newm[i + shifty][j + shiftx] = this.#map[i][j];
                mainn[i + shifty][j + shiftx] = this.#mainpath[i][j];
            }
        }
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                this.#map[i][j] = newm[i][j];
                this.#mainpath[i][j] = mainn[i][j];
            }
        }

        if ((sidespace[0] + sidespace[2]) % 2 == 1) {
            for (let i = 0; i < 9; i++) {
                this.#map[8][i] = 1;
            }
        }
        if ((sidespace[1] + sidespace[3]) % 2 == 1) {
            for (let i = 0; i < 9; i++) {
                this.#map[i][8] = 1;
            }
        }

        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (this.#map[i][j] > 1000) {
                    while (this.#map[i][j] > 250) {
                        this.#map[i][j] -= 210;
                    }
                }
                if (this.#map[i][j] == -1) {
                    this.#map[i][j] = 0;
                }
            }
        }
    }

    #createLoop(x, y) {
        this.#changeRoom(x, y, 1);
        this.#changeRoom(x, y, 2);
        this.#changeRoom(x, y + 1, 0);
        this.#changeRoom(x, y + 1, 1);
        this.#changeRoom(x + 1, y, 3);
        this.#changeRoom(x + 1, y, 2);
        this.#changeRoom(x + 1, y + 1, 0);
        this.#changeRoom(x + 1, y + 1, 3);
    }

    #changeRoom(x, y, direction) {
        let sides = [
            this.#map[y][x] % 2 == 1,
            this.#map[y][x] % 3 == 1,
            this.#map[y][x] % 5 == 1,
            this.#map[y][x] % 7 == 1
        ];
        sides[direction] = !sides[direction];

        let spawn = (this.#map[y][x] > 249 && this.#map[y][x] < 500);
        let defender = (this.#map[y][x] > 749 && this.#map[y][x] < 999);
        let pots = (this.#map[y][x] > 499 && this.#map[y][x] < 750);
        this.#map[y][x] = MapTile.getRoomNumber({up: sides[0], right: sides[1], down: sides[2], left: sides[3], spawn, pots, defender});

    }
}


class MapHistory {
    #generator = new MapGenerator();
    #pos = 0;
    #history = [];
    /** 
     * @type {MapTile[][]}
     */
    #current;

    constructor(map) {
        this.#load();
        if (map) {
            this.#current = Array.isArray(map) ? map : MapGenerator.deserialize(map);
        } else this.#current = this.#generator.generate();
        this.#writeHistory();
    }

    #writeHistory() {
        this.#pos = 0;
        const serialized = MapGenerator.serialize(this.#current);
        this.#history = this.#history.filter(map => map != serialized);
        this.#history.unshift(serialized);
        this.#save();
    }

    fresh() {
        this.#current = this.#generator.generate();
        this.#writeHistory();
        return this.#current;
    }

    fromHistory(n) {
        if (this.#history.length == 0) return this.fresh();
        if (n <= 0) n = 0;
        if (n >= this.#history.length -1) n = this.#history.length - 1;
        this.#pos = n;
        this.#current = MapGenerator.deserialize(this.#history[this.#pos]);
        return this.#current;
    }

    previous() {
        return this.fromHistory(this.#pos + 1);
    }

    next() {
        return this.fromHistory(this.#pos - 1);
    }

    get current() {
        return this.#current;
    }

    get position() {
        return this.#pos;
    }

    get history() {
        return [...this.#history];
    }

    #load() {
        this.#history = JSON.parse(localStorage.getItem("map-history") || "[]");
    }

    #save() {
        localStorage.setItem("map-history", JSON.stringify(this.#history));
    }
}