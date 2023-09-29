class Stats {
    #localPots = 0;
    #localDefenders = 0;

    #globalPots = 0;
    #globalDefenders = 0;

    constructor() {
        this.#load();
    }

    #load() {
        const obj = JSON.parse(localStorage.getItem('stats')) ?? { pots: 0, defenders: 0 };
        this.#localPots = 0;
        this.#localDefenders = 0;
        this.#globalPots = obj.pots;
        this.#globalDefenders = obj.defenders;
    }

    #save() {
        localStorage.setItem('stats', JSON.stringify(this));
    }

    resetLocal() {
        this.#localPots = 0;
        this.#localDefenders = 0;
    }

    toJSON() {
        return {
            pots: this.#globalPots,
            defenders: this.#globalDefenders
        }
    }

    addPot() {
        this.#localPots++;
        this.#globalPots++;
        this.#save();
    }

    addDefender() {
        this.#localDefenders++;
        this.#globalDefenders++;
        this.#save();
    }

    get local() {
        return {
            pots: this.#localPots,
            defenders: this.#localDefenders
        }
    }

    get global() {
        return {
            pots: this.#globalPots,
            defenders: this.#globalDefenders
        }
    }

    get stats() {
        return {
            local: this.local,
            global: this.global
        }
    }
}

class MapView {
    /** @type {HTMLDivElement} */
    #container;

    /** @type {HTMLCanvasElement} */
    #canvas;

