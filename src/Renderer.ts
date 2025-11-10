import { GlowFilter } from "@pixi/filter-glow";
import { Chart } from "chart.js";
import * as PIXI from "pixi.js";
import { chartConfig } from "./config/ChartConfig";
import { config } from "./config/Config";
import { Entity } from "./interfaces/Entity";
import { Bird } from "./objects/Bird";
import { Wall } from "./objects/Wall";

export class Renderer {
  public pixi: PIXI.Application = new PIXI.Application(window.innerWidth, window.innerHeight, { transparent: true });

  public walls: Array<Array<Wall>> = [];

  public gap: number = this.pixi.screen.height / Math.PI;

  public distance: number = this.pixi.screen.width * 0.3;

  public delta: number = 0;

  public birdsAlive: number = 0;

  public birdsTotal: number = 0;

  public generation: number = 0;

  public mutated: number = 0;

  public chartElement: HTMLCanvasElement = document.getElementById("chart") as HTMLCanvasElement;

  public chart: Chart = new Chart(this.chartElement, chartConfig);

  private _pipesCount: number = 0;

  private background: PIXI.Sprite = PIXI.Sprite.fromImage("background.png");

  private birdsAliveContainer: HTMLElement = document.getElementById("birdsAlive") as HTMLElement;

  private generationContainer: HTMLElement = document.getElementById("generation") as HTMLElement;

  private mutatedContainer: HTMLElement = document.getElementById("mutated") as HTMLElement;

  private speedContainer: HTMLElement = document.getElementById("speed") as HTMLElement;

  constructor() {
    document.body.appendChild(this.pixi.view);
    this.setupBackground();
    this.pixi.ticker.speed = config.speed;
    this.pixi.ticker.minFPS = 60;
    this.speedContainer.innerHTML = `speed: ${this.pixi.ticker.speed}`
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
    const instances = [new Wall(this.pixi.screen.width + this.distance, height / 2, height, "top", this), new Wall(this.pixi.screen.width + this.distance, this.pixi.screen.height - bottomHeight / 2, bottomHeight, "bottom", this)];
    this.walls.push(instances);
    const [top, bottom] = instances;
    this.add(top);
    this.add(bottom);
  }

  public createBird(hiddenLayerSize: number): Bird {
    const instance = new Bird(
      this.pixi.screen.width / 10,
      (this.pixi.screen.height / 2) - 60,
      hiddenLayerSize,
      this
    );
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
      this.delta = delta;
    });
  }

  public distanceToGapCenter(y: number): number {
    const [closest] = this.walls;

    if (closest !== undefined) {
      if (closest.length >= 2) {
        const [topWall, botWall] = closest;

        const topGapCenter = topWall.y + topWall.height / 2;
        const bottomGapCenter = botWall.y - botWall.height / 2;
        const gapCenter = (topGapCenter + bottomGapCenter) / 2;

        return gapCenter - y;
      }
    }

    return 0;
  }

  public horizontalDistanceToClosestPipe(x: number): number {
    const [closest] = this.walls;

    if (closest !== undefined) {
      if (closest.length >= 2) {
        const [topWall] = closest;
        return topWall.x - x;
      }
    }

    return 0;
  }

  public getDistance(_x: number, y: number): number {
    const [closest] = this.walls;
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
    this.generationContainer.innerHTML = `Current generation: ${this.generation}`;
  }

  public addToChart(label: string, data: number) {
    const chart = this.chart as any;
    if (chart.data.labels && chart.data.datasets) {
      chart.data.labels.push(label);
      chart.data.datasets.forEach((dataset: any) => (dataset.data as Array<number>).push(data));
      chart.update();
    }
  }

  public nextGeneration(): void {
    this.addToChart(`${this.generation}`, this.pipesCount);
    this.mutatedContainer.innerHTML = `Mutated genomes in selection: ${this.mutated}`;

    this.generation++;
    this.pipesCount = 0;
    this.mutated = 0;
    this.birdsAlive = config.size;

    this.createWalls();
  }

  public freeze(): void {
    if (this.pixi.ticker.started) {
      this.pixi.ticker.stop();
    } else {
      this.pixi.ticker.start()
    }
  }

  public speedUp(): void {
    this.pixi.ticker.speed += 1;
    this.updateSpeedInformation();
  }

  public speedDown(): void {
    this.pixi.ticker.speed -= 1;
    this.updateSpeedInformation();
  }

  private updateSpeedInformation(): void {
    this.speedContainer.innerHTML = `speed: ${this.pixi.ticker.speed}`;
  }

  private setupBackground(): void {
    this.pixi.stage.addChild(this.background);
    this.background.width = this.pixi.screen.width;
    this.background.height = this.pixi.screen.height;
    this.background.x = 0;
    this.background.y = 0;
  }
}
