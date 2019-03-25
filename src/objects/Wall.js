"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Renderer_1 = require("../Renderer");
class Wall {
    constructor(x, y, height, type) {
        this.width = 100;
        this.alive = true;
        this.x = x;
        this.y = y;
        this.height = height;
        this.sprite = PIXI.Sprite.fromImage(`pipes/pipe_${type}.png`);
        this.sprite.width = this.width;
        this.sprite.height = this.height;
        this.sprite.anchor.set(0.5);
    }
    update() {
        if (!this.alive) {
            return false;
        }
        this.x -= 6;
        this.render();
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
