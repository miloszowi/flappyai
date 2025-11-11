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

    private breedingMethod: BreedingMethod;

    constructor(renderer: Renderer) {
        this.renderer = renderer;

        this.mutationChance = config.mutationChance;
        this.size = config.size;
        this.hiddenLayerSize = config.hiddenLayerSize;
        this.breedingMethod = config.breedingMethod;

        this.renderer.generation = this.generation;

        this.initialize();
    }

    public nextGeneration(): void {
        this.generation++;

        const sortedBirds = [...this.birds].sort((a, b) => b.fitness - a.fitness);
        const { elites, breedingChromosomes } = this.selectParents(sortedBirds);

        this.terminate();

        const populationCounts = this.calculatePopulationDistribution();
        this.createNewPopulation(elites, breedingChromosomes, populationCounts);

        this.markElites(populationCounts.eliteCount);
        this.renderer.generation = this.generation;
        this.renderer.nextGeneration();
    }

    private selectParents(sortedBirds: Array<Bird>) {
        const ELITE_COUNT = 2;
        const BREEDING_POOL_PERCENTAGE = 0.5;

        const elites = sortedBirds.slice(0, ELITE_COUNT);

        const breedingPoolSize = Math.max(4, Math.floor(this.size * BREEDING_POOL_PERCENTAGE));
        const breedingPool = sortedBirds.slice(0, breedingPoolSize);
        const breedingChromosomes = breedingPool.map(bird => this.extractChromosome(bird));

        return { elites, breedingChromosomes };
    }

    private calculatePopulationDistribution() {
        const ELITE_PERCENTAGE = 0.02; // 2%
        const RANDOM_PERCENTAGE = 0.05; // 5%

        const eliteCount = Math.floor(this.size * ELITE_PERCENTAGE);
        const randomCount = Math.floor(this.size * RANDOM_PERCENTAGE);
        const offspringCount = this.size - eliteCount - randomCount;

        return { eliteCount, offspringCount, randomCount };
    }

    private createNewPopulation(
        elites: Array<Bird>,
        breedingChromosomes: Array<Array<number>>,
        counts: { eliteCount: number; offspringCount: number; randomCount: number }
    ) {
        for (let i = 0; i < counts.eliteCount; i++) {
            const bird = this.renderer.createBird(this.hiddenLayerSize);
            const eliteChromosome = this.extractChromosome(elites[i]);
            bird.setChromosome(eliteChromosome, 0);
            this.birds.push(bird);
        }

        for (let i = 0; i < counts.offspringCount; i++) {
            const bird = this.renderer.createBird(this.hiddenLayerSize);
            const offspring = this.breedRandomParents(breedingChromosomes);
            bird.setChromosome(offspring, this.mutationChance);
            this.birds.push(bird);
        }

        for (let i = 0; i < counts.randomCount; i++) {
            const bird = this.renderer.createBird(this.hiddenLayerSize);

            this.birds.push(bird);
        }
    }

    private breedRandomParents(breedingChromosomes: Array<Array<number>>): Array<number> {
        const parentAIndex = Math.floor(Math.random() * breedingChromosomes.length);
        const parentBIndex = Math.floor(Math.random() * breedingChromosomes.length);

        const chromosomeA = breedingChromosomes[parentAIndex];
        const chromosomeB = breedingChromosomes[parentBIndex];

        return this.crossOver(chromosomeA, chromosomeB, this.breedingMethod);
    }

    private markElites(eliteCount: number): void {
        const filter = this.renderer.getFilter();

        for (let i = 0; i < eliteCount; i++) {
            this.birds[i].sprite.filters = [filter];
            this.birds[i].sprite.texture = this.birds[i].textureElite;
        }
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

        document.addEventListener("keyup", e => {
            if (e.key == "n" || e.key == "N") {
                this.nextGeneration();
            }
        })
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

    private crossOver(chromosomeA: Array<number>, chromosomeB: Array<number>, breedingMethod: BreedingMethod): Array<number> {
        switch (breedingMethod) {
            case BreedingMethod.UNIFORM:
                return this.uniformCrossOver(chromosomeA, chromosomeB);
            case BreedingMethod.ONE_POINT:
                return this.onePointCrossOver(chromosomeA, chromosomeB);
            case BreedingMethod.TWO_POINT:
                return this.twoPointCrossOver(chromosomeA, chromosomeB);
            default:
                return chromosomeA;
        }
    }

    private uniformCrossOver(chromosomeA: Array<number>, chromosomeB: Array<number>): Array<number> {
        const offspring = chromosomeA.map((gene: number, index: number) =>
            Math.random() > 0.5 ? gene : chromosomeB[index]
        );

        console.group(`%c🧬 Uniform Crossover`, 'color: #00ff00; font-weight: bold; font-size: 14px;');
        console.log('%cParent A:', 'color: #ff6b6b; font-weight: bold;', chromosomeA.map(g => g.toFixed(2)));
        console.log('%cParent B:', 'color: #4ecdc4; font-weight: bold;', chromosomeB.map(g => g.toFixed(2)));
        console.log('%cOffspring:', 'color: #ffd93d; font-weight: bold;', offspring.map(g => g.toFixed(2)));
        console.log('%cMethod:', 'color: #95e1d3; font-style: italic;', 'Random selection from each parent at each position');
        console.groupEnd();

        return offspring;
    }

    private onePointCrossOver(chromosomeA: Array<number>, chromosomeB: Array<number>): Array<number> {
        const crossoverPoint = Math.floor(Math.random() * chromosomeA.length);

        const offspring = chromosomeA.map((gene: number, index: number) =>
            index < crossoverPoint ? gene : chromosomeB[index]
        );

        console.group(`%c🧬 One-Point Crossover (Point: ${crossoverPoint})`, 'color: #00ff00; font-weight: bold; font-size: 14px;');
        console.log('%cParent A:', 'color: #ff6b6b; font-weight: bold;', chromosomeA.map(g => g.toFixed(2)));
        console.log('%cParent B:', 'color: #4ecdc4; font-weight: bold;', chromosomeB.map(g => g.toFixed(2)));
        console.log('%cOffspring:', 'color: #ffd93d; font-weight: bold;', offspring.map(g => g.toFixed(2)));
        console.log('%cCrossover point at index:', 'color: #95e1d3; font-style: italic;', crossoverPoint);
        console.groupEnd();

        return offspring;
    }

    private twoPointCrossOver(chromosomeA: Array<number>, chromosomeB: Array<number>): Array<number> {
        let point1 = Math.floor(Math.random() * chromosomeA.length);
        let point2 = Math.floor(Math.random() * chromosomeA.length);

        if (point1 > point2) {
            [point1, point2] = [point2, point1];
        }

        const offspring = chromosomeA.map((gene: number, index: number) =>
            index < point1 || index >= point2 ? gene : chromosomeB[index]
        );

        console.group(`%c🧬 Two-Point Crossover (Points: ${point1}, ${point2})`, 'color: #00ff00; font-weight: bold; font-size: 14px;');
        console.log('%cParent A:', 'color: #ff6b6b; font-weight: bold;', chromosomeA.map(g => g.toFixed(2)));
        console.log('%cParent B:', 'color: #4ecdc4; font-weight: bold;', chromosomeB.map(g => g.toFixed(2)));
        console.log('%cOffspring:', 'color: #ffd93d; font-weight: bold;', offspring.map(g => g.toFixed(2)));
        console.log('%cMethod:', 'color: #95e1d3; font-style: italic;', `Take from A: [0-${point1}) and [${point2}-end], from B: [${point1}-${point2})`);
        console.groupEnd();

        return offspring;
    }
}
