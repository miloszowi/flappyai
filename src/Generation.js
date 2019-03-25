"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Config_1 = require("./config/Config");
const Renderer_1 = require("./Renderer");
const neataptic = require("neataptic");
class Generation {
    constructor(data = Config_1.Config) {
        this.size = 0;
        this._birds = [];
        this._generation = 1;
        this.elites = [];
        this.bestFitness = 0;
        this.bestScore = 0;
        this.mutationChance = Config_1.Config.mutationChance / 100;
        this.pipeSpawnInterval = Config_1.Config.pipeSpawnInterval * 1000;
        this.size = Config_1.Config.size;
        this.hiddenLayerSize = Config_1.Config.hiddenLayerSize;
        this.breedingMethod = Config_1.Config.breedingMethod;
        this.pipeDistance = Renderer_1.Renderer.getInstance().pixi.screen.height * (Config_1.Config.pipeDistance / 100);
        Renderer_1.Renderer.getInstance().distance = this.pipeDistance;
        this.initialize();
    }
    get birds() {
        return this._birds;
    }
    set birds(value) {
        this._birds = value;
    }
    get generation() {
        return this._generation;
    }
    set generation(value) {
        this._generation = value;
    }
    nextGeneration() {
        this.generation += 1;
        Renderer_1.Renderer.getInstance().generationCount.text = "Current generation: " + this.generation;
        Renderer_1.Renderer.getInstance().pipesCount = 0;
        clearInterval(this.spawningWalls);
        const [DNA_A, DNA_B] = this.getBestChromosomes();
        this.killPopulation();
        for (let i = 0; i < this.size; i++) {
            const bird = Renderer_1.Renderer.getInstance().createBird(this.hiddenLayerSize);
            const DNA = this.crossOver(DNA_A, DNA_B, this.breedingMethod);
            bird.update();
            bird.setDNA(DNA, this.bestScore < 2 ? 0.1 : this.mutationChance);
            this.birds.push(bird);
        }
        for (let i = 0; i < 2; i++) {
            this.birds[i].network = this.elites[i].network;
            this.birds[i].nameDisplay.text = this.birds[i].nameDisplay.text;
            this.birds[i].image = this.elites[i].image;
        }
        this.spawningWalls = setInterval(() => {
            Renderer_1.Renderer.getInstance().createWallsPair();
        }, this.pipeSpawnInterval);
        setInterval(() => {
            if (this.hasDiedOut()) {
                this.nextGeneration();
            }
        }, 100);
    }
    getBestChromosomes() {
        const [A, B] = this.birds.sort((a, b) => {
            return b.fitness - a.fitness;
        });
        const DNA_A = [], DNA_B = [];
        A.network.connections.map((connection) => {
            DNA_A.push(connection.weight);
        });
        A.network.nodes.map((node) => {
            DNA_A.push(node.bias);
        });
        B.network.connections.map((connection) => {
            DNA_B.push(connection.weight);
        });
        B.network.nodes.map((node) => {
            DNA_B.push(node.bias);
        });
        this.setElites(A, B);
        return [DNA_A, DNA_B];
    }
    initialize() {
        Renderer_1.Renderer.getInstance().createWallsPair();
        this.spawningWalls = setInterval(() => {
            Renderer_1.Renderer.getInstance().createWallsPair();
        }, this.pipeSpawnInterval);
        for (let i = 0; i < this.size; i++) {
            this._birds.push(Renderer_1.Renderer.getInstance().createBird(this.hiddenLayerSize));
        }
        this.bestScore = 0;
        setInterval(() => {
            if (this.hasDiedOut()) {
                this.nextGeneration();
            }
        }, 100);
    }
    killPopulation() {
        this._birds.forEach((bird) => {
            bird.die();
        });
        Renderer_1.Renderer.getInstance().walls.forEach((walls) => {
            const [top, bottom] = walls;
            top.hide();
            bottom.hide();
        });
        Renderer_1.Renderer.getInstance().walls = [];
        this.birds = [];
    }
    hasDiedOut() {
        let counter = 0;
        this.birds.forEach(bird => {
            if (!bird.alive) {
                counter += 1;
            }
            this.bestScore = bird.score > this.bestScore ? bird.score : this.bestScore;
        });
        const diedOut = counter === this.size;
        Renderer_1.Renderer.getInstance().fitnessBest.text = "Best score: " + this.bestScore;
        return diedOut;
    }
    crossOver(DNA_A, DNA_B, breedingMethod) {
        const offspring = [];
        if (breedingMethod === "uniform") {
            DNA_A.map((x, i) => {
                offspring.push(Math.random() > 0.5 ? x : DNA_B[i]);
            });
            return offspring;
        }
        else if (breedingMethod === "one-point") {
            const length = DNA_A.length, point = Math.round(Math.random() * length);
            DNA_A.map((x, i) => {
                offspring.push(i > point ? x : DNA_B[i]);
            });
        }
        return offspring;
    }
    setElites(A, B) {
        this.elites = [A, B];
    }
}
exports.Generation = Generation;
