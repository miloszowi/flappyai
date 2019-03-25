import { config } from "./config/Config";
import { GenerationData } from "./interfaces/GenerationData";
import { NeatapticConnection } from "./interfaces/NeatapticConnection";
import { NeatapticNode } from "./interfaces/NeatapticNode";
import { Bird } from "./objects/Bird";
import { Wall } from "./objects/Wall";
import { Renderer } from "./Renderer";
const neataptic = require("neataptic");

export class Generation {
    public size: number = 0;

    private _birds: Array<Bird> = [];

    private _generation = 1;

    private elites: Array<Bird> = [];

    private mutationChance: number;

    private hiddenLayerSize: number;

    private pipeDistance: number;

    private pipeGap: number;

    private breedingMethod: string;

    private spawningWalls: any;

    constructor() {
        this.mutationChance = config.mutationChance / 100;
        this.size = config.size;
        this.hiddenLayerSize = config.hiddenLayerSize;
        this.breedingMethod = config.breedingMethod;
        this.pipeDistance = Renderer.getInstance().pixi.screen.width * (config.pipeDistance / 100) + 100;
        this.pipeGap = Renderer.getInstance().pixi.screen.height * (config.pipeGap / 100);
        Renderer.getInstance().gap = this.pipeGap;
        Renderer.getInstance().distance = this.pipeDistance;
        Renderer.getInstance().birdsTotal = this.size;
        Renderer.getInstance().birdsAlive = this.size;
        Renderer.getInstance().generation = this._generation;
        this.initialize();
    }

    public get birds(): Array<Bird> {
        return this._birds;
    }

    public set birds(value: Array<Bird>) {
        this._birds = value;
    }

    public get generation(): number {
        return this._generation;
    }

    public set generation(value: number) {
        this._generation = value;
    }

    public nextGeneration(): void {
        Renderer.getInstance().addToChart(`${this.generation}`, Renderer.getInstance().pipesCount);
        this.generation += 1;
        Renderer.getInstance().generation = this.generation;
        Renderer.getInstance().pipesCount = 0;
        clearInterval(this.spawningWalls);
        const [ CHROMOSOME_A, CHROMOSOME_B ] = this.getBestChromosomes();
        this.killPopulation();

        for (let i = 0; i < this.size; i++) {
            const bird = Renderer.getInstance().createBird(this.hiddenLayerSize);
            const chromosome = this.crossOver(CHROMOSOME_A, CHROMOSOME_B, this.breedingMethod);
            if (Math.random() < 0.98) {
                bird.setChromosome(chromosome, this.mutationChance);
            }
            this.birds.push(bird);
        }

        const filter = Renderer.getInstance().getFilter();
        for (let i = 0; i < 2; i++) {
            const index = i + this.size - 2;
            this.birds[index].network = this.elites[i].network;
            this.birds[index].sprite.filters = [filter];
            this.birds[index].sprite.texture = this.birds[i].textureElite;
        }

        Renderer.getInstance().updateMutated();
        Renderer.getInstance().mutated = 0;
        Renderer.getInstance().birdsAlive = this.size;
        Renderer.getInstance().createWalls();
    }

    public getBestChromosomes(): Array<Array<number>> {
        const [ A, B ] = this.birds.sort( (a,b) => {
            return b.fitness - a.fitness;
        });

        const CHROMOSOME_A: Array<number> = [],
            CHROMOSOME_B: Array<number> = [];

        A.network.connections.map((connection: NeatapticConnection)  => {
            CHROMOSOME_A.push(connection.weight);
        });
        A.network.nodes.map((node: NeatapticNode) => {
            CHROMOSOME_A.push(node.bias);
        });

        B.network.connections.map((connection: NeatapticConnection)  => {
            CHROMOSOME_B.push(connection.weight);
        });
        B.network.nodes.map((node: NeatapticNode) => {
            CHROMOSOME_B.push(node.bias);
        });

        this.setElites(A, B);

        return [ CHROMOSOME_A, CHROMOSOME_B ];
    }

    private initialize(): void {
        Renderer.getInstance().createWalls();
        for (let i = 0; i < this.size; i++) {
            this._birds.push(Renderer.getInstance().createBird(this.hiddenLayerSize));
        }

        setInterval(() => {
            if (this.hasDiedOut()) {
                this.nextGeneration();
            }
        }, 100);
    }

    private killPopulation(): void {
        this._birds.forEach((bird: Bird) => {
            bird.die();
        });
        Renderer.getInstance().walls.forEach((walls: Array<Wall>) => {
            const [ top, bottom ] = walls;
            top.hide();
            bottom.hide();
        });
        Renderer.getInstance().walls = [];
        Renderer.getInstance().birdsAlive = this.size;
        Renderer.getInstance().updateInfo();
        this.birds = [];
    }

    private hasDiedOut(): boolean {
        let counter = 0;
        this.birds.forEach( (bird: Bird) => {
            if (!bird.alive) {
                counter += 1;
            }
        });
        const diedOut = counter === this.size;
        Renderer.getInstance().updateInfo();
        return diedOut;
    }

    private crossOver(CHROMOSOME_A: Array<number>, CHROMOSOME_B: Array<number>, breedingMethod: string): Array<number>{
        const offspring: Array<number> = [];
        if (breedingMethod === "uniform") {
            CHROMOSOME_A.map((x: number, i: number) => {
                offspring.push(Math.random() > 0.5 ? x : CHROMOSOME_B[i]);
            });
            return offspring;
        } else if(breedingMethod === "one-point") {
            const length = CHROMOSOME_A.length,
                  point = Math.round(Math.random() * length);
            CHROMOSOME_A.map((x: number, i: number) => {
                offspring.push(i > point ? x : CHROMOSOME_B[i]);
            });
        }
        return offspring;
    }

    private setElites(A: Bird, B: Bird): void {
        this.elites = [A, B];
    }
}
