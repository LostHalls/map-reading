class Predictor {
    constructor(lhmap) {
        this.map = lhmap;
    }

    predict() {
        var visible = create9x9();
        visible[this.map.start.x, this.map.start.y] = this.map.start;
        var tree = [];
    }
}