    /** @type {MapTileView[][]} */
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
     * @param {MapTileView[][]} newMap 
     */
    setMap(newMap) {
        this.#map = newMap;

        if (this.#showFlameAnimationFrameID) cancelAnimationFrame(this.#showFlameAnimationFrameID);
        this.#showFlameAnimationFrameID = undefined;
        this.#lowFlameStartTime = undefined;
        this.#showTroomHint = false;
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

        this.#showTroomIfLowFlames();

        this.draw();
    }

    #lowFlameStartTime;
    #showFlameAnimationFrameID;
    #showTroomHint = false;
    #showTroomIfLowFlames() {
        if (!(this.paintOptions.troomHint ?? MapView.#defaultPaintOptions.troomHint)) return;

        const missingCount = 5 - this.pots().length;
        if (missingCount <= 0) return;

        const animateTroomHint = ts => {
            if (!this.#lowFlameStartTime) this.#lowFlameStartTime = ts;

            const elapsed = ts - this.#lowFlameStartTime;
            const blinkStep = Math.floor(elapsed / 700); //blink on/off every 700ms, 2 steps per pot missing

            if (blinkStep >= missingCount * 2) {
                this.#showFlameAnimationFrameID = undefined;
                this.#lowFlameStartTime = undefined;
                this.#showTroomHint = false;
                return;
            } 
            if (!this.#showTroomHint && blinkStep % 2 == 0) this.#showTroomHint = true;
            else if (this.#showTroomHint && blinkStep % 2 == 1) this.#showTroomHint = false;

            this.draw();

            this.#showFlameAnimationFrameID = requestAnimationFrame(animateTroomHint);
        };

        this.#showFlameAnimationFrameID = requestAnimationFrame(animateTroomHint);
    }

    static #colors = {
        map: 'hsl(0, 0%, 6.5%)',
        border: 'hsl(0, 0%, 20%)',
        room: 'gray',
        cursor: 'purple',
        hall: '#404040',
        spawn: 'hsl(90, 100%, 50%)',
        troom: 'pink'
    }

    /** @type {MapPaintOptions} */
    static #defaultPaintOptions = {
        cursor: true,
        troomHint: true
    }

    /** @type {MapPaintOptions?} */
    paintOptions = {};

    /**
     * 
     * @param {MapPaintOptions?} options 
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
        if (options.troomHint && (this.#showTroomHint || this.pots(true).some(pot => pot.touched))) {
            const troom = this.troom;
            this.#drawCursor(context, troom.x * length + shiftx, troom.y * length + shifty, length, MapView.#colors.troom);
        }

        if (options.cursor) {
            const currentTile = this.#map[this.#cursor.x][this.#cursor.y];
            this.#drawCursor(context, currentTile.x * length + shiftx, currentTile.y * length + shifty, length, MapView.#colors.cursor);
        }

        this.#emitter.dispatchEvent(new Event("postdraw"));
    }

    /**
     * @param {CanvasRenderingContext2D} context
     * @param {MapTileView} tile
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
     * @param {MapTileView} tile
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
    #drawCursor(context, x, y, length, color) {
        context.fillStyle = color;
        context.beginPath();
        context.arc(y + length/2, x + length / 2, 14, 0, 2 * Math.PI);
        context.fill();
    }
    /**
     * 
     * @param {*} context 
     * @param {MapTileView} tile 
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
     * @returns {MapTileView}
     */
    get selectedTile() { 
        return this.#map[this.#cursor.x][this.#cursor.y];
    }

    /**
     * Key Events
     */
    up() {
        if (this.selectedTile.up)
        {
            this.move(this.#cursor.add(-1, 0));
        }
    }

    down() {
        if (this.selectedTile.down)
        {
            this.move(this.#cursor.add(1, 0));

        }
    }

    left() {
        if (this.selectedTile.left) {
            this.move(this.#cursor.add(0, -1));

        }
    }

    right() {
        if (this.selectedTile.right) {
            this.move(this.#cursor.add(0, 1));
        }
    }
    
    move(location) {
        this.#cursorHistory.push(location);
        if (!this.selectedTile.touched) {
            if (this.selectedTile.troom) this.#emitter.dispatchEvent(new Event('troom'));
            if (this.selectedTile.defender) this.#emitter.dispatchEvent(new Event('defender'));
            if (this.selectedTile.pot || this.selectedTile.troom) this.#emitter.dispatchEvent(new Event('pot'));
        }
        this.selectedTile.touched = true;
        this.draw();
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

    get defender() {
        for (const row of this.#map) {
            for (const cell of row) {
                if (cell.defender) return cell;
            }
        }
    }

    get spawn() {
        for (const row of this.#map) {
            for (const cell of row) {
                if (cell.spawn) return cell;
            }
        }   
    }

    get troom() {
        for (const row of this.#map) {
            for (const cell of row) {
                if (cell.troom) return cell;
            }
        }
    }

    pots(includeTroom=false) {
        const pots = [];
        for (const row of this.#map) {
            for (const cell of row) {
                if (cell.pot || (cell.troom && includeTroom)) pots.push(cell);
            }
        }
        return pots;
    }
}

class MapPracticeView {
    /** @type {HTMLDivElement} */
    #container;

    /** @type {HTMLInputElement} */
    #favoritesButton;

    /** @type {MapView} */
    #map;

    /** @type {MapHistory} */
    #history;

    /** @type {Stats} */
    #stats;

    /** @type {boolean} */
    #revealed = false;

    /** @type {boolean} */
    #defenderFound = false;

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

        this.#stats = new Stats();
        this.#updateStats();
        
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
        this.#container.querySelector("#resetLocalStats").addEventListener('click', () => {
            this.#stats.resetLocal();
            this.#updateStats();
        })

        this.#map.on('pot', () => {
            if (!this.#revealed && !this.#defenderFound) {
                this.#stats.addPot();
                this.#updateStats();
            }
        })

        this.#map.on('defender', () => {
            if (!this.#revealed) {
                this.#stats.addDefender();
                this.#defenderFound = true;
                this.#updateStats();
            }
        })

        this.#container.querySelector("#openEdit").addEventListener('click', () => {
            const event = new Event("edit");
            event.map = MapGenerator.deserialize(MapGenerator.serialize(this.#map.map));
            this.#emitter.dispatchEvent(event);
        })

        this.#favoritesButton = this.#container.querySelector("#favoriteMap");
        this.#favoritesButton.addEventListener('change', () => {
            if (this.#favoritesButton.checked) this.#history.addFavorite(MapGenerator.serialize(this.#map.map));
            else this.#history.removeFavorite(MapGenerator.serialize(this.#map.map));
        })

        this.#history.on("favorite", event => {
            if (event.map != MapGenerator.serialize(this.#map.map)) return;
            this.#favoritesButton.checked = event.favorited;
        });

        this.setMap(this.#history.current);

        const nameBar = this.#container.querySelector('.map-name');
        nameBar.querySelector('span').textContent = this.#history.nameFor(MapGenerator.serialize(this.#map.map)) ?? 'Unnamed Map';
        
        nameBar.querySelector('#toggleEdit').addEventListener('click', () => {
            const img = nameBar.querySelector('img');
            const serialized = MapGenerator.serialize(this.#map.map);
            const currentName = this.#history.nameFor(serialized);
            if (nameBar.querySelector('span')) {
                //move to edit mode
                const span = nameBar.querySelector('span');

                img.src = "resources/save.png";
                img.alt = "💾";

                const input = document.createElement('input');
                input.type = "text";
                input.value = currentName ?? "";
                input.placeholder = "Name this map...";
                input.spellcheck = false;

                input.addEventListener('keypress', event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        nameBar.querySelector('#toggleEdit').click();
                    }
                })

                span.replaceWith(input);

                input.focus();
            } else {
                const input = nameBar.querySelector('input');
                const newName = input.value || null;

                img.src = "resources/edit.png";
                img.alt = "✏️";

                const span = document.createElement('span');
                span.textContent = newName ?? 'Unnamed Map';

                input.replaceWith(span);

                if (currentName != newName) {
                    this.#history.setName(serialized, newName);
                    if (newName) toast(`Map renamed to ${newName}`)
                    else toast(`Name removed from map`)
                }
            }
        })
    }

