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
const Renderer_1 = require("../Renderer");
const randomName = require("sillyname");
const { architect, methods } = require("neataptic");
class Bird {
    constructor(x, y, hiddenLayerSize) {
        this.height = 35;
        this.width = this.height * 1.3;
        this.name = randomName().split(" ")[0];
        this.nameFontStyle = new PIXI.TextStyle({ fontFamily: "Verdana", fontSize: 24, fill: "#030303", stroke: "white", strokeThickness: 5 });
        this.nameDisplay = new PIXI.Text(this.name, this.nameFontStyle);
        this.colors = ["black", "blue", "green", "pink", "red", "white", "yellow"];
        this.image = `birds/bird_${this.colors[Math.round(Math.random() * (this.colors.length - 1))]}.png`;
        this.sprite = PIXI.Sprite.fromImage(this.image);
        this.velocity = 0;
        this.acceleration = 0;
        this.alive = true;
        this.fitness = 0;
        this.line = new PIXI.Graphics();
        this.score = 0;
        this.hiddenLayerSize = 2;
        this.minVelocity = -10;
        this.maxVelocity = 10;
        this.x = x;
        this.y = y;
        this.sprite.anchor.set(0.5);
        this.sprite.width = this.width;
        this.sprite.height = this.height;
        this.setupName();
        this.setupNetwork(hiddenLayerSize);
    }
    update() {
        if (!this.alive) {
            return false;
        }
        const output = this.activateInput();
        if (output === 1) {
            this.jump();
        }
        this.fitness += 0.01;
        this.acceleration += 0.5;
        this.y += this.velocity;
        this.velocity += this.acceleration;
        this.acceleration = 0;
        if (this.velocity > this.maxVelocity) {
            this.velocity = this.maxVelocity;
        }
        if (this.velocity < this.minVelocity) {
            this.velocity = this.minVelocity;
        }
        if (Renderer_1.Renderer.getInstance().pixi.view.height < this.y || this.y < 0) {
            this.die();
            this.fitness -= 0.20;
            return false;
        }
        if (this.isCollision()) {
            this.die();
            return false;
        }
        this.render();
    }
    render() {
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        this.nameDisplay.y = this.y - 2 * this.height;
        this.nameDisplay.x = this.x - this.width;
        this.sprite.rotation = this.velocity / 20;
    }
    die() {
        this.alive = false;
        const distance = Renderer_1.Renderer.getInstance().getDistance(this.x, this.y);
        this.fitness += 1 / distance;
        Renderer_1.Renderer.getInstance().pixi.stage.removeChild(this.sprite);
        Renderer_1.Renderer.getInstance().pixi.stage.removeChild(this.nameDisplay);
    }
    setDNA(DNA, mutationChance) {
        this.network.connections.map((connection, index) => {
            this.network.connections[index].weight = DNA.shift();
            if (Math.random() < mutationChance) {
                const weight = Math.random() * 2 - 1;
                this.network.connections[index].weight = weight;
            }
        });
        this.network.nodes.map((connection, index) => {
            this.network.nodes[index].bias = DNA.shift();
            if (Math.random() < 0.05) {
                const bias = Math.random() * 2 - 1;
                this.network.nodes[index].bias = bias;
            }
        });
    }
    jump() {
        this.acceleration -= 40;
    }
    activateInput() {
        const input = Renderer_1.Renderer.getInstance().getInputData(this.x, this.y, this.width, this.height);
        input.push(this.velocity / this.maxVelocity);
        return Math.round(this.network.activate(input));
    }
    isCollision() {
        if (Renderer_1.Renderer.getInstance().walls.length == 0) {
            return false;
        }
        const { walls } = Renderer_1.Renderer.getInstance(), [closest] = walls, [top, bottom] = closest;
        const collision = this.hitTestRectangle(this.sprite, top.sprite) || this.hitTestRectangle(this.sprite, bottom.sprite);
        if (!collision) {
            if (this.x + this.width > top.x + top.width) {
                Renderer_1.Renderer.getInstance().pipesCount += 1;
                this.score += 1;
                Renderer_1.Renderer.getInstance().walls.shift();
            }
            return collision;
        }
        else {
            return collision;
        }
    }
    hitTestRectangle(r1, r2) {
        const r1centerX = r1.x, r1centerY = r1.y, r2centerX = r2.x, r2centerY = r2.y;
        const r1halfWidth = r1.width / 2, r1halfHeight = r1.height / 2, r2halfWidth = r2.width / 2, r2halfHeight = r2.height / 2;
        const vx = r1centerX - r2centerX, vy = r1centerY - r2centerY;
        const combinedHalfWidths = r1halfWidth + r2halfWidth, combinedHalfHeights = r1halfHeight + r2halfHeight;
        if (Math.abs(vx) < combinedHalfWidths) {
            if (Math.abs(vy) < combinedHalfHeights) {
                return true;
            }
        }
        return false;
    }
    setupName() {
        Renderer_1.Renderer.getInstance().pixi.stage.addChild(this.nameDisplay);
        this.nameDisplay.x = this.x - this.width;
        this.nameDisplay.y = this.y - this.height / 2;
        this.nameDisplay.width = this.width * 2;
        this.nameDisplay.alpha = 0.5;
    }
    setupNetwork(hiddenLayerSize) {
        this.network = new architect.Perceptron(4, hiddenLayerSize, 1);
        this.network.connections.map((connection, index) => {
            this.network.connections[index].weight = Math.random() * 2 - 1;
        });
        this.network.nodes.map((connection, index) => {
            this.network.nodes[index].bias = Math.random() * 2 - 1;
        });
    }
}
exports.Bird = Bird;
