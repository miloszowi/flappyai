import * as PIXI from "pixi.js";
import { Entity } from "../Interfaces/Entity";
import { NeatapticConnection } from "../Interfaces/NeatapticConnection";
import { NeatapticNode } from "../Interfaces/NeatapticNode";
import { Renderer } from "../Renderer";
import { Wall } from "./Wall";

const { architect } = require("neataptic");

export class Bird implements Entity {
  public network: any;

  public y: number;

  public x: number;

  public height: number = Renderer.getInstance().pixi.screen.height / 21;

  public width: number = this.height * 1.3;

  public textureDefault: PIXI.Texture = PIXI.Texture.fromImage("birds/bird_default.png");

  public textureElite: PIXI.Texture = PIXI.Texture.fromImage("birds/bird_elite.png");

  public readonly sprite: PIXI.Sprite = new PIXI.Sprite(this.textureDefault);

  public velocity: number = 0;

  public acceleration: number = 0;

  public alive: boolean = true;

  public fitness: number = 0;

  public line: PIXI.Graphics = new PIXI.Graphics();

  public score: number = 0;

  private hiddenLayerSize: number = 2;

  private minVelocity: number = -10;

  private maxVelocity: number = 10;

  constructor(x:number, y:number, hiddenLayerSize: number) {
    this.x = x;
    this.y = y;
    this.sprite.anchor.set(0.5);
    this.sprite.width = this.width;
    this.sprite.height = this.height;
    this.setupNetwork(hiddenLayerSize);
  }

  public update(delta: number): void | boolean  {
    if (!this.alive) {
      return false;
    }
    const output: number = this.activateInput();
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
    if (Renderer.getInstance().pixi.view.height < this.y || this.y < 0) {
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

  public render(): void {
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.rotation = this.velocity / 20;
  }

  public die(): void {
    this.alive = false;
    const distance = Renderer.getInstance().getDistance(this.x, this.y);
    this.fitness += 1 / distance;
    Renderer.getInstance().pixi.stage.removeChild(this.sprite);
    Renderer.getInstance().birdsAlive -= 1;
    Renderer.getInstance().updateInfo();
  }

  public setChromosome(chromosome: Array<number>, mutationChance: number): void {
    this.network.connections.map((connection: NeatapticConnection, index: number) => {
      this.network.connections[index].weight = chromosome.shift();
      if (Math.random() < mutationChance) {
        const weight = Math.random() * 2 - 1;
        this.network.connections[index].weight = weight;
        Renderer.getInstance().mutated += 1;
      }
    });

    this.network.nodes.map((connection: NeatapticNode, index: number) => {
      this.network.nodes[index].bias = chromosome.shift();
      if (Math.random() < mutationChance) {
        const bias = Math.random() * 2 - 1;
        this.network.nodes[index].bias = bias;
        Renderer.getInstance().mutated += 1;
      }
    });
  }

  private jump(x: number): void {
    this.acceleration -= x;
  }

  private activateInput(): number {
    const input = Renderer.getInstance().getInputData(this.x, this.y, this.width, this.height);
    input.push(this.velocity / this.maxVelocity);
    return Math.round(this.network.activate(input));
  }

  private isCollision(): boolean {
    if (Renderer.getInstance().walls.length == 0 ) {
      return false;
    }
    const { walls } = Renderer.getInstance(),
          [ closest ] = walls,
          [ top, bottom ] = closest;

    const collision = this.hitTestRectangle(this.sprite, top.sprite) || this.hitTestRectangle(this.sprite, bottom.sprite);

    if (!collision) {
      if (this.x + this.width > top.x + top.width) {
        Renderer.getInstance().pipesCount += 1;
        this.score += 1;
        Renderer.getInstance().walls.shift();
      }
      return collision;
    } else {
      return collision;
    }
  }

  private hitTestRectangle(r1: PIXI.Sprite , r2: PIXI.Sprite): boolean {

    const r1centerX = r1.x,
        r1centerY = r1.y,
        r2centerX = r2.x,
        r2centerY = r2.y;

    const r1halfWidth = r1.width / 2,
        r1halfHeight = r1.height / 2,
        r2halfWidth = r2.width / 2,
        r2halfHeight = r2.height / 2;

    const vx = r1centerX - r2centerX,
          vy = r1centerY - r2centerY;

    const combinedHalfWidths = r1halfWidth + r2halfWidth,
          combinedHalfHeights = r1halfHeight + r2halfHeight;

    if (Math.abs(vx) < combinedHalfWidths) {
      if (Math.abs(vy) < combinedHalfHeights) {
        return true;
      }
    }
    return false;
  }

  private setupNetwork(hiddenLayerSize: number): void {
    this.network = new architect.Perceptron(4, hiddenLayerSize, 1);
    this.network.connections.map((connection: NeatapticConnection, index: number) => {
      this.network.connections[index].weight = Math.random() * 2 - 1;
    });

    this.network.nodes.map((connection: NeatapticNode, index: number) => {
      this.network.nodes[index].bias = Math.random() * 2 - 1;
    });
  }
}
