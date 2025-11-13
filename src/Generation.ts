import { config } from "./config/Config";
import { BreedingMethod } from "./enums/BreedingMethod";
import { NeatapticConnection } from "./interfaces/NeatapticConnection";
import { NeatapticNode } from "./interfaces/NeatapticNode";
import { PopulationCounts } from "./interfaces/PopulationCounts";
import { GenerationResult } from "./interfaces/GenerationResult";
import { Bird } from "./objects/Bird";
import { Wall } from "./objects/Wall";
import { Renderer } from "./Renderer";
import { NotificationService } from "./services/NotificationService";

export class Generation {
    public size: number = 0;

    private renderer: Renderer;

    private birds: Bird[] = [];

    private generation: number = 1;

    private mutationChance: number;

    private hiddenLayerSize: number;

    private breedingMethod: BreedingMethod;

    private generationResults: GenerationResult[] = [];

    private intervalId: number | null = null;

    private keyupHandler: ((e: KeyboardEvent) => void) | null = null;

    private static readonly MAX_GENERATION_RESULTS = 100;

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

        let birdsWithScore = 0;
        let totalFitness = 0;
        for (const bird of sortedBirds) {
            if (bird.score >= 1) birdsWithScore++;
            totalFitness += bird.fitness;
        }

        const generationResult: GenerationResult = {
            generation: this.generation - 1,
            bestScore: sortedBirds[0].score,
            bestFitness: sortedBirds[0].fitness,
            avgFitness: totalFitness / sortedBirds.length,
            maxFitness: sortedBirds[0].fitness,
            birdsWithScoreGreaterThan1: birdsWithScore
        };
        this.generationResults.push(generationResult);

        if (this.generationResults.length > Generation.MAX_GENERATION_RESULTS) {
            this.generationResults.shift();
        }

        this.adaptMutationChance();

        const elites = sortedBirds.slice(0, 2);
        const topPerformers = sortedBirds.slice(0, Math.floor(sortedBirds.length * 0.10));

        this.terminate();

        const populationCounts = this.calculatePopulationDistribution(elites, topPerformers);
        this.createNewPopulation(elites, topPerformers, populationCounts);

