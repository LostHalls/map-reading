class MapView {
    /** @type {HTMLDivElement} */
    #container;

    /** @type {HTMLCanvasElement} */
    #canvas;

    /** @type {MapTile[][]} */
    #map;

    /** @type {Point[]} */
    #cursorHistory = [];

    /** @type {EventTarget} */
    #emitter = new EventTarget;

    on(eventName, listener) {
        this.#emitter.addEventListener(eventName, listener);
    }

    off(eventName, listener) {
        this.#emitter.removeEventListener(eventName, listener);
    }

    /**
     * @type {Point}
     */
    get #cursor() {
        return this.#cursorHistory[this.#cursorHistory.length - 1];
    }

    /**
     * 
     * @param {HTMLDivElement} view 
     */
    constructor(view) {
        this.#container = view;
        this.#canvas = this.#container.querySelector('.wrapper canvas');
    }

    get canvas() { return this.#canvas }

    /**
     * 
     * @param {MouseEvent} event 
     * @returns 
     */
    hoveredTile(event) {
        const mouse = {
            x: event.offsetX,
            y: event.offsetY
        };

        const length = this.#canvas.clientWidth / 9;
        const shifty = this.#map[8][0].border ? length / 2 : 0;
        const shiftx = this.#map[0][8].border ? length / 2 : 0;

        if ((shiftx && (mouse.x < shiftx || mouse.x > this.#canvas.clientWidth - shiftx)) || 
            (shifty && (mouse.y < shifty || mouse.y > this.#canvas.clientHeight - shifty))) {
            return false;
        }
        let tilex = this.#map[Math.floor((mouse.y - shifty) / length)];
        if (!tilex) return false;

        const tile = tilex[Math.floor((mouse.x - shiftx) / length)];
        return tile || false;
    }

    /**
     * 
     * @param {MapTile[][]} newMap 
     */
    setMap(newMap) {
        this.#map = newMap;
        outer:
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (this.#map[i][j].spawn)
                {
                    this.#cursorHistory = [new Point(i, j)];
                    break outer;
                }
            }
        }
        this.draw();
    }

    static #colors = {
        map: 'hsl(0, 0%, 6.5%)',
        border: 'hsl(0, 0%, 20%)',
        room: 'gray',
        cursor: 'purple',
        hall: '#404040',
        spawn: 'hsl(90, 100%, 50%)'
    }

    /** @type {MapPaintOptions} */
    static #defaultPaintOptions = {
        cursor: true,
    }

    /** @type {MapPaintOptions?} */
    paintOptions;

    /**
     * 
     * @param {MapPainOptions?} options 
     */
    draw(options) {
        this.#emitter.dispatchEvent(new Event("predraw"));
        options = { ...MapView.#defaultPaintOptions, ...this.paintOptions, ...options };
        const context = this.#canvas.getContext('2d');
        context.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
        context.fillStyle = MapView.#colors.map;
        context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

        const length = this.#canvas.width / 9;
        const shiftx = this.#map[8][0].border ? length / 2 : 0;
        const shifty = this.#map[0][8].border ? length / 2 : 0;


        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const rect = { 
                    x: this.#map[i][j].x * length + shiftx,
                    y: this.#map[i][j].y * length + shifty,
                    shiftx,
                    shifty,
                    length
                }
                this.#drawHighlight(context, this.#map[i][j], rect, options);
            }
        }

        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const rect = { 
                    x: this.#map[i][j].x * length + shiftx,
                    y: this.#map[i][j].y * length + shifty,
                    shiftx,
                    shifty,
                    length
                }
                this.#drawTile(context, this.#map[i][j], rect, options);
            }
        }
        if (options.cursor) {
            const currentTile = this.#map[this.#cursor.x][this.#cursor.y];
            this.#drawCursor(context, currentTile.x * length + shiftx, currentTile.y * length + shifty, length);
        }

        this.#emitter.dispatchEvent(new Event("postdraw"));
    }

    /**
     * @param {CanvasRenderingContext2D} context
     * @param {MapTile} tile
     * @param {string} [tile.highlight]
     * @param {TileRect} rect
     * @param {MapPaintOptions} options
     */
    #drawTile(context, tile, rect, options) {
        if (!tile.spawn && !options.allRooms && !this.#cursorHistory.filter(p => p.x == tile.x && p.y == tile.y).length) return;
        if (!tile.spawn && (!tile.splits || tile.border)) return;

        this.#drawRoom(context, rect);

        [tile.up, tile.right, tile.down, tile.left].forEach((val, idx) => {
            if (!val) return;
            this.#drawHall(context, idx, rect);
        });

        this.#drawIdentifier(context, tile, rect);
    }

    /**
     * @param {CanvasRenderingContext2D} context
     * @param {MapTile} tile
     * @param {string} [tile.highlight]
     * @param {TileRect} rect
     * @param {MapPaintOptions} options
     */
    #drawHighlight(context, tile, rect, options) {
        if (tile.highlight || (options.forceHighlight && options.forceHighlight.filter(tile))) {
            context.strokeStyle = tile.highlight;
            if (options.forceHighlight)
                context.strokeStyle = options.forceHighlight.color;
            context.lineWidth = 3;
            context.strokeRect(rect.y + 10, rect.x + 10, rect.length - 20, rect.length - 20);
        }
    }

    /**
     * @param {CanvasRenderingContext2D} context
     * @param {TileRect} rect
     */
    #drawRoom(context, rect) {
        context.fillStyle = MapView.#colors.border;
        const borderDist = 15/100 * rect.length;
        context.fillRect(rect.y + borderDist, rect.x + borderDist, rect.length - (2 * borderDist), rect.length - (2 * borderDist));

        context.fillStyle = MapView.#colors.room;
        const roomDist = 20/100 * rect.length;
        context.fillRect(rect.y + roomDist, rect.x + roomDist, rect.length - (2 * roomDist), rect.length - (2 * roomDist));
    }

    static #ratios = [
        [33, -15, 38, -15],
        [85, 33, 80, 38],
        [33, 85, 38, 80],
        [-15, 33, -15, 38],
    ]
    /**
     * 
     * @param {CanvasRenderingContext2D} context 
     * @param {number} rotation 
     * @param {TileRect} rect 
     */
    #drawHall(context, rotation, rect) {
        let width1 = 34 / 100 * rect.length, height1 = 30 / 100 * rect.length;
        let width2 = 24 / 100 * rect.length, height2 = 35 / 100 * rect.length;
        if (rotation % 2 == 1) [width1, height1, width2, height2] = [height1, width1, height2, width2];

        let borderx = MapView.#ratios[rotation][0] / 100 * rect.length, bordery = MapView.#ratios[rotation][1] / 100 * rect.length;
        let hallx = MapView.#ratios[rotation][2] / 100 * rect.length, hally = MapView.#ratios[rotation][3] / 100 * rect.length;

        context.fillStyle = MapView.#colors.border;
        context.fillRect(rect.y + borderx, rect.x + bordery, width1, height1);
        context.fillStyle = MapView.#colors.hall;
        context.fillRect(rect.y + hallx, rect.x + hally, width2, height2);
    }

    /**
     * 
     * @param {CanvasRenderingContext2D} context 
     * @param {*} rect 
     */
    #drawCursor(context, x, y, length) {
        context.fillStyle = MapView.#colors.cursor;
        context.beginPath();
        context.arc(y + length/2, x + length / 2, 14, 0, 2 * Math.PI);
        context.fill();
    }
    /**
     * 
     * @param {*} context 
     * @param {MapTile} tile 
     * @param {*} rect 
     */
    #drawIdentifier(context, tile, rect) {
        let char = tile.spawn ? 'S' : tile.defender ? 'D' : tile.pot ? 'P' : tile.troom ? 'T' : null;
        if (!char) return;
        context.font = "bold 92px Arial";
        context.fillStyle = MapView.#colors.spawn;
        context.fillText(char, rect.y + 1 / 3 * rect.length, rect.x + rect.length * 2 / 3);
        
    }
    /**
     * @returns {MapTile}
     */
    get selectedTile() { 
        return this.#map[this.#cursor.x][this.#cursor.y];
    }

    /**
     * Key Events
     */
    up() {
        console.log('up')
        if (this.selectedTile.up)
        {
            this.#cursorHistory.push(this.#cursor.add(-1, 0));
            this.draw();
        }
    }

    down() {
        if (this.selectedTile.down)
        {
            this.#cursorHistory.push(this.#cursor.add(1, 0));
            this.draw();
        }
    }

    left() {
        if (this.selectedTile.left) {
            this.#cursorHistory.push(this.#cursor.add(0, -1));
            this.draw();
        }
    }

    right() {
        if (this.selectedTile.right) {
            this.#cursorHistory.push(this.#cursor.add(0, 1));
            this.draw();
        }
    }
    
    reverse() {
        if (this.#cursorHistory.length > 1) {
            this.#cursorHistory.pop();
            this.draw();
        }
    }

    get map() {
        return this.#map;
    }
}

