import * as PIXI from "pixi.js";
import { Entity } from "../Interfaces/Entity";
import { NeatapticConnection } from "../Interfaces/NeatapticConnection";
import { NeatapticNode } from "../Interfaces/NeatapticNode";
import { Renderer } from "../Renderer";
import { Wall } from "./Wall";
import { InputData } from "../interfaces/InputData";
import { NotificationService } from "../services/NotificationService";

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

	public isElite: boolean = false;

	public network: any;

	public birdIndex: number = 0;

	public readonly sprite: PIXI.Sprite = new PIXI.Sprite(PIXI.Texture.WHITE);

	public textureDefault: PIXI.Texture = PIXI.Texture.fromImage("birds/bird_default.png");

	public textureElite: PIXI.Texture = PIXI.Texture.fromImage("birds/bird_elite.png");

	public line: PIXI.Graphics = new PIXI.Graphics();

	private renderer: Renderer;

	private gravity: number = 0.6;

	private minVelocity: number = -12;

	private maxVelocity: number = 14;

	private statsTooltip: HTMLElement | null = null;

	public lastInputData: InputData = {
		centerGapDistance: 0,
		closestPipeDistance: 0,
		workingVelocity: 0
	};

	public lastRawInputData: InputData = {
		centerGapDistance: 0,
		closestPipeDistance: 0,
		workingVelocity: 0
	};

	public lastPipeIndex: number = 0;

	private isDying: boolean = false;

	private hitFlashDuration: number = 0.2;

	private hitFlashTimer: number = 0;

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
		this.fitness = 0;
		this.score = 0;

		this.setupNetwork(hiddenLayerSize);
		this.setupHoverEvents();
	}

	public becomeElite(): void {
		this.isElite = true;
		this.alive = true;
		this.score = 0;
		this.sprite.filters = [this.renderer.getFilter()];
		this.sprite.texture = this.textureElite;
		this.renderer.pixi.stage.addChild(this.sprite)
	}

	private setupHoverEvents(): void {
		this.sprite.on("pointerover", () => {
			this.showStatsTooltip();
		});
	}

	public update(delta: number): void | boolean {
		if (this.isDying) {
			this.acceleration += 0.8 * delta;
			this.y += this.velocity * delta;
			this.velocity += this.acceleration;
			this.acceleration = 0;

			this.sprite.rotation += 0.15;

			this.hitFlashTimer += delta;
			this.render();

			const screenBottom = this.renderer.pixi.screen.height;
			if (this.y > screenBottom) {
				this.renderer.pixi.stage.removeChild(this.sprite);
				this.isDying = false;
			}

			return false;
		}

		if (!this.alive) {
			return false;
		}

		if (this.decidedToJump()) {
			this.jump(100 * delta);
		}

		this.fitness += 0.01;

		this.acceleration += 0.8 * delta;
		this.y += this.velocity * delta;
		this.velocity += this.acceleration;
		this.acceleration = 0;

		this.velocity = Math.max(
			this.minVelocity,
			Math.min(this.velocity, this.maxVelocity)
		);

		if (this.isCollision() || this.flewOut()) {
			this.die();
			this.score = this.renderer.pipesCount;

			if (this.flewOut()) {
				this.fitness -= 50;
			}

			return false;
		}

		const distToGapCenter = this.renderer.distanceToGapCenter(this.y);
		const normalizedDist = Math.abs(distToGapCenter) / this.renderer.pixi.screen.height;

		if (normalizedDist < 0.1) {
			this.fitness += 0.02;
		}

		this.render();
	}

	public render(): void {
		this.sprite.x = this.x;
		this.sprite.y = this.y;
		if (!this.isDying) {
			this.sprite.rotation = this.velocity / 20;
		} else {
			const flashProgress = (this.hitFlashTimer / this.hitFlashDuration) % 1;
			const isFlashing = flashProgress < 0.5;
			this.sprite.tint = isFlashing ? 0xFF6B6B : 0xFFFFFF;
		}
	}

	public remove(): void {
		this.renderer.pixi.stage.removeChild(this.sprite);

		if ((this as any).tickerCallback) {
			this.renderer.pixi.ticker.remove((this as any).tickerCallback);
			(this as any).tickerCallback = null;
		}
	}

	public die(): void {
		this.alive = false;
		this.isDying = true;
		this.hitFlashTimer = 0;
		this.hideStatsTooltip();
		this.fitness += this.score * 1.5;

		this.renderer.pixi.stage.removeChild(this.sprite);
		this.renderer.pixi.stage.addChild(this.sprite);

		this.renderer.birdsAlive -= 1;
		this.renderer.updateInfo();
	}

	public setChromosome(chromosome: Array<number>, mutationChance: number): void {
		let chromosomeIndex = 0;

		this.network.connections.map((_connection: NeatapticConnection, index: number) => {
			this.network.connections[index].weight = chromosome[chromosomeIndex++];

			if (Math.random() < mutationChance) {
				if (Math.random() < 0.1) {
					this.network.connections[index].weight = Math.random() * 2 - 1;
				} else {
					this.network.connections[index].weight += (Math.random() - 0.5) * 0.4;
					this.network.connections[index].weight = Math.max(-1, Math.min(1, this.network.connections[index].weight));
				}
			}
		});

		this.network.nodes.map((_node: NeatapticNode, index: number) => {
			this.network.nodes[index].bias = chromosome[chromosomeIndex++];

			if (Math.random() < mutationChance) {
				if (Math.random() < 0.1) {
					this.network.nodes[index].bias = Math.random() * 2 - 1;
				} else {
					this.network.nodes[index].bias += (Math.random() - 0.5) * 0.4;
					this.network.nodes[index].bias = Math.max(-1, Math.min(1, this.network.nodes[index].bias));
				}
				this.renderer.mutated += 1;
			}
		});
	}

	private jump(x: number): void {
		this.acceleration -= x;
	}

	private decidedToJump(): boolean {
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

		const activationValue = this.network.activate(input)[0];
		const decision = activationValue > 0.5;

		this.renderer.updateBirdSummary(this, this.birdIndex, decision, activationValue);
		return decision;
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
			if (this.x + this.width + 10 > top.x + top.width) {
				this.renderer.pipesCount += 1;
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

		const inputLayerSize = 3;
		const totalNodes = this.network.nodes.length;
		const outputNodeIndex = totalNodes - 1;

		this.network.connections.forEach((connection: NeatapticConnection) => {
			connection.weight = Math.random() * 2 - 1;
		});

		this.network.nodes.forEach((node: NeatapticNode, index: number) => {
			if (index >= inputLayerSize) {
				node.bias = Math.random() * 2 - 1;
			}
		});
	}

	public saveChromosome(): string {
		const chromosome = {
			weights: this.network.connections.map((conn: NeatapticConnection) => conn.weight),
			biases: this.network.nodes.map((node: NeatapticNode) => node.bias),
			fitness: this.fitness,
			score: this.score,
			timestamp: new Date().toISOString()
		};
		return JSON.stringify(chromosome);
	}

	public loadChromosome(chromosomeJson: string): void {
		try {
			const chromosome = JSON.parse(chromosomeJson);

			if (chromosome.weights && chromosome.weights.length === this.network.connections.length) {
				chromosome.weights.forEach((weight: number, index: number) => {
					this.network.connections[index].weight = weight;
				});
			}

			if (chromosome.biases && chromosome.biases.length === this.network.nodes.length) {
				chromosome.biases.forEach((bias: number, index: number) => {
					this.network.nodes[index].bias = bias;
				});
			}
		} catch (error) {
			console.error("Failed to load chromosome:", error);
		}
	}

	private handleSaveChromosome(): void {
		const { ModelManager } = require("../services/ModelManager");
		const modelName = prompt("Enter model name:", `Bird_${this.score}_${Date.now()}`);
		if (modelName) {
			const chromosome = this.saveChromosome();
			ModelManager.saveModel(modelName, chromosome, this.network.nodes.length - 1);
			NotificationService.success(`Model downloaded: ${modelName}`);
		}
	}

	private handleLoadChromosome(): void {
		const { ModelManager } = require("../services/ModelManager");
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";
		input.onchange = async (event: any) => {
			const file = event.target.files[0];
			if (file) {
				const model = await ModelManager.loadFromFile(file);
				if (model) {
					this.loadChromosome(JSON.stringify(model.chromosome));
					NotificationService.success(`Loaded: ${model.name}`);
				} else {
					NotificationService.error("Failed to load model from file");
				}
			}
		};
		input.click();
	}


	private generateNetworkVisualization(): string {
		const inputLabels = ["gap", "pipe", "vel"];
		const inputData = this.lastInputData;
		const hiddenNodes = this.network.nodes.filter((node: any) => node.type === "hidden");
		const outputNodes = this.network.nodes.filter((node: any) => node.type === "output");

		const canvasId = `network-canvas-${Math.random().toString(36).substr(2, 9)}`;
		const dpr = window.devicePixelRatio || 1;

		let html = `<div class="network-container"><canvas id="${canvasId}" class="network-canvas"></canvas></div>`;

		setTimeout(() => {
			const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
			if (canvas) {
				const container = canvas.parentElement;
				if (container) {
					const rect = container.getBoundingClientRect();
					const width = rect.width;
					const height = rect.height;

					canvas.width = width * dpr;
					canvas.height = height * dpr;

					canvas.style.width = `${width}px`;
					canvas.style.height = `${height}px`;

					const ctx = canvas.getContext("2d");
					if (ctx) {
						ctx.scale(dpr, dpr);
					}
				}
			}
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

		const dpr = window.devicePixelRatio || 1;
		const width = canvas.width / dpr;
		const height = canvas.height / dpr;
		const padding = Math.max(width * 0.08, 30);
		const nodeRadius = Math.max(width * 0.012, 6);

		ctx.fillStyle = "rgba(0, 10, 0, 0.3)";
		ctx.fillRect(0, 0, width, height);

		const inputValues = [inputData.centerGapDistance, inputData.closestPipeDistance, inputData.workingVelocity];
		const layers = [inputValues, hiddenNodes, outputNodes];
		const layerSpacing = (width - 2 * padding) / (layers.length - 1);
		const topMargin = Math.max(height * 0.18, 50);
		const bottomMargin = Math.max(height * 0.08, 20);

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

					const midX = (x1 + x2) / 2;
					const midY = (y1 + y2) / 2;
					const connectionIndex = i * nextLayer.length + j;
					const connection = this.network.connections[connectionIndex];
					const weight = connection ? connection.weight : 0;
					const weightText = weight.toFixed(2);

					const fontSize = Math.max(width * 0.013, 7) - 3;
					ctx.font = `${fontSize}px monospace`;
					const textMetrics = ctx.measureText(weightText);
					const textWidth = textMetrics.width;
					const textHeight = fontSize;
					const textPadding = 2;

					ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
					ctx.fillRect(midX - textWidth / 2 - textPadding, midY - textHeight / 2 - textPadding, textWidth + textPadding * 2, textHeight + textPadding * 2);

					ctx.fillStyle = "#000000";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillText(weightText, midX, midY);
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
					const labelFontSize = Math.max(width * 0.02, 11) - 5;
					const valueFontSize = Math.max(width * 0.018, 9) - 5;
					const labelOffset = width * 0.02;

					ctx.fillStyle = "#00dd00";
					ctx.font = `bold ${labelFontSize}px monospace`;
					ctx.textAlign = "right";
					ctx.fillText(labels[idx], x - labelOffset, y);

					ctx.font = `${valueFontSize}px monospace`;
					ctx.textAlign = "center";
					ctx.fillText(value.toFixed(2), x, y + labelFontSize + 7);
				} else if (!isInput) {
					const bias = item.bias || 0;
					const stableFontSize = Math.max(width * 0.015, 8);

					if (isOutput) {
						ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
						ctx.font = `${stableFontSize}px monospace`;
						ctx.textAlign = "center";
						ctx.textBaseline = "middle";
						ctx.fillText(`a:${value.toFixed(2)}`, x, y - stableFontSize - 5);

						ctx.fillStyle = "rgba(255, 150, 150, 0.8)";
						ctx.font = `${stableFontSize}px monospace`;
						ctx.textAlign = "center";
						ctx.textBaseline = "middle";
						ctx.fillText(`b:${bias.toFixed(2)}`, x, y + stableFontSize + 5);
					} else {
						const nodeCount = layer.length;
						const baseFontSize = Math.max(width * 0.015, 8);
						const scaledFontSize = Math.max(baseFontSize * (5 / nodeCount), 6) + 3;
						const offsetX = nodeRadius + 3;

						ctx.fillStyle = "rgba(100, 255, 200, 0.8)";
						ctx.font = `${scaledFontSize}px monospace`;
						ctx.textAlign = "left";
						ctx.textBaseline = "middle";
						ctx.fillText(`a:${value.toFixed(2)}`, x + offsetX, y - scaledFontSize / 2);

						ctx.fillStyle = "rgba(255, 150, 150, 0.8)";
						ctx.font = `${scaledFontSize}px monospace`;
						ctx.textAlign = "left";
						ctx.textBaseline = "middle";
						ctx.fillText(`b:${bias.toFixed(2)}`, x + offsetX, y + scaledFontSize / 2);
					}
				}
			});
		};

		drawLayer(inputValues.map((_v, i) => ({ value: _v })), padding, true, false, inputValues, inputLabels);
		drawLayer(hiddenNodes, padding + layerSpacing, false, false);
		drawLayer(outputNodes, padding + 2 * layerSpacing, false, true);

		const titleFontSize = Math.max(width * 0.024, 14);
		ctx.fillStyle = "#73f75bff";
		ctx.font = `bold ${titleFontSize}px monospace`;
		ctx.textAlign = "center";
		ctx.fillText("INPUT", padding, titleFontSize + 5);
		ctx.fillText(`HIDDEN`, padding + layerSpacing, titleFontSize + 5);
		ctx.fillText("OUTPUT", padding + 2 * layerSpacing, titleFontSize + 5);
	}

	private showStatsTooltip(): void {
		const existingTooltips = document.querySelectorAll(".bird-stats-tooltip");
		existingTooltips.forEach(tooltip => tooltip.remove());

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
								<div>Velocity: ${this.velocity.toFixed(2)}</div>
								<div>Y Position: ${this.y.toFixed(0)}</div>
								<div>Elite: ${this.isElite ? "YES" : "NO"}</div>
								<hr style="margin: 5px 0; border: none; border-top: 1px solid #00ff00;">
								<strong>Input Data</strong>
								<div>Gap distance: ${this.lastRawInputData.centerGapDistance} (norm: ${this.lastInputData.centerGapDistance})</div>
								<div>Pipe distance: ${this.lastRawInputData.closestPipeDistance} (norm: ${this.lastInputData.closestPipeDistance})</div>
								<div>Velocity: ${this.lastRawInputData.workingVelocity} (norm: ${this.lastInputData.workingVelocity})</div>
								<hr style="margin: 5px 0; border: none; border-top: 1px solid #00ff00;">
								<strong>Neural Network</strong>
								${networkViz}
								<hr style="margin: 5px 0; border: none; border-top: 1px solid #00ff00;">
								<div style="display: flex; gap: 8px; margin-top: 10px;">
									<button id="save-chromosome-btn" style="flex: 1; padding: 8px; background: #00aa00; color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: monospace;">💾 Save</button>
									<button id="load-chromosome-btn" style="flex: 1; padding: 8px; background: #0088ff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: monospace;">📥 Load</button>
								</div>
						</div>
				`;

		document.body.appendChild(this.statsTooltip);

		const saveBtn = this.statsTooltip.querySelector("#save-chromosome-btn") as HTMLButtonElement;
		const loadBtn = this.statsTooltip.querySelector("#load-chromosome-btn") as HTMLButtonElement;

		if (saveBtn) {
			saveBtn.addEventListener("click", () => this.handleSaveChromosome());
		}

		if (loadBtn) {
			loadBtn.addEventListener("click", () => this.handleLoadChromosome());
		}

		const clickOutsideHandler = (event: MouseEvent) => {
			if (this.statsTooltip && !this.statsTooltip.contains(event.target as Node)) {
				this.hideStatsTooltip();
				document.removeEventListener("click", clickOutsideHandler);
			}
		};

		setTimeout(() => {
			document.addEventListener("click", clickOutsideHandler);
		}, 0);

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
}
