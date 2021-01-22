Array.prototype.toSavedMap = function() {
    var output = "";
    for (var i = 0; i < this.length; i++) {
        output += this[i].join(',') + '\r\n';
    }
    return output;
}

function generate() {
    //Code here is based off of Nacnudd's insane skills
    //https://github.com/RichmondD/Lost_Halls/tree/4.3
    var map = create9x9();
    var mainpath = create9x9();
    var potloop = false;
    var mainloop = false;
    var forceloop = false;
    map[4][4] = 420;

    var mainlength = 10;

    createNextRoom(4, 4, 0, 0, mainlength, false);
    findMainPath(4, 4, 1);
    createPots();
    cleanMap();

    var rooms = create9x9();

    return { map, mainpath };

    function create9x9() {
        var map = [];
        for (var i = 0; i < 9; i++) {
            var row = [];
            for (var j = 0; j < 9; j++)
                row.push(0);
            map.push(row);
        }
        return map;
    }

    function rand(min, max) {
        if (!min && !max)
            return Math.random();

        if (!!min && !max)
            return (Math.random() * min) ^ 0;

        return (Math.random() * (max - min) + min) ^ 0;
    }

    function createNextRoom(x, y, pathtype, depth, length, loop) {
        if (depth == length) {
            if (pathtype == 0) {
                return placeMBC(x, y);
            }
            if (pathtype == 1) {
                return map[y][x] == 126;
            }
            if (pathtype == 2) {
                while (map[y][x] < 500) {
                    map[y][x] += 210;
                }
                return true;
            }
            return false;
        }

        var available = [];
        var options = [];
        var pick, works = false;

        if (loop) {
            available = [];
            for (var i = 0; i < 4; i++)
                available.push(true);

            var count = 0;

            while (available[0] || available[1] || available[2] || available[3]) {
                options = [];
                for (var i = 0; i < 4; i++) {
                    if (available[i]) {
                        var di = (i / 2) ^ 0;
                        count = ((y + di > 0 && (map[y + di - 1][x + i % 2] == 0)) ? 1 : 0) + ((y + di < 8 && (map[y + di + 1][x + i % 2] == 0)) ? 1 : 0) + ((x + i % 2 > 0 && (map[y + di][x + i % 2 - 1] == 0)) ? 1 : 0) + ((x + i % 2 < 8 && (map[y + di][x + i % 2 + 1] == 0)) ? 1 : 0);

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
                    works = createNextRoom(x, y, pathtype, depth, length, false);
                    if (!works) { available[0] = false; } else { return true; }
                }
                if (pick == 1) {
                    works = createNextRoom(x + 1, y, pathtype, depth, length, false);
                    if (!works) { available[1] = false; } else { return true; }
                }
                if (pick == 2) {
                    works = createNextRoom(x + 1, y + 1, pathtype, depth, length, false);
                    if (!works) { available[2] = false; } else { return true; }
                }
                if (pick == 3) {
                    works = createNextRoom(x, y + 1, pathtype, depth, length, false);
                    if (!works) { available[3] = false; } else { return true; }
                }
            }
            return false;
        }

        if (((((!mainloop) && pathtype == 0) || ((!potloop) && (pathtype > 0) && (depth < length - 1))) && (rand() <= 1.0 / mainlength)) || (forceloop && (!mainloop))) {
            if (pathtype == 0)
                mainloop = true;
            if (pathtype > 0)
                potloop = true;

            available = loopSpace(x, y);

            while (available[0] || available[1] || available[2] || available[3] || available[4] || available[5] || available[6] || available[7]) {
                options = [];
                for (var i = 0; i < 8; i++)
                    if (available[i])
                        options.push(i);

                pick = options[rand(options.length)];

                if (pick == 0) {
                    createLoop(x - 1, y - 2);
                    changeRoom(x, y, 0);
                    changeRoom(x, y - 1, 2);
                    works = createNextRoom(x - 1, y - 2, pathtype, depth + 1, length, true);
                    if (!works) {
                        available[0] = false;
                        createLoop(x - 1, y - 2);
                        changeRoom(x, y, 0);
                        changeRoom(x, y - 1, 2);
                    } else { return true; }
                }
                if (pick == 1) {
                    createLoop(x, y - 2);
                    changeRoom(x, y, 0);
                    changeRoom(x, y - 1, 2);
                    works = createNextRoom(x, y - 2, pathtype, depth + 1, length, true);
                    if (!works) {
                        available[1] = false;
                        createLoop(x, y - 2);
                        changeRoom(x, y, 0);
                        changeRoom(x, y - 1, 2);
                    } else { return true; }
                }
                if (pick == 2) {
                    createLoop(x + 1, y - 1);
                    changeRoom(x, y, 1);
                    changeRoom(x + 1, y, 3);
                    works = createNextRoom(x + 1, y - 1, pathtype, depth + 1, length, true);
                    if (!works) {
                        available[2] = false;
                        createLoop(x + 1, y - 1);
                        changeRoom(x, y, 1);
                        changeRoom(x + 1, y, 3);
                    } else { return true; }
                }
                if (pick == 3) {
                    createLoop(x + 1, y);
                    changeRoom(x, y, 1);
                    changeRoom(x + 1, y, 3);
                    works = createNextRoom(x + 1, y, pathtype, depth + 1, length, true);
                    if (!works) {
                        available[3] = false;
                        createLoop(x + 1, y);
                        changeRoom(x, y, 1);
                        changeRoom(x + 1, y, 3);
                    } else { return true; }
                }
                if (pick == 4) {
                    createLoop(x, y + 1);
                    changeRoom(x, y, 2);
                    changeRoom(x, y + 1, 0);
                    works = createNextRoom(x, y + 1, pathtype, depth + 1, length, true);
                    if (!works) {
                        available[4] = false;
                        createLoop(x, y + 1);
                        changeRoom(x, y, 2);
                        changeRoom(x, y + 1, 0);
                    } else { return true; }
                }
                if (pick == 5) {
                    createLoop(x - 1, y + 1);
                    changeRoom(x, y, 2);
                    changeRoom(x, y + 1, 0);
                    works = createNextRoom(x - 1, y + 1, pathtype, depth + 1, length, true);
                    if (!works) {
                        available[5] = false;
                        createLoop(x - 1, y + 1);
                        changeRoom(x, y, 2);
                        changeRoom(x, y + 1, 0);
                    } else { return true; }
                }
                if (pick == 6) {
                    createLoop(x - 2, y);
                    changeRoom(x, y, 3);
                    changeRoom(x - 1, y, 1);
                    works = createNextRoom(x - 2, y, pathtype, depth + 1, length, true);
                    if (!works) {
                        available[6] = false;
                        createLoop(x - 2, y);
                        changeRoom(x, y, 3);
                        changeRoom(x - 1, y, 1);
                    } else { return true; }
                }
                if (pick == 7) {
                    createLoop(x - 2, y - 1);
                    changeRoom(x, y, 3);
                    changeRoom(x - 1, y, 1);
                    works = createNextRoom(x - 2, y - 1, pathtype, depth + 1, length, true);
                    if (!works) {
                        available[7] = false;
                        createLoop(x - 2, y - 1);
                        changeRoom(x, y, 3);
                        changeRoom(x - 1, y, 1);
                    } else { return true; }
                }
            }
            if (pathtype == 0) mainloop = false;
            if (pathtype > 0) potloop = false;
            if (forceloop) return false;
        }

        available = [];
        for (var i = 0; i < 4; i++)
            available.push(false);
        if (map[y][x] % 2 == 0 && y > 0) {
            if (map[y - 1][x] == 0) { available[0] = true; }
        }
        if (map[y][x] % 3 == 0 && x < 8) {
            if (map[y][x + 1] == 0) { available[1] = true; }
        }
        if (map[y][x] % 5 == 0 && y < 8) {
            if (map[y + 1][x] == 0) { available[2] = true; }
        }
        if (map[y][x] % 7 == 0 && x > 0) {
            if (map[y][x - 1] == 0) { available[3] = true; }
        }

        while (available[0] || available[1] || available[2] || available[3]) {
            options = [];

            for (var i = 0; i < 4; i++)
                if (available[i])
                    options.push(i);

            pick = options[rand(options.length)];

            if (pick == 0) {
                changeRoom(x, y, 0);
                changeRoom(x, y - 1, 2);
                works = createNextRoom(x, y - 1, pathtype, depth + 1, length, false);
                if (!works) {
                    available[0] = false;
                    changeRoom(x, y, 0);
                    changeRoom(x, y - 1, 2);
                } else { return true; }
            }
            if (pick == 1) {
                changeRoom(x, y, 1);
                changeRoom(x + 1, y, 3);
                works = createNextRoom(x + 1, y, pathtype, depth + 1, length, false);
                if (!works) {
                    available[1] = false;
                    changeRoom(x, y, 1);
                    changeRoom(x + 1, y, 3);
                } else { return true; }
            }
            if (pick == 2) {
                changeRoom(x, y, 2);
                changeRoom(x, y + 1, 0);
                works = createNextRoom(x, y + 1, pathtype, depth + 1, length, false);
                if (!works) {
                    available[2] = false;
                    changeRoom(x, y, 2);
                    changeRoom(x, y + 1, 0);
                } else { return true; }
            }
            if (pick == 3) {
                changeRoom(x, y, 3);
                changeRoom(x - 1, y, 1);
                works = createNextRoom(x - 1, y, pathtype, depth + 1, length, false);
                if (!works) {
                    available[3] = false;
                    changeRoom(x, y, 3);
                    changeRoom(x - 1, y, 1);
                } else { return true; }
            }
        }

        if (pathtype == 0 && (depth == mainlength - 2) && (!mainloop) && (!forceloop) && (rand() <= .4)) {
            forceloop = true;
            works = createNextRoom(x, y, pathtype, depth, length, false);
            forceloop = false;
            return works;
        }
        return false;
    }

    function createPots() {
        while (!createNewPot(4, 4, 0, true));

        var potsplaced = 0;
        var potspaceavailable = true;
        var tries = 0;

        while (potspaceavailable && potsplaced < 5) {
            if (createNewPot(4, 4, 0, false)) { potsplaced++; }
            if (tries > 30 && potsplaced < 5) {
                if (createNewPot(4, 4, 4, false)) { potsplaced++; } else if (createNewPot(4, 4, 3, false)) { potsplaced++; } else if (createNewPot(4, 4, 2, false)) { potsplaced++; } else { potspaceavailable = false; }
            }
            tries++;
        }
    }

    function createNewPot(x, y, forcepots, troom) {
        var works = false;
        if ((rand() < 1.0 / mainlength) || (forcepots > 0)) {
            if (troom) { works = createNextRoom(x, y, 1, 0, rand(3) + 2, false); } else if (forcepots > 0) { works = createNextRoom(x, y, 2, 0, rand(forcepots - 1) + 2, false); } else { works = createNextRoom(x, y, 2, 0, rand(3) + 2, false); }
            if (works) { return true; }
        }

        if (map[y][x] % 2 == 1) {
            if (mainpath[y - 1][x] == mainpath[y][x] + 1) {
                works = createNewPot(x, y - 1, forcepots, troom);
                if (works) { return true; }
            }
        }
        if (map[y][x] % 3 == 1) {
            if (mainpath[y][x + 1] == mainpath[y][x] + 1) {
                works = createNewPot(x + 1, y, forcepots, troom);
                if (works) { return true; }
            }
        }
        if (map[y][x] % 5 == 1) {
            if (mainpath[y + 1][x] == mainpath[y][x] + 1) {
                works = createNewPot(x, y + 1, forcepots, troom);
                if (works) { return true; }
            }
        }
        if (map[y][x] % 7 == 1) {
            if (mainpath[y][x - 1] == mainpath[y][x] + 1) {
                works = createNewPot(x - 1, y, forcepots, troom);
                if (works) { return true; }
            }
        }

        return false;
    }

    function findMainPath(x, y, depth) {
        if (map[y][x] > 750) { return; }
        mainpath[y][x] = depth;

        if (map[y][x] % 2 == 1) {
            if (map[y - 1][x] < 1000 && mainpath[y - 1][x] == 0) { findMainPath(x, y - 1, depth + 1); }
        }
        if (map[y][x] % 3 == 1) {
            if (map[y][x + 1] < 1000 && mainpath[y][x + 1] == 0) { findMainPath(x + 1, y, depth + 1); }
        }
        if (map[y][x] % 5 == 1) {
            if (map[y + 1][x] < 1000 && mainpath[y + 1][x] == 0) { findMainPath(x, y + 1, depth + 1); }
        }
        if (map[y][x] % 7 == 1) {
            if (map[y][x - 1] < 1000 && mainpath[y][x - 1] == 0) { findMainPath(x - 1, y, depth + 1); }
        }
        return;
    }

    function placeMBC(x, y) {
        if (map[y][x] % 5 == 1 && x > 0 && x < 8 && y > 1) {
            changeRoom(x, y, 2);
            if (spaceForMBC(x, y - 1)) {
                for (var i = 0; i < 3; i++) {
                    for (var j = 0; j < 3; j++) { map[y + i - 2][x + j - 1] = -1; }
                }
                map[y][x] = 756;
                return true;
            }
            changeRoom(x, y, 2);
        }
        if (map[y][x] % 7 == 1 && x < 7 && y > 0 && y < 8) {
            changeRoom(x, y, 3);
            if (spaceForMBC(x + 1, y)) {
                for (var i = 0; i < 3; i++) {
                    for (var j = 0; j < 3; j++) { map[y + i - 1][x + j] = -1; }
                }
                map[y][x] = 960;
                return true;
            }
            changeRoom(x, y, 3);
        }
        if (map[y][x] % 2 == 1 && x > 0 && x < 8 && y < 7) {
            changeRoom(x, y, 0);
            if (spaceForMBC(x, y + 1)) {
                for (var i = 0; i < 3; i++) {
                    for (var j = 0; j < 3; j++) { map[y + i][x + j - 1] = -1; }
                }
                map[y][x] = 945;
                return true;
            }
            changeRoom(x, y, 0);
        }
        if (map[y][x] % 3 == 1 && x > 1 && y > 0 && y < 8) {
            changeRoom(x, y, 1);
            if (spaceForMBC(x - 1, y)) {
                for (var i = 0; i < 3; i++) {
                    for (var j = 0; j < 3; j++) { map[y + i - 1][x + j - 2] = -1; }
                }
                map[y][x] = 910;
                return true;
            }
            changeRoom(x, y, 1);
        }

        return false;
    }

    function spaceForMBC(x, y) {
        for (var i = 0; i < 3; i++)
            for (var j = 0; j < 3; j++)
                if (map[y + i - 1][x + j - 1] != 0)
                    return false;
        return true;
    }

    function loopSpace(x, y) {
        var available = [];
        for (var i = 0; i < 8; i++)
            available.push(false);

        if (x > 0 && y > 1) {
            if (map[y - 1][x - 1] == 0 && map[y - 2][x - 1] == 0 && map[y - 1][x] == 0 && map[y - 2][x] == 0) { available[0] = true; }
        }
        if (x < 8 && y > 1) {
            if (map[y - 1][x] == 0 && map[y - 2][x] == 0 && map[y - 1][x + 1] == 0 && map[y - 2][x + 1] == 0) { available[1] = true; }
        }
        if (x < 7 && y > 0) {
            if (map[y - 1][x + 1] == 0 && map[y - 1][x + 2] == 0 && map[y][x + 1] == 0 && map[y][x + 2] == 0) { available[2] = true; }
        }
        if (x < 7 && y < 8) {
            if (map[y][x + 1] == 0 && map[y][x + 2] == 0 && map[y + 1][x + 1] == 0 && map[y + 1][x + 2] == 0) { available[3] = true; }
        }
        if (x < 8 && y < 7) {
            if (map[y + 1][x] == 0 && map[y + 2][x] == 0 && map[y + 1][x + 1] == 0 && map[y + 2][x + 1] == 0) { available[4] = true; }
        }
        if (x > 0 && y < 7) {
            if (map[y + 1][x - 1] == 0 && map[y + 2][x - 1] == 0 && map[y + 1][x] == 0 && map[y + 2][x] == 0) { available[5] = true; }
        }
        if (x > 1 && y < 8) {
            if (map[y][x - 1] == 0 && map[y][x - 2] == 0 && map[y + 1][x - 1] == 0 && map[y + 1][x - 2] == 0) { available[6] = true; }
        }
        if (x > 1 && y > 0) {
            if (map[y - 1][x - 1] == 0 && map[y - 1][x - 2] == 0 && map[y][x - 1] == 0 && map[y][x - 2] == 0) { available[7] = true; }
        }

        return available;
    }

    function cleanMap() {
        var oldm = create9x9();

        for (var i = 0; i < 9; i++)
            for (var j = 0; j < 9; j++)
                oldm[i][j] = map[i][j];

        var sidespace = [];
        for (var i = 0; i < 4; i++)
            sidespace.push(0);

        var rowempty = true;
        var col = 0;
        while (rowempty) {
            for (var i = 0; i < 9; i++) {
                if (map[col][i] != 0) {
                    rowempty = false;
                    break;
                }
            }
            if (rowempty) {
                sidespace[0]++;
                col++;
            }
        }

        rowempty = true;
        col = 8;
        while (rowempty) {
            for (var i = 0; i < 9; i++) {
                if (map[i][col] != 0) {
                    rowempty = false;
                    break;
                }
            }
            if (rowempty) {
                sidespace[1]++;
                col--;
            }
        }
        rowempty = true;
        col = 8;
        while (rowempty) {
            for (var i = 0; i < 9; i++) {
                if (map[col][i] != 0) {
                    rowempty = false;
                    break;
                }
            }
            if (rowempty) {
                sidespace[2]++;
                col--;
            }
        }
        rowempty = true;
        col = 0;
        while (rowempty) {
            for (var i = 0; i < 9; i++) {
                if (map[i][col] != 0) {
                    rowempty = false;
                    break;
                }
            }
            if (rowempty) {
                sidespace[3]++;
                col++;
            }
        }
        var newm = [];
        for (var i = 0; i < 9; i++) {
            var row = [];
            for (var j = 0; j < 9; j++)
                row.push(0);
            newm.push(row);
        }

        var mainn = [];
        for (var i = 0; i < 9; i++) {
            var row = [];
            for (var j = 0; j < 9; j++)
                row.push(0);
            mainn.push(row);
        }
        var shiftx = Math.floor((sidespace[1] - sidespace[3]) / 2.0);
        var shifty = Math.floor((sidespace[2] - sidespace[0]) / 2.0);

        for (var i = sidespace[0]; i < 9 - sidespace[2]; i++) {
            for (var j = sidespace[3]; j < 9 - sidespace[1]; j++) {
                newm[i + shifty][j + shiftx] = map[i][j];
                mainn[i + shifty][j + shiftx] = mainpath[i][j];
            }
        }
        for (var i = 0; i < 9; i++) {
            for (var j = 0; j < 9; j++) {
                map[i][j] = newm[i][j];
                mainpath[i][j] = mainn[i][j];
            }
        }

        if ((sidespace[0] + sidespace[2]) % 2 == 1) {
            for (var i = 0; i < 9; i++) {
                map[8][i] = 1;
            }
        }
        if ((sidespace[1] + sidespace[3]) % 2 == 1) {
            for (var i = 0; i < 9; i++) {
                map[i][8] = 1;
            }
        }

        for (var i = 0; i < 9; i++) {
            for (var j = 0; j < 9; j++) {
                if (map[i][j] > 1000) {
                    while (map[i][j] > 250) {
                        map[i][j] -= 210;
                    }
                }
                if (map[i][j] == -1) {
                    map[i][j] = 0;
                }
            }
        }
    }

    function createLoop(x, y) {
        changeRoom(x, y, 1);
        changeRoom(x, y, 2);
        changeRoom(x, y + 1, 0);
        changeRoom(x, y + 1, 1);
        changeRoom(x + 1, y, 3);
        changeRoom(x + 1, y, 2);
        changeRoom(x + 1, y + 1, 0);
        changeRoom(x + 1, y + 1, 3);
    }

    function changeRoom(x, y, direction) {
        var sides = [
            map[y][x] % 2 == 1,
            map[y][x] % 3 == 1,
            map[y][x] % 5 == 1,
            map[y][x] % 7 == 1
        ];
        sides[direction] = !sides[direction];

        var spawn = (map[y][x] > 249 && map[y][x] < 500);
        var defender = (map[y][x] > 749 && map[y][x] < 999);
        var pots = (map[y][x] > 499 && map[y][x] < 750);
        map[y][x] = getRoomNumber(sides[0], sides[1], sides[2], sides[3], spawn, pots, defender);

    }

    function getRoomNumber(up, right, down, left, spawn, pots, defender) {
        var startn;
        var num = 0;
        if (up) { startn = 1; } else { startn = 0; }
        for (var i = startn; i < 250; i += 2) {
            if (((i % 2 == 1 && up) || (i % 2 == 0 && (!up))) && ((i % 3 == 1 && right) || (i % 3 == 0 && (!right))) && ((i % 5 == 1 && down) || (i % 5 == 0 && (!down))) && ((i % 7 == 1 && left) || (i % 7 == 0 && (!left)))) {
                num = i;
                break;
            }
        }
        var limit = 0;
        if (spawn) { limit = 250; }
        if (pots) { limit = 500; }
        if (defender) { limit = 750; }
        while (num < limit) { num += 210; }
        if (num == 1) { num += 210; }
        return num;
    }
}