import { GlowFilter } from "@pixi/filter-glow";
import { Chart } from "chart.js";
import * as PIXI from "pixi.js";
import { chartConfig } from "./config/ChartConfig";
import { Entity } from "./interfaces/Entity";
import { Bird } from "./objects/Bird";
import { Wall } from "./objects/Wall";

export class Renderer {
  private static instance: Renderer;

  public static getInstance(): Renderer {
    return this.instance || (this.instance = new Renderer());
  }

  public pixi: PIXI.Application = new PIXI.Application(window.innerWidth, window.innerHeight, { transparent: true });

  public walls: Array<Array<Wall>> = [];

  public chartElement: HTMLCanvasElement = document.getElementById("chart") as HTMLCanvasElement;

  public chart: Chart = new Chart(this.chartElement, chartConfig);

  public gap: number = this.pixi.screen.height / Math.PI;

  public distance: number = this.pixi.screen.width  * 0.3;

  public _pipesCount: number = 0;

  public birdsAlive: number = 0;

  public birdsTotal: number = 0;

  public bestScore: number = 0;

  public generation: number = 0;

  public mutated: number = 0;

  public delta: number = 0;

  private background: PIXI.Sprite = PIXI.Sprite.fromImage("background.png");

  private bestScoreContainer: HTMLElement = document.getElementById("bestScore") as HTMLElement;

  private birdsAliveContainer: HTMLElement = document.getElementById("birdsAlive") as HTMLElement;

  private generationContainer: HTMLElement = document.getElementById("generation") as HTMLElement;

  private mutatedContainer: HTMLElement = document.getElementById("mutated") as HTMLElement;

  constructor() {
    document.body.appendChild(this.pixi.view);
    this.setupBackground();
    this.pixi.ticker.speed = 1;
  }

  public get pipesCount(): number {
    return this._pipesCount;
  }

  public set pipesCount(value: number) {
    this._pipesCount = value;
    const score = document.getElementById("score") as HTMLElement;
    score.innerHTML = String(this._pipesCount);
  }

  public createWalls(): void {
    const minimum = (this.pixi.screen.height / 6),
          maximum = this.pixi.screen.height - minimum - this.gap,
          height = Math.random() * (maximum - minimum) + minimum,
          bottomHeight = this.pixi.screen.height - height - this.gap;
    const instances  = [ new Wall(this.pixi.screen.width + this.distance, height / 2, height, "top"), new Wall(this.pixi.screen.width + this.distance, this.pixi.screen.height - bottomHeight / 2, bottomHeight, "bottom") ];
    this.walls.push(instances);
    const [ top, bottom ] = instances;
    this.add(top);
    this.add(bottom);
  }

  public createBird(hiddenLayerSize: number): Bird {
    const instance = new Bird(this.pixi.screen.width / 10, (this.pixi.screen.height / 2)  - 60, hiddenLayerSize);
    this.add(instance);
    return instance;
  }

  public add(instance: Entity): void {
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

  public getInputData(x: number, y:number, width: number, height: number): Array<number> {
    const [ closest ] = this.walls;
    if (closest !== undefined) {
      if (closest.length >= 2) {
        const [topWall, botWall] = closest;
        const top: number = Math.abs(y - topWall.height) / this.pixi.screen.height,
              bot: number = Math.abs((this.pixi.screen.height - botWall.height) - (y + height / 2)) / this.pixi.screen.height,
              distanceX: number = Math.abs(x - Math.abs(topWall.x - topWall.width / 2)) / this.pixi.screen.width;
        return [ top, bot, distanceX ];
      }
    }
    return [ (this.pixi.screen.height / 2) / this.pixi.screen.height, (this.pixi.screen.height / 2) / this.pixi.screen.height, 1 ];
  }

  public getDistance(x: number, y: number): number {
    const [ closest ] = this.walls;
    if (closest !== undefined) {
      if (closest.length >= 2) {
        const [top] = closest;
        return Math.abs(y - (top.y + top.height / 2 + this.gap / 2));
      }
    }
    return 1;
  }

  public getFilter(): GlowFilter {
    return new GlowFilter(15, 2, .1, 0xFF3300, 0.5);
  }

  public updateInfo(): void {
    this.birdsAliveContainer.innerHTML = `Birds alive: ${this.birdsAlive} / ${this.birdsTotal}`;
    this.bestScoreContainer.innerHTML = `Best score: ${this.bestScore}`;
    this.generationContainer.innerHTML = `Current generation: ${this.generation}`;
  }

  public updateMutated(): void {
    this.mutatedContainer.innerHTML = `Mutated genomes in selection: ${this.mutated}`;
  }

  public addToChart(label: string, data: number) {
    if (this.chart.data.labels && this.chart.data.datasets) {
      this.chart.data.labels.push(label);
      this.chart.data.datasets.forEach(dataset => (dataset.data as Array<number>).push(data));
      this.chart.update();
    }
  }

  private setupBackground(): void {
    this.pixi.stage.addChild(this.background);
    this.background.width = this.pixi.screen.width;
    this.background.height = this.pixi.screen.height;
    this.background.x = 0;
    this.background.y = 0;
  }

}
