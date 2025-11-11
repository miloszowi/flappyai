import * as PIXI from "pixi.js";
import { Entity } from "../interfaces/Entity";
import { Renderer } from "../Renderer";

export class Wall implements Entity {
    public x: number;

    public y: number;

    public height: number;

    public width: number = 100;

    public alive: boolean = true;

    public created: boolean = false;

    public readonly sprite: PIXI.Sprite;

    private renderer: Renderer;

    constructor(x: number, y: number, height: number, type: string, renderer: Renderer) {
        this.x = x;
        this.y = y;
        this.height = height;
        this.sprite = PIXI.Sprite.fromImage(`pipes/pipe_${type}.png`);
        this.sprite.width = this.width;
        this.sprite.height = this.height;
        this.sprite.anchor.set(0.5);
        this.renderer = renderer;
    }

    public update(delta: number): void | boolean {
        if (!this.alive) {
            return false;
        }

        this.x -= 10 * delta;
        this.render();

        if (this.x < this.renderer.pixi.screen.width && !this.created) {
            this.renderer.walls
                .filter(walls => walls.includes(this))[0]
                .map(wall => wall.created = true);
            this.renderer.createWalls();
        }
    }

    public render(): void {
        this.sprite.x = this.x;
        this.sprite.y = this.y;

        if (this.sprite.x + this.width < 0) {
            this.alive = false;
        }
    }

    public hide(): void {
        this.alive = false;
        this.renderer.pixi.stage.removeChild(this.sprite);
    }
}
