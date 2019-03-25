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
const { architect } = require("neataptic");
class Bird {
    constructor(x, y, hiddenLayerSize) {
        this.height = Renderer_1.Renderer.getInstance().pixi.screen.height / 21;
        this.width = this.height * 1.3;
        this.textureDefault = PIXI.Texture.fromImage("birds/bird_default.png");
        this.textureElite = PIXI.Texture.fromImage("birds/bird_elite.png");
        this.sprite = new PIXI.Sprite(this.textureDefault);
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
        this.setupNetwork(hiddenLayerSize);
    }
    update(delta) {
        if (!this.alive) {
            return false;
        }
        const output = this.activateInput();
        if (output === 1) {
            this.jump(40 * delta);
        }
        this.fitness += 0.01;
        this.acceleration += 0.8 * delta;
        this.y += this.velocity * delta;
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
        this.sprite.rotation = this.velocity / 20;
    }
    die() {
        this.alive = false;
        const distance = Renderer_1.Renderer.getInstance().getDistance(this.x, this.y);
        this.fitness += 1 / distance;
        Renderer_1.Renderer.getInstance().pixi.stage.removeChild(this.sprite);
        Renderer_1.Renderer.getInstance().birdsAlive -= 1;
        Renderer_1.Renderer.getInstance().updateInfo();
    }
    setChromosome(chromosome, mutationChance) {
        this.network.connections.map((connection, index) => {
            this.network.connections[index].weight = chromosome.shift();
            if (Math.random() < mutationChance) {
                const weight = Math.random() * 2 - 1;
                this.network.connections[index].weight = weight;
                Renderer_1.Renderer.getInstance().mutated += 1;
            }
        });
        this.network.nodes.map((connection, index) => {
            this.network.nodes[index].bias = chromosome.shift();
            if (Math.random() < mutationChance) {
                const bias = Math.random() * 2 - 1;
                this.network.nodes[index].bias = bias;
                Renderer_1.Renderer.getInstance().mutated += 1;
            }
        });
    }
    jump(x) {
        this.acceleration -= x;
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