    get editingName() {
        return !!this.#container.querySelector('.map-name input');
    }

    copyMapLink() {
        const link = window.location.toString().replace(window.location.search, '') + `?map=${MapGenerator.serialize(this.#map.map)}`;
        navigator.clipboard.writeText(link);
        toast('Copied map link to clipboard');
    }

    toggleVisibility() {
        this.#revealed = true;
        this.#defenderFound = true;
        this.#map.paintOptions.allRooms = !this.#map.paintOptions.allRooms;
        this.#draw();
    }

    screenshot() {
        const modal = document.querySelector('.modal');
        const cvs = modal.querySelector('canvas');
        const ctx = cvs.getContext('2d');
        ctx.drawImage(this.#map.canvas, 0, 0);
        modal.style.display = "block";
    }

    #updateStats() {
        const local = this.#container.querySelector('.stats .local');
        const global = this.#container.querySelector('.stats .global');

        local.querySelector('.pots').textContent = `${this.#stats.local.pots}`;
        local.querySelector('.defenders').textContent = `${this.#stats.local.defenders}`;
        local.querySelector('.ratio').textContent = this.#stats.local.defenders ? `${(this.#stats.local.pots/this.#stats.local.defenders).toFixed(2)}` : 'No Defenders';

        global.querySelector('.pots').textContent = `${this.#stats.global.pots}`;
        global.querySelector('.defenders').textContent = `${this.#stats.global.defenders}`;
        global.querySelector('.ratio').textContent = this.#stats.global.defenders ? `${(this.#stats.global.pots/this.#stats.global.defenders).toFixed(2)}` : 'No Defenders';

    }

