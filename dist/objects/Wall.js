"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Renderer_1 = require("../Renderer");
class Wall {
    constructor(x, y, height, type) {
        this.width = 100;
        this.alive = true;
        this.created = false;
        this.x = x;
        this.y = y;
        this.height = height;
        this.sprite = PIXI.Sprite.fromImage(`pipes/pipe_${type}.png`);
        this.sprite.width = this.width;
        this.sprite.height = this.height;
        this.sprite.anchor.set(0.5);
    }
    update(delta) {
        if (!this.alive) {
            return false;
        }
        this.x -= 7 * delta;
        this.render();
        if (this.x < Renderer_1.Renderer.getInstance().pixi.screen.width && !this.created) {
            Renderer_1.Renderer.getInstance().walls
                .filter(walls => walls.includes(this))[0]
                .map(wall => wall.created = true);
            Renderer_1.Renderer.getInstance().createWalls();
        }
    }
    render() {
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        if (this.sprite.x + this.width < 0) {
            this.alive = false;
        }
    }
    hide() {
        this.alive = false;
        Renderer_1.Renderer.getInstance().pixi.stage.removeChild(this.sprite);
    }
}
exports.Wall = Wall;
