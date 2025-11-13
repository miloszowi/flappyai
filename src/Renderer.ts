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

    private birdsContainer: HTMLElement = document.getElementById("birds-container") as HTMLElement;

    private birdSummaryElements: Map<number, HTMLElement> = new Map();

    constructor() {
        document.body.appendChild(this.pixi.view);
        this.setupBackground();
        this.setupListeners();

        this.gap = this.pixi.screen.height * (config.pipeGap / 100);
        this.distance = this.pixi.screen.width * (config.pipeDistance / 100) + 100;
        this.birdsTotal = config.size;
        this.birdsAlive = config.size;

        this.pixi.ticker.speed = config.speed;
        this.pixi.ticker.minFPS = 60;
        this.speedContainer.innerHTML = `speed: ${this.pixi.ticker.speed}`
        this.updateInfo()
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

        const tickerCallback = (delta: number) => {
            instance.update(delta);
            this.delta = delta;
        };

        (instance as any).tickerCallback = tickerCallback;
        this.pixi.ticker.add(tickerCallback);
    }

    public distanceToGapCenter(y: number): number {
        const [closest] = this.walls;

        if (closest !== undefined) {
            if (closest.length >= 2) {
                const [topWall, botWall] = closest;

                const topWallBottom = topWall.y + topWall.height / 2;
                const botWallTop = botWall.y - botWall.height / 2;
                const gapCenter = (topWallBottom + botWallTop) / 2;

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

    public nextGenerationWithStats(pipeScore: number, birdsWithScore: number): void {
        const chart = this.chart as any;
        if (chart.data.labels && chart.data.datasets) {
            chart.data.labels.push(`${this.generation}`);
            chart.data.datasets[0].data.push(pipeScore);
            chart.data.datasets[1].data.push(birdsWithScore);
            chart.update();
        }
        this.mutatedContainer.innerHTML = `Mutated genomes in selection: ${this.mutated}`;

        this.generation++;
        this.pipesCount = 0;
        this.mutated = 0;
        this.birdsAlive = config.size;

        this.clearBirdSummaryPanel();
        this.createWalls();
    }

    public clearBirdSummaryPanel(): void {
        this.birdSummaryElements.clear();
        this.birdsContainer.innerHTML = '';
    }

    public updateBirdsPanel(birds: Bird[]): void {
        const topPerformer = birds.reduce((best, bird) => {
            if (!bird.alive) return best;
            return bird.fitness > best.fitness ? bird : best;
        });

        if (!this.birdSummaryElements.has(topPerformer.birdIndex)) {
            this.birdsContainer.innerHTML = '';
            this.birdSummaryElements.clear();
            const birdElement = this.createBirdSummaryElement(topPerformer.birdIndex, true);
            this.birdSummaryElements.set(topPerformer.birdIndex, birdElement);
            this.birdsContainer.appendChild(birdElement);
        }

        const displayedIndices = Array.from(this.birdSummaryElements.keys());
        displayedIndices.forEach(birdIndex => {
            const bird = birds.find(b => b.birdIndex === birdIndex);
            const birdElement = this.birdSummaryElements.get(birdIndex);

            if (birdElement && bird && bird.alive) {
                birdElement.classList.remove('bird-dead');
            }
        });
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

    public updateBirdSummary(bird: Bird, birdIndex: number, _decision: boolean, activationValue: number = 0): void {
        if (!bird.alive) {
            return;
        }

        const birdElement = this.birdSummaryElements.get(birdIndex);
        if (!birdElement) {
            return;
        }

        const birdIdEl = birdElement.querySelector('.bird-id') as HTMLElement;
        const birdFitnessEl = birdElement.querySelector('[data-stat="fitness"]') as HTMLElement;
        const birdVelocityEl = birdElement.querySelector('[data-stat="velocity"]') as HTMLElement;
        const birdImageEl = birdElement.querySelector('.bird-image') as HTMLImageElement;
        const birdActivationFillEl = birdElement.querySelector('[data-stat="activation"]') as HTMLElement;
        const birdActivationLabelEl = birdElement.querySelector('[data-stat="activation-label"]') as HTMLElement;
        const birdGapDistEl = birdElement.querySelector('[data-stat="gap-dist"]') as HTMLElement;
        const birdPipeDistEl = birdElement.querySelector('[data-stat="pipe-dist"]') as HTMLElement;

        birdIdEl.innerHTML = `Bird #${birdIndex + 1}${bird.isElite ? ' ⭐' : ''}`;
        if (birdFitnessEl) birdFitnessEl.innerHTML = bird.fitness.toFixed(1);
        if (birdVelocityEl) {
            const normalizedVel = bird.lastInputData.workingVelocity;
            birdVelocityEl.innerHTML = `${bird.velocity.toFixed(2)} <span class="normalized">(${normalizedVel.toFixed(2)})</span>`;
        }
        if (birdGapDistEl) {
            const normalizedGap = bird.lastInputData.centerGapDistance;
            birdGapDistEl.innerHTML = `${bird.lastRawInputData.centerGapDistance.toFixed(0)} <span class="normalized">(${normalizedGap.toFixed(2)})</span>`;
        }
        if (birdPipeDistEl) {
            const normalizedPipe = bird.lastInputData.closestPipeDistance;
            birdPipeDistEl.innerHTML = `${bird.lastRawInputData.closestPipeDistance.toFixed(0)} <span class="normalized">(${normalizedPipe.toFixed(2)})</span>`;
        }

        if (birdActivationFillEl) {
            const activationPercent = Math.max(0, Math.min(100, activationValue * 100));
            birdActivationFillEl.style.width = `${activationPercent}%`;

            if (activationValue < 0.5) {
                birdActivationFillEl.style.background = 'linear-gradient(90deg, rgba(255, 100, 100, 0.4) 0%, rgba(255, 100, 100, 0.8) 100%)';
                birdActivationFillEl.style.borderRightColor = 'rgba(255, 100, 100, 0.8)';
                birdActivationFillEl.style.boxShadow = 'inset 0 0 4px rgba(255, 100, 100, 0.3), 0 0 4px rgba(255, 100, 100, 0.2)';
            } else {
                birdActivationFillEl.style.background = 'linear-gradient(90deg, rgba(0, 255, 0, 0.4) 0%, rgba(0, 255, 0, 0.8) 100%)';
                birdActivationFillEl.style.borderRightColor = 'rgba(0, 255, 0, 0.6)';
                birdActivationFillEl.style.boxShadow = 'inset 0 0 4px rgba(0, 255, 0, 0.3), 0 0 4px rgba(0, 255, 0, 0.2)';
            }
        }

        if (birdActivationLabelEl) {
            const isJump = activationValue >= 0.5;
            birdActivationLabelEl.innerHTML = isJump ? 'JUMP' : 'FALL';
            birdActivationLabelEl.className = isJump ? 'activation-label jump' : 'activation-label fall';
        }

        birdImageEl.src = bird.isElite ? 'birds/bird_elite.png' : 'birds/bird_default.png';
    }

    private createBirdSummaryElement(birdIndex: number, isTopPerformer: boolean = false): HTMLElement {
        const item = document.createElement('div');
        item.className = 'bird-summary-item';
        const titleLabel = isTopPerformer ? 'Top Performer' : `Bird #${birdIndex + 1}`;
        item.innerHTML = `
            <img class="bird-image" src="birds/bird_default.png" alt="Bird">
            <div class="bird-item-info">
                <div class="bird-id">${titleLabel}</div>
                <div class="bird-stat-row">
                    <span class="bird-stat-label">Fitness</span>
                    <span class="bird-stat-value" data-stat="fitness">0.0</span>
                </div>
                <div class="bird-stat-row">
                    <span class="bird-stat-label">Velocity</span>
                    <span class="bird-stat-value" data-stat="velocity">0.0</span>
                </div>
                <div class="bird-stat-row">
                    <span class="bird-stat-label">Gap Dist</span>
                    <span class="bird-stat-value" data-stat="gap-dist">0</span>
                </div>
                <div class="bird-stat-row">
                    <span class="bird-stat-label">Pipe Dist</span>
                    <span class="bird-stat-value" data-stat="pipe-dist">0</span>
                </div>
                <div class="bird-activation-bar">
                    <div class="activation-header">
                        <span class="activation-min">0</span>
                        <span class="activation-mid">0.5</span>
                        <span class="activation-max">1</span>
                    </div>
                    <div class="activation-track">
                        <div class="activation-fill" data-stat="activation" style="width: 0%"></div>
                    </div>
                    <div class="activation-label" data-stat="activation-label">FALL</div>
                </div>
            </div>
        `;
        return item;
    }

    private setupBackground(): void {
        this.pixi.stage.addChild(this.background);
        this.background.width = this.pixi.screen.width;
        this.background.height = this.pixi.screen.height;
        this.background.x = 0;
        this.background.y = 0;
    }

    private setupListeners(): void {
        document.addEventListener("keyup", e => {
            if (e.key == "f" || e.key == "F") {
                this.freeze();
            }

            if (e.key == "u" || e.key == "U") {
                this.speedUp();
            }

            if (e.key == "d" || e.key == "D") {
                this.speedDown();
            }
        });
    }
}