        this.renderer.generation = this.generation;
        this.renderer.nextGenerationWithStats(this.renderer.pipesCount, birdsWithScore);
    }

    private calculatePopulationDistribution(elites: Bird[], topPerformers: Bird[]): PopulationCounts {
        const eliteCount = elites.length;

        const skilledBirds = topPerformers.filter((bird: Bird) => bird.score >= 1)
        let topPerformersCount: number;

        if (skilledBirds.length === 0) {
            topPerformersCount = Math.floor(this.size * 0.70);
        } else if (skilledBirds.length < 5) {
            topPerformersCount = Math.floor(this.size * 0.80);
        } else if (skilledBirds.length < 15) {
            topPerformersCount = Math.floor(this.size * 0.90);
        } else {
            topPerformersCount = Math.floor(this.size * 0.95);
        }

        const randomCount = this.size - eliteCount - topPerformersCount;

        return {
            eliteCount,
            topPerformersCount,
            randomCount
        };
    }

    private createNewPopulation(
        elites: Bird[],
        topPerformers: Bird[],
        counts: PopulationCounts
    ): void {
        let birdIndex = 0;

        const topPerformersChromosomes = topPerformers.map((bird: Bird) => this.extractChromosome(bird));

        for (let i = 0; i < counts.topPerformersCount; i++) {
            const bird = this.renderer.createBird(this.hiddenLayerSize);
            bird.birdIndex = birdIndex++;

            if (topPerformersChromosomes.length > 0) {
                const offspring = this.breedRandomParents(topPerformersChromosomes);
                bird.setChromosome(offspring, this.mutationChance);
            }

            this.birds.push(bird);
        }

        for (let i = 0; i < counts.randomCount; i++) {
            const bird = this.renderer.createBird(this.hiddenLayerSize);
            bird.birdIndex = birdIndex++;
            this.birds.push(bird);
        }

        elites.forEach((elite: Bird) => {
            const newElite = this.renderer.createBird(this.hiddenLayerSize);
            newElite.birdIndex = birdIndex++;

            const eliteChromosome = this.extractChromosome(elite);
            newElite.setChromosome(eliteChromosome, 0);
            newElite.becomeElite();

            this.birds.push(newElite);
        })

        this.renderer.birdsAlive = this.size

        NotificationService.info(`${counts.eliteCount} elites were passed to next generation`);
        NotificationService.info(`${counts.topPerformersCount} birds were populated by ${topPerformers.length} top performers`);
        NotificationService.info(`${counts.randomCount} birds were randomly generated`);
    }

    private breedRandomParents(breedingChromosomes: number[][]): number[] {
        const parentAIndex = Math.floor(Math.random() * breedingChromosomes.length);
        let parentBIndex = Math.floor(Math.random() * breedingChromosomes.length);

        if (breedingChromosomes.length > 1) {
            while (parentBIndex === parentAIndex) {
                parentBIndex = Math.floor(Math.random() * breedingChromosomes.length);
            }
        }
        const chromosomeA = breedingChromosomes[parentAIndex];
        const chromosomeB = breedingChromosomes[parentBIndex];

        return this.crossOver(chromosomeA, chromosomeB, this.breedingMethod);
    }

    private extractChromosome(bird: Bird): number[] {
        const chromosome: number[] = [];

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
            const bird = this.renderer.createBird(this.hiddenLayerSize);
            bird.birdIndex = i;
            this.birds.push(bird);
        }

        this.intervalId = setInterval(() => {
            if (this.hasDiedOut()) {
                this.nextGeneration();
            }

            this.renderer.updateBirdsPanel(this.birds);
        }, 100) as unknown as number;

        this.keyupHandler = (e: KeyboardEvent) => {
            if (e.key == "n" || e.key == "N") {
                this.nextGeneration();
            }
        };
        document.addEventListener("keyup", this.keyupHandler);
    }

    public cleanup(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        if (this.keyupHandler !== null) {
            document.removeEventListener("keyup", this.keyupHandler);
            this.keyupHandler = null;
        }
    }

    private terminate(): void {
        this.birds.forEach((bird: Bird) => {
            bird.remove();
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
        return this.renderer.birdsAlive <= 0;
    }

    private crossOver(chromosomeA: number[], chromosomeB: number[], breedingMethod: BreedingMethod): number[] {
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

    private uniformCrossOver(chromosomeA: number[], chromosomeB: number[]): number[] {
        const offspring = chromosomeA.map((gene: number, index: number) =>
            Math.random() > 0.5 ? gene : chromosomeB[index]
        );

        return offspring;
    }

    private onePointCrossOver(chromosomeA: number[], chromosomeB: number[]): number[] {
        const crossoverPoint = Math.floor(Math.random() * chromosomeA.length);

        const offspring = chromosomeA.map((gene: number, index: number) =>
            index < crossoverPoint ? gene : chromosomeB[index]
        );

        return offspring;
    }

    private twoPointCrossOver(chromosomeA: number[], chromosomeB: number[]): number[] {
        let point1 = Math.floor(Math.random() * chromosomeA.length);
        let point2 = Math.floor(Math.random() * chromosomeA.length);

        if (point1 > point2) {
            [point1, point2] = [point2, point1];
        }

        const offspring = chromosomeA.map((gene: number, index: number) =>
            index < point1 || index >= point2 ? gene : chromosomeB[index]
        );

        return offspring;
    }

    public isProgressing(windowSize: number = 5): boolean {
        if (this.generationResults.length < windowSize * 2) {
            return true;
        }

        const recentResults = this.generationResults.slice(-windowSize);
        const olderResults = this.generationResults.slice(-windowSize * 2, -windowSize);

        if (olderResults.length === 0) {
            return true;
        }

        const recentAvgBestScore = recentResults.reduce((sum, r) => sum + r.bestScore, 0) / recentResults.length;
        const olderAvgBestScore = olderResults.reduce((sum, r) => sum + r.bestScore, 0) / olderResults.length;

        const recentAvgFitness = recentResults.reduce((sum, r) => sum + r.avgFitness, 0) / recentResults.length;
        const olderAvgFitness = olderResults.reduce((sum, r) => sum + r.avgFitness, 0) / olderResults.length;

        const recentAvgBirdsScoring = recentResults.reduce((sum, r) => sum + r.birdsWithScoreGreaterThan1, 0) / recentResults.length;
        const olderAvgBirdsScoring = olderResults.reduce((sum, r) => sum + r.birdsWithScoreGreaterThan1, 0) / olderResults.length;

        const scoreDifference = recentAvgBestScore - olderAvgBestScore;
        const scoreImproved = scoreDifference >= 1;

        const fitnessDifference = recentAvgFitness - olderAvgFitness;
        const fitnessImproved = fitnessDifference > olderAvgFitness * 0.10;

        const birdsDifference = recentAvgBirdsScoring - olderAvgBirdsScoring;
        const birdsImproved = birdsDifference >= 1 || birdsDifference > olderAvgBirdsScoring * 0.15;

        return scoreImproved || fitnessImproved || birdsImproved;
    }

    public getGenerationResults(): GenerationResult[] {
        return this.generationResults;
    }

    private adaptMutationChance(): void {
        if (this.generation < 10 || this.generation % 3 !== 0) {
            return;
        }

        if (this.isProgressing()) {
            this.mutationChance -= 0.01;
            NotificationService.info(`Evolution is progressing, decreasing mutation chance to ${this.mutationChance}.`);
        } else {
            this.mutationChance += 0.01;
            NotificationService.info(`Progress is too low, increasing mutation chance to ${this.mutationChance}.`);
        }
    }
}
