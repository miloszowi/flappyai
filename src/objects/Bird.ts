import * as PIXI from "pixi.js";
import { Entity } from "../Interfaces/Entity";
import { NeatapticConnection } from "../Interfaces/NeatapticConnection";
import { NeatapticNode } from "../Interfaces/NeatapticNode";
import { Renderer } from "../Renderer";
import { Wall } from "./Wall";
import { InputData } from "../interfaces/InputData";

const { architect, methods } = require("neataptic");

export class Bird implements Entity {
	public x: number;

	public y: number;

	public width: number;

	public height: number;

	public velocity: number = 0;

	public acceleration: number = 0;

	public alive: boolean = true;

	public fitness: number = 0;

	public score: number = 0;

	public network: any;

	public readonly sprite: PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.WHITE);

	public textureDefault: PIXI.Texture = PIXI.Texture.fromImage("birds/bird_default.png");

	public textureElite: PIXI.Texture = PIXI.Texture.fromImage("birds/bird_elite.png");

	public line: PIXI.Graphics = new PIXI.Graphics();

	private renderer: Renderer;

	private gravity: number = 0.6;

	private minVelocity: number = -12;

	private maxVelocity: number = 14;

	private statsTooltip: HTMLElement | null = null;

	private lastInputData: InputData = {
		centerGapDistance: 0,
		closestPipeDistance: 0,
		workingVelocity: 0
	};

	private lastRawInputData: InputData = {
		centerGapDistance: 0,
		closestPipeDistance: 0,
		workingVelocity: 0
	};

	private lastPipeIndex: number = -1;

	private decisionFrameCounter: number = 0;

	private readonly decisionFrameDelay: number = 45;

	constructor(x: number, y: number, hiddenLayerSize: number, renderer: Renderer) {
		this.renderer = renderer;
		this.x = x;
		this.y = y;

		this.height = this.renderer.pixi.screen.height / 21;
		this.width = this.height * 1.3;

		this.sprite.texture = this.textureDefault;
		this.sprite.anchor.set(0.5);
		this.sprite.width = this.width;
		this.sprite.height = this.height;
		this.sprite.interactive = true;
		this.sprite.buttonMode = true;

		this.setupNetwork(hiddenLayerSize);
		this.setupHoverEvents();
	}

	private setupHoverEvents(): void {
		this.sprite.on("pointerover", () => {
			this.showStatsTooltip();
		});

		this.sprite.on("pointerout", () => {
			this.hideStatsTooltip();
		});
	}

	private showStatsTooltip(): void {
		if (this.statsTooltip) {
			this.hideStatsTooltip();
		}

		this.statsTooltip = document.createElement("div");
		this.statsTooltip.className = "bird-stats-tooltip";
		const networkViz = this.generateNetworkVisualization();

		this.statsTooltip.innerHTML = `
						<div class="stats-content">
								<strong>Bird Stats</strong>
								<div>Fitness: ${this.fitness.toFixed(2)}</div>
								<div>Score: ${this.score}</div>
								<div>Velocity: ${this.velocity.toFixed(2)}</div>
								<div>Y Position: ${this.y.toFixed(0)}</div>
								<hr style="margin: 5px 0; border: none; border-top: 1px solid #00ff00;">
								<strong>Input Data</strong>
								<div>Gap distance: ${this.lastRawInputData.centerGapDistance} (norm: ${this.lastInputData.centerGapDistance})</div>
								<div>Pipe distance: ${this.lastRawInputData.closestPipeDistance} (norm: ${this.lastInputData.closestPipeDistance})</div>
								<div>Velocity: ${this.lastRawInputData.workingVelocity} (norm: ${this.lastInputData.workingVelocity})</div>
								<hr style="margin: 5px 0; border: none; border-top: 1px solid #00ff00;">
								<strong>Neural Network</strong>
								${networkViz}
						</div>
				`;

		document.body.appendChild(this.statsTooltip);
		this.updateTooltipPosition();
	}

	private hideStatsTooltip(): void {
		if (this.statsTooltip) {
			this.statsTooltip.remove();
			this.statsTooltip = null;
		}
	}

	private updateTooltipPosition(): void {
		if (!this.statsTooltip) {
			return;
		}

		const rect = this.renderer.pixi.view.getBoundingClientRect();
		let tooltipX = rect.left + this.x + 20;
		let tooltipY = rect.top + this.y - 30;

		const tooltipRect = this.statsTooltip.getBoundingClientRect();
		const tooltipWidth = tooltipRect.width;
		const tooltipHeight = tooltipRect.height;

		if (tooltipX + tooltipWidth > window.innerWidth - 10) {
			tooltipX = window.innerWidth - tooltipWidth - 10;
		}
		if (tooltipX < 10) {
			tooltipX = 10;
		}
		if (tooltipY < 10) {
			tooltipY = rect.top + this.y + 30;
		}
		if (tooltipY + tooltipHeight > window.innerHeight - 10) {
			tooltipY = window.innerHeight - tooltipHeight - 10;
		}

		this.statsTooltip.style.position = "fixed";
		this.statsTooltip.style.left = `${tooltipX}px`;
		this.statsTooltip.style.top = `${tooltipY}px`;
		this.statsTooltip.style.zIndex = "10000";
	}

	public update(delta: number): void | boolean {
		if (!this.alive) {
			return false;
		}

		this.decisionFrameCounter++;
		if (this.decisionFrameCounter >= this.decisionFrameDelay) {
			if (this.decidedToJump()) {
				this.jump(100 * delta);
			}
			this.decisionFrameCounter = 0;
		}

		this.fitness += 0.005;

		if (this.score > this.lastPipeIndex) {
			this.fitness += 20;
			this.lastPipeIndex = this.score;
		}

		this.acceleration += 0.8 * delta;
		this.y += this.velocity * delta;
		this.velocity += this.acceleration;
		this.acceleration = 0;

		this.velocity = Math.max(
			this.minVelocity,
			Math.min(this.velocity, this.maxVelocity)
		);

		if (this.flewOut() || this.isCollision()) {
			this.die();

			if (this.flewOut()) {
				this.fitness -= 0.20;
			}

			return false;
		}

		const distToGapCenter = this.renderer.distanceToGapCenter(this.y);
		const normalizedDist = distToGapCenter / this.renderer.pixi.screen.height;
		this.fitness -= Math.pow(normalizedDist, 2) * 0.1;

		this.render();
	}

	public render(): void {
		this.sprite.x = this.x;
		this.sprite.y = this.y;
		this.sprite.rotation = this.velocity / 20;
	}

	public die(): void {
		this.alive = false;
		this.hideStatsTooltip();
		const distance = this.renderer.getDistance(this.x, this.y);
		this.fitness += 1 / distance;
		this.renderer.pixi.stage.removeChild(this.sprite);
		this.renderer.birdsAlive -= 1;
		this.renderer.updateInfo();
	}

	public setChromosome(chromosome: Array<number>, mutationChance: number): void {
		let chromosomeIndex = 0;

		this.network.connections.map((_connection: NeatapticConnection, index: number) => {
			this.network.connections[index].weight = chromosome[chromosomeIndex++];

			if (Math.random() < mutationChance) {
				const weight = Math.random() * 2 - 1;
				this.network.connections[index].weight = weight;
				this.renderer.mutated += 1;
			}
		});

		this.network.nodes.map((_node: NeatapticNode, index: number) => {
			this.network.nodes[index].bias = chromosome[chromosomeIndex++];

			if (Math.random() < mutationChance) {
				const bias = Math.random() * 2 - 1;
				this.network.nodes[index].bias = bias;
				this.renderer.mutated += 1;
			}
		});
	}

	private jump(x: number): void {
		this.acceleration -= x;
	}

	private decidedToJump(): number {
		const distToGapCenter = this.renderer.distanceToGapCenter(this.y);
		const horizontalDist = this.renderer.horizontalDistanceToClosestPipe(this.x);

		const normalizedDistToGap = distToGapCenter / this.renderer.pixi.screen.height;
		const normalizedHorizontalDist = horizontalDist / this.renderer.pixi.screen.width;
		const normalizedVelocity = this.velocity / this.maxVelocity;

		const input = [normalizedDistToGap, normalizedHorizontalDist, normalizedVelocity];

		this.lastRawInputData = {
			centerGapDistance: +distToGapCenter.toFixed(2),
			closestPipeDistance: +horizontalDist.toFixed(2),
			workingVelocity: +this.velocity.toFixed(2)
		};
		this.lastInputData = {
			centerGapDistance: +normalizedDistToGap.toFixed(5),
			closestPipeDistance: +normalizedHorizontalDist.toFixed(5),
			workingVelocity: +normalizedVelocity.toFixed(5)
		}

		return Math.round(this.network.activate(input));
	}

	private flewOut(): boolean {
		return this.renderer.pixi.view.height < this.y || this.y < 0;
	}

	private isCollision(): boolean {
		if (this.renderer.walls.length == 0) {
			return false;
		}
		const { walls } = this.renderer,
			[closest] = walls,
			[top, bottom] = closest;

		const collision = this.hitTestRectangle(this.sprite, top.sprite) || this.hitTestRectangle(this.sprite, bottom.sprite);

		if (!collision) {
			if (this.x + this.width > top.x + top.width) {
				this.renderer.pipesCount += 1;
				this.score += 1;
				this.renderer.walls.shift();
			}
			return collision;
		} else {
			return collision;
		}
	}

	private hitTestRectangle(r1: PIXI.Sprite, r2: PIXI.Sprite): boolean {
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
		this.network = new architect.Perceptron(3, hiddenLayerSize, 1);

		this.network.nodes.forEach((node: NeatapticNode) => {
			node.activation = methods.activation.SIGMOID;
		});

		this.network.connections.map((_connection: NeatapticConnection, index: number) => {
			this.network.connections[index].weight = Math.random() * 2 - 1;
		});

		this.network.nodes.map((_node: NeatapticNode, index: number) => {
			this.network.nodes[index].bias = Math.random() * 2 - 1;
		});
	}

	private generateNetworkVisualization(): string {
		const inputLabels = ["gap", "x", "vel"];
		const inputData = this.lastInputData;
		const hiddenNodes = this.network.nodes.filter((node: any) => node.type === "hidden");
		const outputNodes = this.network.nodes.filter((node: any) => node.type === "output");

		const canvasId = `network-canvas-${Math.random().toString(36).substr(2, 9)}`;

		let html = `<canvas id="${canvasId}" class="network-canvas" width="700" height="400"></canvas>`;

		setTimeout(() => {
			this.drawNetworkDiagram(canvasId, inputLabels, inputData, hiddenNodes, outputNodes);
		}, 0);

		return html;
	}

	private drawNetworkDiagram(
		canvasId: string,
		inputLabels: string[],
		inputData: InputData,
		hiddenNodes: any[],
		outputNodes: any[]
	): void {
		const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const width = canvas.width;
		const height = canvas.height;
		const padding = 40;
		const nodeRadius = 9;

		ctx.fillStyle = "rgba(0, 10, 0, 0.3)";
		ctx.fillRect(0, 0, width, height);

		const inputValues = [inputData.centerGapDistance, inputData.closestPipeDistance, inputData.workingVelocity];
		const layers = [inputValues, hiddenNodes, outputNodes];
		const layerSpacing = (width - 2 * padding) / (layers.length - 1);
		const topMargin = 70;
		const bottomMargin = 30;

		ctx.strokeStyle = "rgba(0, 200, 0, 0.25)";
		ctx.lineWidth = 0.7;

		for (let l = 0; l < layers.length - 1; l++) {
			const currentLayer = layers[l];
			const nextLayer = layers[l + 1];
			const x1 = padding + l * layerSpacing;
			const x2 = padding + (l + 1) * layerSpacing;
			const layerHeight = height - topMargin - bottomMargin;

			for (let i = 0; i < currentLayer.length; i++) {
				let y1: number;
				if (currentLayer.length === 1) {
					y1 = topMargin + layerHeight / 2;
				} else {
					y1 = topMargin + (layerHeight / (currentLayer.length - 1)) * i;
				}

				for (let j = 0; j < nextLayer.length; j++) {
					let y2: number;
					if (nextLayer.length === 1) {
						y2 = topMargin + layerHeight / 2;
					} else {
						y2 = topMargin + (layerHeight / (nextLayer.length - 1)) * j;
					}

					ctx.beginPath();
					ctx.moveTo(x1, y1);
					ctx.lineTo(x2, y2);
					ctx.stroke();
				}
			}
		}

		const drawLayer = (layer: any[], x: number, isInput: boolean, isOutput: boolean, values?: number[], labels?: string[]) => {
			const layerHeight = height - topMargin - bottomMargin;
			const nodeCount = layer.length;
			const nodeSpacing = nodeCount > 1 ? layerHeight / (nodeCount - 1) : 0;

			layer.forEach((item: any, idx: number) => {
				let y: number;
				if (nodeCount === 1) {
					y = topMargin + layerHeight / 2;
				} else {
					y = topMargin + idx * nodeSpacing;
				}
				let value: number;
				let color: string;

				if (isInput) {
					value = values![idx] || 0;
					const intensity = Math.abs(value);
					color = "rgb(100, 150, 200)";
					ctx.globalAlpha = 0.5 + intensity * 0.5;
				} else if (isOutput) {
					value = item.activation || 0;
					color = value > 0.5 ? "rgb(0, 200, 0)" : "rgb(255, 80, 80)";
					ctx.globalAlpha = 0.4 + Math.abs(value) * 0.6;
				} else {
					value = item.activation || 0;
					const intensity = Math.abs(value);
					color = value > 0 ? "rgb(100, 200, 255)" : "rgb(200, 100, 255)";
					ctx.globalAlpha = 0.4 + intensity * 0.6;
				}

				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
				ctx.fill();

				ctx.strokeStyle = color;
				ctx.lineWidth = 1;
				ctx.stroke();
				ctx.globalAlpha = 1;

				if (isInput && labels) {
					ctx.fillStyle = "#00dd00";
					ctx.font = "bold 14px monospace";
					ctx.textAlign = "center";
					ctx.fillText(labels[idx], x, y - 15);
					ctx.font = "12px monospace";
					ctx.fillText(value.toFixed(2), x, y + 23);
				}
			});
		};

		drawLayer(inputValues.map((_v, i) => ({ value: _v })), padding, true, false, inputValues, inputLabels);
		drawLayer(hiddenNodes, padding + layerSpacing, false, false);
		drawLayer(outputNodes, padding + 2 * layerSpacing, false, true);

		ctx.fillStyle = "#911cffff";
		ctx.font = "bold 16px monospace";
		ctx.textAlign = "center";
		ctx.fillText("INPUT", padding, 30);
		ctx.fillText(`HIDDEN`, padding + layerSpacing, 30);
		ctx.fillText("OUTPUT", padding + 2 * layerSpacing, 30);
	}
}
