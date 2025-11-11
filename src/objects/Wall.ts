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

    public sprite: PIXI.Sprite;

    private renderer: Renderer;

    constructor(x: number, y: number, height: number, type: string, renderer: Renderer) {
        this.x = x;
        this.y = y;
        this.height = height;
        this.renderer = renderer;

        const fullTexture = PIXI.Texture.from(`pipes/pipe_${type}.png`);

        this.sprite = new PIXI.Sprite(fullTexture);
        this.sprite.width = this.width;
        this.sprite.height = this.height;
        this.sprite.anchor.set(0.5);

        if (fullTexture.valid) {
            this.applyCrop(fullTexture, height, type);
        } else {
            fullTexture.once('update', () => {
                this.applyCrop(fullTexture, height, type);
            });
        }
    }

    private applyCrop(fullTexture: PIXI.Texture, height: number, type: string): void {
        const croppedTexture = this.getCroppedTexture(fullTexture, height, type);
        this.sprite.texture = croppedTexture;
    }

    private getCroppedTexture(fullTexture: PIXI.Texture, height: number, type: string): PIXI.Texture {
        const fullHeight = fullTexture.height;
        const fullWidth = fullTexture.width;

        let cropRect: PIXI.Rectangle;

        if (type === 'top') {
            const startY = Math.max(0, fullHeight - height);
            cropRect = new PIXI.Rectangle(0, startY, fullWidth, Math.min(height, fullHeight));
        } else {
            cropRect = new PIXI.Rectangle(0, 0, fullWidth, Math.min(height, fullHeight));
        }

        return new PIXI.Texture(fullTexture.baseTexture, cropRect);
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
