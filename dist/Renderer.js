"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const filter_glow_1 = require("@pixi/filter-glow");
const chart_js_1 = require("chart.js");
const PIXI = __importStar(require("pixi.js"));
const ChartConfig_1 = require("./config/ChartConfig");
const Bird_1 = require("./objects/Bird");
const Wall_1 = require("./objects/Wall");
class Renderer {
    constructor() {
        this.pixi = new PIXI.Application(window.innerWidth, window.innerHeight, { transparent: true });
        this.walls = [];
        this.chartElement = document.getElementById("chart");
        this.chart = new chart_js_1.Chart(this.chartElement, ChartConfig_1.chartConfig);
        this.gap = this.pixi.screen.height / Math.PI;
        this.distance = this.pixi.screen.width * 0.3;
        this._pipesCount = 0;
        this.birdsAlive = 0;
        this.birdsTotal = 0;
        this.bestScore = 0;
        this.generation = 0;
        this.mutated = 0;
        this.delta = 0;
        this.background = PIXI.Sprite.fromImage("background.png");
        this.bestScoreContainer = document.getElementById("bestScore");
        this.birdsAliveContainer = document.getElementById("birdsAlive");
        this.generationContainer = document.getElementById("generation");
        this.mutatedContainer = document.getElementById("mutated");
        document.body.appendChild(this.pixi.view);
        this.setupBackground();
        this.pixi.ticker.speed = 1;
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
    createWalls() {
        const minimum = (this.pixi.screen.height / 6), maximum = this.pixi.screen.height - minimum - this.gap, height = Math.random() * (maximum - minimum) + minimum, bottomHeight = this.pixi.screen.height - height - this.gap;
        const instances = [new Wall_1.Wall(this.pixi.screen.width + this.distance, height / 2, height, "top"), new Wall_1.Wall(this.pixi.screen.width + this.distance, this.pixi.screen.height - bottomHeight / 2, bottomHeight, "bottom")];
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
        this.pixi.ticker.add(delta => {
            instance.update(delta);
            Renderer.getInstance().delta = delta;
        });
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
                return Math.abs(y - (top.y + top.height / 2 + this.gap / 2));
            }
        }
        return 1;
    }
    getFilter() {
        return new filter_glow_1.GlowFilter(15, 2, .1, 0xFF3300, 0.5);
    }
    updateInfo() {
        this.birdsAliveContainer.innerHTML = `Birds alive: ${this.birdsAlive} / ${this.birdsTotal}`;
        this.bestScoreContainer.innerHTML = `Best score: ${this.bestScore}`;
        this.generationContainer.innerHTML = `Current generation: ${this.generation}`;
    }
    updateMutated() {
        this.mutatedContainer.innerHTML = `Mutated genomes in selection: ${this.mutated}`;
    }
    addToChart(label, data) {
        if (this.chart.data.labels && this.chart.data.datasets) {
            this.chart.data.labels.push(label);
            this.chart.data.datasets.forEach(dataset => dataset.data.push(data));
            this.chart.update();
        }
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
