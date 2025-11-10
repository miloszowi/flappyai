import { config } from "./config/Config";
import { BreedingMethod } from "./enums/BreedingMethod";
import { NeatapticConnection } from "./interfaces/NeatapticConnection";
import { NeatapticNode } from "./interfaces/NeatapticNode";
import { Bird } from "./objects/Bird";
import { Wall } from "./objects/Wall";
import { Renderer } from "./Renderer";

export class Generation {
    public size: number = 0;

    private renderer: Renderer;

    private birds: Array<Bird> = [];

    private generation = 1;

    private elites: Array<Bird> = [];

    private mutationChance: number;

    private hiddenLayerSize: number;

    private pipeDistance: number;

    private pipeGap: number;

    private breedingMethod: BreedingMethod;

    constructor(renderer: Renderer) {
        this.renderer = renderer;

        this.mutationChance = config.mutationChance / 100;
        this.size = config.size;
        this.hiddenLayerSize = config.hiddenLayerSize;
        this.breedingMethod = config.breedingMethod;

        this.pipeDistance = this.renderer.pixi.screen.width * (config.pipeDistance / 100) + 100;
        this.pipeGap = this.renderer.pixi.screen.height * (config.pipeGap / 100);

        this.renderer.gap = this.pipeGap;
        this.renderer.distance = this.pipeDistance;
        this.renderer.birdsTotal = this.size;
        this.renderer.birdsAlive = this.size;
        this.renderer.generation = this.generation;

        this.initialize();
    }

    public nextGeneration(): void {
        this.generation += 1;

        const sortedBirds = [...this.birds].sort((a, b) => b.fitness - a.fitness);

        const eliteCount = 2;
        const elites = sortedBirds.slice(0, eliteCount);

        const breedingPoolSize = Math.max(4, Math.floor(this.size * 0.5));
        const breedingPool = sortedBirds.slice(0, breedingPoolSize);
        const breedingChromosomes = breedingPool.map(bird => this.extractChromosome(bird));

        this.terminate();

        for (let i = 0; i < this.size; i++) {
            const bird = this.renderer.createBird(this.hiddenLayerSize);

            if (i < eliteCount) {
                const eliteChromosome = this.extractChromosome(elites[i]);
                bird.setChromosome(eliteChromosome, 0);
            } else if (i < this.size - Math.floor(this.size * 0.1)) {
                const parentAIndex = Math.floor(Math.random() * breedingChromosomes.length);
                const parentBIndex = Math.floor(Math.random() * breedingChromosomes.length);

                const chromosomeA = breedingChromosomes[parentAIndex];
                const chromosomeB = breedingChromosomes[parentBIndex];

                const offspring = this.crossOver(chromosomeA, chromosomeB, this.breedingMethod);
                bird.setChromosome(offspring, this.mutationChance);
            } else {

            }

            this.birds.push(bird);
        }

        const filter = this.renderer.getFilter();
        for (let i = 0; i < eliteCount; i++) {
            this.birds[i].sprite.filters = [filter];
            this.birds[i].sprite.texture = this.birds[i].textureElite;
        }

        this.renderer.generation = this.generation;
        this.renderer.nextGeneration();
    }

    private extractChromosome(bird: Bird): Array<number> {
        const chromosome: Array<number> = [];

        bird.network.connections.forEach((connection: NeatapticConnection) => {
            chromosome.push(connection.weight);
        });
        bird.network.nodes.forEach((node: NeatapticNode) => {
            chromosome.push(node.bias);
        });

        return chromosome;
    }

    public getBestChromosomes(): Array<Array<number>> {
        const [A, B] = this.birds.sort((a, b) => {
            return b.fitness - a.fitness;
        });

        const CHROMOSOME_A: Array<number> = [],
            CHROMOSOME_B: Array<number> = [];

        A.network.connections.map((connection: NeatapticConnection) => {
            CHROMOSOME_A.push(connection.weight);
        });
        A.network.nodes.map((node: NeatapticNode) => {
            CHROMOSOME_A.push(node.bias);
        });

        B.network.connections.map((connection: NeatapticConnection) => {
            CHROMOSOME_B.push(connection.weight);
        });
        B.network.nodes.map((node: NeatapticNode) => {
            CHROMOSOME_B.push(node.bias);
        });

        this.setElites(A, B);

        return [CHROMOSOME_A, CHROMOSOME_B];
    }

    private initialize(): void {
        this.renderer.createWalls();

        for (let i = 0; i < this.size; i++) {
            this.birds.push(
                this.renderer.createBird(this.hiddenLayerSize)
            );
        }

        setInterval(() => {
            if (this.hasDiedOut()) {
                this.nextGeneration();
            }
        }, 100);
    }

    private terminate(): void {
        this.birds.forEach((bird: Bird) => {
            bird.die();
        });

        this.renderer.walls.forEach((walls: Array<Wall>) => {
            const [top, bottom] = walls;
            top.hide();
            bottom.hide();
        });

        this.renderer.walls = [];
        this.renderer.birdsAlive = this.size;
        this.renderer.updateInfo();
        this.birds = [];
    }

    private hasDiedOut(): boolean {
        return this.renderer.birdsAlive === 0;
    }

    private crossOver(CHROMOSOME_A: Array<number>, CHROMOSOME_B: Array<number>, breedingMethod: BreedingMethod): Array<number> {
        const offspring: Array<number> = [];

        if (breedingMethod === BreedingMethod.UNIFORM) {
            CHROMOSOME_A.forEach((x: number, i: number) => {
                offspring.push(Math.random() > 0.5 ? x : CHROMOSOME_B[i]);
            });

            return offspring;
        }

        if (breedingMethod === BreedingMethod.ONE_POINT) {
            const point = Math.floor(Math.random() * CHROMOSOME_A.length);

            CHROMOSOME_A.forEach((x: number, i: number) => {
                offspring.push(i < point ? x : CHROMOSOME_B[i]);
            });
        }

        return offspring;
    }

    private setElites(A: Bird, B: Bird): void {
        this.elites = [A, B];
    }
}