class MapPracticeView {
    /** @type {HTMLDivElement} */
    #container;

    /** @type {MapView} */
    #map;

    /** @type {MapHistory} */
    #history;

    /**
     * @returns {MapHistory}
     */
    get history() {
        return this.#history;
    }

    /** @type {boolean | string} */
    #currentHighlight = false;

    get settings() {
        return this.#settings;
    }

    /**
     *  displayName: string,
     *  defaultValue: SettingType,
     *  currentValue?: SettingType,
     *  type?: SettingTypeName,
     */
    #settings = new Settings(
        { displayName: "Highlight 1", defaultValue: "#00f", type: "color" },
        { displayName: "Highlight 2", defaultValue: "#0f0", type: "color" },
        { displayName: "Cursor Color", defaultValue: "#800080", type: "color" },
        { displayName: "Show D-Pad", defaultValue: false, type: "boolean" },

        //KEYBINDS
        { displayName: "Up 1", defaultValue: "ArrowUp", type: "keybind" },
        { displayName: "Up 2", defaultValue: "w", type: "keybind" },
        { displayName: "Left 1", defaultValue: "ArrowLeft", type: "keybind" },
        { displayName: "Left 2", defaultValue: "a", type: "keybind" },
        { displayName: "Down 1", defaultValue: "ArrowDown", type: "keybind" },
        { displayName: "Down 2", defaultValue: "s", type: "keybind" },
        { displayName: "Right 1", defaultValue: "ArrowRight", type: "keybind" },
        { displayName: "Right 2", defaultValue: "d", type: "keybind" },
        { displayName: "New Map 1", defaultValue: "Enter", type: "keybind" },
        { displayName: "New Map 2", defaultValue: "n", type: "keybind" },
        { displayName: "Show All Rooms", defaultValue: "i", type: "keybind" }
    );

    /** @type {EventTarget} */
    #emitter = new EventTarget;

    on(eventName, listener) {
        this.#emitter.addEventListener(eventName, listener);
    }

    off(eventName, listener) {
        this.#emitter.removeEventListener(eventName, listener);
    }

    /**
     * 
     * @param {HTMLDivElement} view 
     */
    constructor(view) {
        this.#container = view;
        this.#map = new MapView(view);
        this.#history = new MapHistory(new URLSearchParams(window.location.search).get('map'));
        
        document.addEventListener('keydown', event => this.#keyListener(event));
        this.#map.canvas.addEventListener('mousemove', event => this.#mousemove(event));
        this.#map.canvas.addEventListener('mousedown', event => this.#mousedown(event));

        let ignoreEvent = event => {
            event.preventDefault();
            event.stopPropagation();
            return false;
        };
        this.#map.canvas.addEventListener('dblclick', ignoreEvent);
        this.#map.canvas.addEventListener('contextmenu', ignoreEvent);

        this.#container.querySelector("#newMap").addEventListener('click', () => this.newMap());
        this.#container.querySelector("#undoMove").addEventListener('click', () => this.#map.reverse());
        this.#container.querySelector("#unveilMap").addEventListener('click', () => this.toggleVisibility());
        this.#container.querySelector("#screenshotMap").addEventListener('click', () => this.screenshot());
        this.#container.querySelector("#shareMap").addEventListener('click', () => this.copyMapLink());
        
        this.#container.querySelector("#openEdit").addEventListener('click', () => {
            const event = new Event("edit");
            event.map = MapGenerator.deserialize(MapGenerator.serialize(this.#map.map));
            this.#emitter.dispatchEvent(event);
        })

        this.#map.setMap(this.#history.current);
        this.#map.draw();
    }

    copyMapLink() {

    }

    toggleVisibility() {

    }

    screenshot() {

    }

    /**
     * 
     * @param {KeyboardEvent} event 
     */
    #keyListener(event) {
        //if this isn't visible, make sure not to process events
        if (!this.#container.offsetParent) return;

        event.preventDefault();

        switch (event.key.toUpperCase()) {
            case this.#settings.get("Up 1").toUpperCase():
            case this.#settings.get("Up 2").toUpperCase():
                this.#map.up();
                break;
            case this.#settings.get("Left 1").toUpperCase():
            case this.#settings.get("Left 2").toUpperCase():
                this.#map.left();
                break;
            case this.#settings.get("Right 1").toUpperCase():
            case this.#settings.get("Right 2").toUpperCase():
                this.#map.right();
                break;
            case this.#settings.get("Down 1").toUpperCase():
            case this.#settings.get("Down 2").toUpperCase():
                this.#map.down();
                break;
            case this.#settings.get("New Map 1").toUpperCase():
            case this.#settings.get("New Map 2").toUpperCase():
                this.newMap();
                break;
            case 'Backspace':
                this.#map.reverse();
                break;
        }
    }

    #mousemove(event) {
        event.preventDefault();
        event.stopPropagation();
        const tile = this.#map.hoveredTile(event);
        if (!tile) return;
        if (event.buttons == 1 || event.buttons == 2)
            tile.highlight = this.#currentHighlight;
        
        this.#map.draw();

        return false;
    }

    /**
     * 
     * @param {MouseEvent} event 
     */
    #mousedown(event) {
        event.preventDefault();
        event.stopPropagation();
        const tile = this.#map.hoveredTile(event);
        if (!tile) {
            return;
        }

        switch (event.buttons) {
            case 1:
                this.#currentHighlight = this.#settings.get("Highlight 1");
                break;
            case 2:
                this.#currentHighlight = this.#settings.get("Highlight 2");
                break;
            default:
                this.#currentHighlight = false;
        }

        if (tile.highlight == this.#currentHighlight) this.#currentHighlight = false;

        tile.highlight = this.#currentHighlight;

        this.#map.draw();

        return false;
    }

    newMap() {
        this.#history.fresh();
        this.#map.setMap(this.#history.current);
        this.#map.draw();
    }


    setMap(map) {
        this.#map.setMap(map);
        this.#draw();
    }

    #draw() {
        this.#map.draw();
    }
}