    /**
     * 
     * @param {KeyboardEvent} event 
     */
    #keyListener(event) {
        //if this isn't visible, make sure not to process events
        if (!this.#container.offsetParent || this.editingName) return;

        switch (event.key.toUpperCase()) {
            case this.#settings.get("Up 1").toUpperCase():
            case this.#settings.get("Up 2").toUpperCase():
                event.preventDefault();
                this.#map.up();
                break;
            case this.#settings.get("Left 1").toUpperCase():
            case this.#settings.get("Left 2").toUpperCase():
                event.preventDefault();
                this.#map.left();
                break;
            case this.#settings.get("Right 1").toUpperCase():
            case this.#settings.get("Right 2").toUpperCase():
                event.preventDefault();
                this.#map.right();
                break;
            case this.#settings.get("Down 1").toUpperCase():
            case this.#settings.get("Down 2").toUpperCase():
                event.preventDefault();
                this.#map.down();
                break;
            case this.#settings.get("New Map 1").toUpperCase():
            case this.#settings.get("New Map 2").toUpperCase():
                event.preventDefault();
                this.newMap();
                break;
            case 'Backspace':
                event.preventDefault();
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
        this.setMap(this.#history.current);
    }

    /**
     * 
     * @param {MapTile[][]} map 
     */
    setMap(map) {
        this.#map.setMap(map);
        this.#revealed = false;
        this.#defenderFound = false;
        this.#favoritesButton.checked = this.#history.favorited(MapGenerator.serialize(map));
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
        troomHint: false,
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
            this.#container.querySelector("#showInBrowser").href = window.location.toString().replace(window.location.search, '') + `?map=${serialized}`;
        });

        this.#container.querySelector("#reset").addEventListener('click', () => this.newMap());
        this.#container.querySelector("#toggleUp").addEventListener('click', () => this.#toggle('up'));
        this.#container.querySelector("#toggleDown").addEventListener('click', () => this.#toggle('down'));
        this.#container.querySelector("#toggleLeft").addEventListener('click', () => this.#toggle('left'));
        this.#container.querySelector("#toggleRight").addEventListener('click', () => this.#toggle('right'));
        this.#container.querySelector("#setDefender").addEventListener('click', () => this.#setDefender());
        this.#container.querySelector("#deleteRooms").addEventListener('click', () => this.#deleteRooms());
        this.#container.querySelector("#setTroom").addEventListener('click', () => this.#setTroom());
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

    #setTroom() {
        if (this.#editorSelection.length > 1) {
            //TODO: TOAST: can only set exactly 1 room to defender
            toast('Too many rooms selected').style.color = 'red';
            return;
        }
        
        if (this.#editorSelection.length == 0) {
            toast('Must have 1 room selected').style.color = 'red';
            return;
        }

        const selection = this.#editorSelection[0];
    
        if (!selection.pot && !selection.defender && !selection.troom) {
            toast('Selected room cannot be defender').style.color = 'red';
            return;
        }
        
        if (!selection.down || selection.up + selection.left + selection.right) {
            //TODO: TOAST: Must have exactly 1 path to defender
            toast('Troom can only have a path downwards').style.color = 'red';
            return;
        }

        const newTile = new MapTile(MapTile.getRoomNumber({
            up: false,
            right: false,
            down: true,
            left: false,
            spawn: false, 
            defender: false, 
            pots: selection.troom,
            troom: !selection.trooml
        }), { x: selection.x, y: selection.y });
        this.#map.map[selection.x][selection.y] = newTile;
        this.#editorSelection[0] = newTile;
        this.#map.draw();
    }

    #setDefender() {
        if (this.#editorSelection.length > 1) {
            //TODO: TOAST: can only set exactly 1 room to defender
            toast('Too many rooms selected').style.color = 'red';
            return;
        }
        
        if (this.#editorSelection.length == 0) {
            toast('Must have 1 room selected').style.color = 'red';
            return;
        }

        const selection = this.#editorSelection[0];
    
        if (!selection.pot && !selection.defender && !selection.troom) {
            toast('Selected room cannot be defender').style.color = 'red';
            return;
        }

