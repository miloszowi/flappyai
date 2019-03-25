"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const PIXI = __importStar(require("pixi.js"));
const Bird_1 = require("./objects/Bird");
const Wall_1 = require("./objects/Wall");
class Renderer {
    constructor() {
        this.pixi = new PIXI.Application(window.innerWidth, window.innerHeight, { transparent: true });
        this.generationCount = new PIXI.Text("Current generation: 1", { fontFamily: "Arial", fontSize: 24, fill: 0x000000 });
        this.fitnessBest = new PIXI.Text("Best fitness: 0", { fontFamily: "Arial", fontSize: 24, fill: 0x000000 });
        this.walls = [];
        this.distance = this.pixi.screen.height / Math.PI;
        this._pipesCount = 0;
        this.background = PIXI.Sprite.fromImage("background.png");
        document.body.appendChild(this.pixi.view);
        this.setupBackground();
        this.pixi.stage.addChild(this.generationCount, this.fitnessBest);
        this.fitnessBest.y = this.fitnessBest.height;
    }
    static getInstance() {
        return this.instance || (this.instance = new Renderer());
    }
    get pipesCount() {
        return this._pipesCount;
    }
    set pipesCount(value) {
        this._pipesCount = value;
        const score = document.getElementById("score");
        score.innerHTML = String(this._pipesCount);
    }
    createWallsPair() {
        const minimum = (this.pixi.screen.height / 6), maximum = this.pixi.screen.height - minimum - this.distance, height = Math.random() * (maximum - minimum) + minimum, bottomHeight = this.pixi.screen.height - height - this.distance;
        const instances = [new Wall_1.Wall(this.pixi.screen.width, height / 2, height, "top"), new Wall_1.Wall(this.pixi.screen.width, this.pixi.screen.height - bottomHeight / 2, bottomHeight, "bottom")];
        this.walls.push(instances);
        const [top, bottom] = instances;
        this.add(top);
        this.add(bottom);
    }
    createBird(hiddenLayerSize) {
        const instance = new Bird_1.Bird(this.pixi.screen.width / 10, (this.pixi.screen.height / 2) - 60, hiddenLayerSize);
        this.add(instance);
        return instance;
    }
    add(instance) {
        this.pixi.stage.addChild(instance.sprite);
        instance.sprite.x = instance.x;
        instance.sprite.y = instance.y;
        instance.sprite.width = instance.width;
        instance.sprite.height = instance.height;
        instance.render();
        this.pixi.ticker.add(() => instance.update());
    }
    getInputData(x, y, width, height) {
        const [closest] = this.walls;
        if (closest !== undefined) {
            if (closest.length >= 2) {
                const [topWall, botWall] = closest;
                const top = Math.abs(y - topWall.height) / this.pixi.screen.height, bot = Math.abs((this.pixi.screen.height - botWall.height) - (y + height / 2)) / this.pixi.screen.height, distanceX = Math.abs(x - Math.abs(topWall.x - topWall.width / 2)) / this.pixi.screen.width;
                return [top, bot, distanceX];
            }
        }
        return [(this.pixi.screen.height / 2) / this.pixi.screen.height, (this.pixi.screen.height / 2) / this.pixi.screen.height, 1];
    }
    getDistance(x, y) {
        const [closest] = this.walls;
        if (closest !== undefined) {
            if (closest.length >= 2) {
                const [top] = closest;
                return Math.abs(y - (top.y + top.height / 2 + this.distance / 2));
            }
        }
        return 1;
    }
    setupBackground() {
        this.pixi.stage.addChild(this.background);
        this.background.width = this.pixi.screen.width;
        this.background.height = this.pixi.screen.height;
        this.background.x = 0;
        this.background.y = 0;
    }
}
exports.Renderer = Renderer;