class MapEditView {
    /** @type {HTMLDivElement} */
    #container;

    /** @type {MapTile[]} */
    #editorSelection = [];

    /** @type {MapView} */
    #map;

    /** @type {MapPaintOptions} */
    #drawOptions = {
        cursor: false,
        allRooms: true,
        forceHighlight: {
            color: 'white',
            filter: (tile) => this.#editorSelection.filter(t => t == tile).length
        }
    }

    /** @type {EventTarget} */
    #emitter = new EventTarget;

    on(eventName, listener) {
        this.#emitter.addEventListener(eventName, listener);
    }

    off(eventName, listener) {
        this.#emitter.removeEventListener(eventName, listener);
    }

    /**
     * 
     * @param {HTMLDivElement} view 
     */
    constructor(view) {
        this.#container = view;
        this.#map = new MapView(view);

        this.#map.paintOptions = this.#drawOptions;
        this.#map.canvas.addEventListener('mousemove', event => this.#mousemove(event));
        this.#map.canvas.addEventListener('mousedown', event => this.#mousedown(event));

        let ignoreEvent = event => {
            event.preventDefault();
            event.stopPropagation();
            return false;
        };
        this.#map.canvas.addEventListener('dblclick', ignoreEvent);
        this.#map.canvas.addEventListener('contextmenu', ignoreEvent);

        this.#map.on("predraw", () => {
            const serialized = MapGenerator.serialize(this.#map.map);
            this.#container.querySelector("#showInBrowser").href = window.location.toString().replace(window.location.search, `?map=${serialized}`);
        });

        this.#container.querySelector("#reset").addEventListener('click', () => this.newMap());
        this.#container.querySelector("#toggleUp").addEventListener('click', () => this.#toggle('up'));
        this.#container.querySelector("#toggleDown").addEventListener('click', () => this.#toggle('down'));
        this.#container.querySelector("#toggleLeft").addEventListener('click', () => this.#toggle('left'));
        this.#container.querySelector("#toggleRight").addEventListener('click', () => this.#toggle('right'));
        this.#container.querySelector("#setDefender").addEventListener('click', () => this.#setDefender());
        this.#container.querySelector("#deleteRooms").addEventListener('click', () => this.#deleteRooms());

        this.#container.querySelector("#mapLink").addEventListener('click', () => {
            const event = new Event("map");
            //essentially deep clone so that further edits in editor doesn't change practicer map
            event.map = MapGenerator.deserialize(MapGenerator.serialize(this.#map.map));
            this.#emitter.dispatchEvent(event);
        })
        this.newMap();
    }

    setMap(map) {
        this.#map.setMap(map);
        this.#map.draw();
    }

    #mousemove(event) {
        event.preventDefault();
        event.stopPropagation();

        const tile = this.#map.hoveredTile(event);

        if (!tile || (event.buttons != 1 && event.buttons != 2)) return;
        if (!this.#editorSelection.some(t => t == tile)) {
            this.#editorSelection.push(tile);
        }
        
        this.#map.draw();

        return false;
    }

    get selectedTiles() {
        return this.#editorSelection;
    }

    /**
     * 
     * @param {MouseEvent} event 
     */
    #mousedown(event) {
        event.preventDefault();
        event.stopPropagation();

        const tile = this.#map.hoveredTile(event);

        if (!tile) {
            this.#editorSelection = [];
            this.#map.draw();
            return;
        }

        if (event.ctrlKey) 
            this.#editorSelection.push(tile);
        else if (this.#editorSelection.length == 1 && this.#editorSelection[0] == tile) {
            this.#editorSelection = [];
        } else {
            this.#editorSelection = [tile];
        }

        this.#map.draw();

        return false;
    }

    static #reverses = {
        'up': {
            direction: 'down',
            x: -1,
            y: 0
        },
        'left': {
            direction: 'right',
            x: 0,
            y: -1,
        },
        'down': {
            direction: 'up',
            x: 1,
            y: 0,
        },
        'right': {
            direction: 'left',
            x: 0,
            y: 1
        }
    }

    #toggle(id, force) {
        const filtered = this.#editorSelection.filter(tile => tile[id]);
        const enabled = typeof force === 'boolean' ? force : (!filtered.length || filtered.length != this.#editorSelection.length);

        for (const idx in this.#editorSelection) {
            const tile = this.#editorSelection[idx];
            const obj = {
                up: tile.up,
                right: tile.right,
                down: tile.down,
                left: tile.left,
                spawn: tile.spawn,
                defender: false,
                [id]: enabled
            };
            obj.pots = obj.up + obj.right + obj.down + obj.left == 1 && !obj.spawn && !obj.defender;
            const newTile = new MapTile(MapTile.getRoomNumber(obj), { x: tile.x, y: tile.y });
            if (MapEditView.#reverses[id]) {
                const rev = MapEditView.#reverses[id];
                do {
                    if (rev.x + tile.x < 0 || rev.x + tile.x > 8 || rev.y + tile.y < 0 || rev.y + tile.y > 8) break;
                    const nextTile = this.#map.map[tile.x + rev.x][tile.y + rev.y];
                    const nextObj = {
                        up: nextTile.up,
                        right: nextTile.right,
                        down: nextTile.down,
                        left: nextTile.left,
                        spawn: nextTile.spawn,
                        pots: nextTile.pots,
                        defender: false,
                        [rev.direction]: enabled
                    };
                    nextObj.pots = nextObj.up + nextObj.right + nextObj.down + nextObj.left == 1 && !nextObj.spawn && !nextObj.defender;

                    const newNextTile = new MapTile(MapTile.getRoomNumber(nextObj), { x: nextTile.x, y: nextTile.y });
                    this.#map.map[nextTile.x][nextTile.y] = newNextTile;
                    for (const idx_2 in this.#editorSelection) {
                        if (this.#editorSelection[idx_2] == nextTile) {
                            this.#editorSelection[idx_2] = newNextTile;
                            break;
                        }
                    }
                } while (false);
            }

            this.#map.map[tile.x][tile.y] = newTile;
            this.#editorSelection[idx] = newTile;
        }

        this.#map.draw();
    }

    #setDefender() {
        if (this.#editorSelection.length != 1) {
            //TODO: TOAST: can only set exactly 1 room to defender
            return;
        }
        
        const selection = this.#editorSelection[0];
        if (selection.up + selection.down + selection.left + selection.right != 1) {
            //TODO: TOAST: Must have exactly 1 path to defender
            return;
        }
        let center = new Point(selection.x, selection.y);

        if (selection.up) center = center.add(MapEditView.#reverses.down.x, MapEditView.#reverses.down.y);
        if (selection.down) center = center.add(MapEditView.#reverses.up.x, MapEditView.#reverses.up.y);
        if (selection.left) center = center.add(MapEditView.#reverses.right.x, MapEditView.#reverses.right.y);
        if (selection.right) center = center.add(MapEditView.#reverses.left.x, MapEditView.#reverses.left.y);

        let count = 0;
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                if (this.#map.map[center.x + x]?.[center.y + y]?.value && ++count > 1) {
                    //TODO: TOAST: Not a valid 3x3
                    return;
                }
            }
        }

        for (const x_idx in this.#map.map) {
            for (const y_idx in this.#map.map[x_idx]) {
                const tile = this.#map.map[x_idx][y_idx];
                if (tile.defender) {
                    const newTile = new MapTile(MapTile.getRoomNumber({
                        up: tile.up,
                        right: tile.right,
                        down: tile.down,
                        left: tile.left,
                        spawn: false, 
                        defender: false, 
                        pots: true 
                    }), { x: tile.x, y: tile.y });
                    this.#map.map[tile.x][tile.y] = newTile;
                    break;
                }
            }
        }

        const newTile = new MapTile(MapTile.getRoomNumber({
            up: selection.up,
            right: selection.right,
            down: selection.down,
            left: selection.left,
            spawn: false, 
            defender: !selection.defender, 
            pots: false 
        }), { x: selection.x, y: selection.y });

        this.#map.map[selection.x][selection.y] = newTile;
        this.#editorSelection[0] = newTile;
        this.#map.draw();
    }

    #deleteRooms() {
        this.#toggle('up', false);
        this.#toggle('down', false);
        this.#toggle('left', false);
        this.#toggle('right', false);
    }

    newMap() {
        const map = MapGenerator.emptyMap();
        map[4][4] = MapTile.getRoomNumber({up: false, right: false, down: false, left: false, spawn: true, pots: false, defender: false});
        this.#map.setMap(MapGenerator.of(map));
    }
}