        if (selection.up + selection.down + selection.left + selection.right != 1) {
            //TODO: TOAST: Must have exactly 1 path to defender
            toast('The defender room must only have 1 path out of defender').style.color = 'red';
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
                if (center.x + x > 8 || center.y + y > 8 || center.x + x < 0 || center.y + y < 0 || this.#map.map[center.x + x][center.y + y].value && ++count > 1) {
                    toast(`Not enough room`).style.color = 'red';
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
            pots: selection.defender
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

class MapHistoryView {
    /** @type {MapHistory} */
    #history;

    /** @type {HTMLDivElement} */
    #container;

    /** @type {HTMLUListElement} */
    #favoritesList;

    /** @type {HTMLUListElement} */
    #historyList;

    /**
     * 
     * @param {MapHistory} history 
     * @param {HTMLDivElement} view 
     */
    constructor(history, view) {
        this.#history = history;
        this.#container = view;

        this.#populate();

        this.#applyListeners();
    }

    #populate() {
        this.#favoritesList = document.createElement('ul');
        
        this.#favoritesList.innerHTML = `<li><h1>Favorited Maps</h1></li>`;
        this.#favoritesList.id = "favorites";
        
        this.#historyList = document.createElement('ul');

        this.#historyList.id = "history";
        this.#historyList.innerHTML = `<li><h1>Map History</h1></li>`;


        this.#history.favorites.forEach(map => {
            this.#favoritesList.appendChild(this.#buildListItem(map, this.#favoritesList));
        })

        this.#history.history.forEach(map => {
            this.#historyList.appendChild(this.#buildListItem(map, this.#historyList));
        })
        const clearItem = document.createElement('li');
        clearItem.innerHTML = /*html*/`
            <button type="button" id="clear-history-btn">Clear History</button>    
        `;
        clearItem.querySelector('#clear-history-btn').addEventListener('click', () => this.#history.clear())
        
        this.#historyList.appendChild(clearItem);
        this.#container.replaceChildren(this.#favoritesList);
        this.#container.appendChild(this.#historyList);

        this.#historyList.querySelector("#clear-history-btn").textContent = `Clear History (${this.#history.history.length})`;
    }

    #buildListItem(map, parent) {
        const item = document.createElement('li');
        const link = window.location.href.replace(window.location.search, "") + '?map=' + map;
        const baseId = `${parent == this.#favoritesList ? 'favorite' : 'history'}-${map}`
        const favBtnID = baseId + '-fav-btn';
        item.id = baseId;
        item.innerHTML = /*html*/`
            <span>
                <input type="checkbox" class="fav-button" id="${favBtnID}" ${this.#history.favorited(map) && 'checked'}>
                <label for="${favBtnID}" class="fav-label" >⭐</label>
            </span>
            <a href="${link}">${this.#history.nameFor(map) ?? map}</a>
        `;

        if (parent == this.#historyList) {
            item.innerHTML += /*html*/`<span><button type="button" class="deleteHistoryItem">➖</button></span>`;
            const deleteBtn = item.querySelector(`.deleteHistoryItem`);
            deleteBtn.addEventListener('click', () => {
                this.#history.remove(map);
            })
        }

        const favBtn = item.querySelector(`.fav-button`);

        favBtn.addEventListener('click', () => {
            if (favBtn.checked) this.#history.addFavorite(map);
            else this.#history.removeFavorite(map);
        })

        return item;  
    }

    #applyListeners() {
        this.#history.on("moved", event => {
            const elem = this.#historyList.querySelector(`#history-${event.map}`);
            this.#historyList.removeChild(elem);
            this.#historyList.firstChild.after(elem);
        })

        this.#history.on("added", event => {
            this.#historyList.firstChild.after(this.#buildListItem(event.map, this.#historyList));
            if (event.removed) {
                for (const map of event.removed) {
                    const elem = this.#historyList.querySelector(`#history-${map}`);
                    this.#historyList.removeChild(elem);
                }
            }
            this.#historyList.querySelector("#clear-history-btn").textContent = `Clear History (${this.#history.history.length})`;
        })

        this.#history.on("removed", event => {
            const elem = this.#historyList.querySelector(`#history-${event.map}`);
            this.#historyList.removeChild(elem);
            this.#historyList.querySelector("#clear-history-btn").textContent = `Clear History (${this.#history.history.length})`;
        })

        this.#history.on("favorite", event => {
            if (event.favorited)  this.#favoritesList.appendChild(this.#buildListItem(event.map, this.#favoritesList));
            else {
                const elem = this.#favoritesList.querySelector(`#favorite-${event.map}`);
                this.#favoritesList.removeChild(elem);
            }
        })

        this.#history.on("cleared", event => {
            const elem = this.#historyList.querySelector(`#history-${event.map}`)
            this.#historyList.replaceChildren(this.#historyList.firstChild, elem, this.#historyList.lastChild);
            this.#historyList.querySelector("#clear-history-btn").textContent = `Clear History (${this.#history.history.length})`;
        })

        this.#history.on('rename', event => {
            const helem = this.#historyList.querySelector(`#history-${event.map}`);
            if (helem) {
                helem.querySelector('a').textContent = this.#history.nameFor(event.map) || event.map;
            }

            const felem = this.#favoritesList.querySelector(`#favorite-${event.map}`);
            if (felem) {
                felem.querySelector('a').textContent = this.#history.nameFor(event.map) || event.map;
            }
        })
    }
}