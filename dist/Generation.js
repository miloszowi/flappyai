"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Config_1 = require("./config/Config");
const Renderer_1 = require("./Renderer");
const neataptic = require("neataptic");
class Generation {
    constructor() {
        this.size = 0;
        this._birds = [];
        this._generation = 1;
        this.elites = [];
        this.bestScore = 0;
        this.mutationChance = Config_1.config.mutationChance / 100;
        this.size = Config_1.config.size;
        this.hiddenLayerSize = Config_1.config.hiddenLayerSize;
        this.breedingMethod = Config_1.config.breedingMethod;
        this.pipeDistance = Renderer_1.Renderer.getInstance().pixi.screen.width * (Config_1.config.pipeDistance / 100) + 100;
        this.pipeGap = Renderer_1.Renderer.getInstance().pixi.screen.height * (Config_1.config.pipeGap / 100);
        Renderer_1.Renderer.getInstance().gap = this.pipeGap;
        Renderer_1.Renderer.getInstance().distance = this.pipeDistance;
        Renderer_1.Renderer.getInstance().birdsTotal = this.size;
        Renderer_1.Renderer.getInstance().birdsAlive = this.size;
        Renderer_1.Renderer.getInstance().generation = this._generation;
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
        Renderer_1.Renderer.getInstance().addToChart(`${this.generation}`, Renderer_1.Renderer.getInstance().pipesCount);
        this.generation += 1;
        Renderer_1.Renderer.getInstance().generation = this.generation;
        Renderer_1.Renderer.getInstance().pipesCount = 0;
        clearInterval(this.spawningWalls);
        const [CHROMOSOME_A, CHROMOSOME_B] = this.getBestChromosomes();
        this.killPopulation();
        for (let i = 0; i < this.size; i++) {
            const bird = Renderer_1.Renderer.getInstance().createBird(this.hiddenLayerSize);
            const chromosome = this.crossOver(CHROMOSOME_A, CHROMOSOME_B, this.breedingMethod);
            if (Math.random() < 0.98) {
                bird.setChromosome(chromosome, this.mutationChance);
            }
            this.birds.push(bird);
        }
        const filter = Renderer_1.Renderer.getInstance().getFilter();
        for (let i = 0; i < 2; i++) {
            const index = i + this.size - 2;
            this.birds[index].network = this.elites[i].network;
            this.birds[index].sprite.filters = [filter];
            this.birds[index].sprite.texture = this.birds[i].textureElite;
        }
        Renderer_1.Renderer.getInstance().updateMutated();
        Renderer_1.Renderer.getInstance().mutated = 0;
        Renderer_1.Renderer.getInstance().birdsAlive = this.size;
        Renderer_1.Renderer.getInstance().createWalls();
    }
    getBestChromosomes() {
        const [A, B] = this.birds.sort((a, b) => {
            return b.fitness - a.fitness;
        });
        const CHROMOSOME_A = [], CHROMOSOME_B = [];
        A.network.connections.map((connection) => {
            CHROMOSOME_A.push(connection.weight);
        });
        A.network.nodes.map((node) => {
            CHROMOSOME_A.push(node.bias);
        });
        B.network.connections.map((connection) => {
            CHROMOSOME_B.push(connection.weight);
        });
        B.network.nodes.map((node) => {
            CHROMOSOME_B.push(node.bias);
        });
        this.setElites(A, B);
        return [CHROMOSOME_A, CHROMOSOME_B];
    }
    initialize() {
        Renderer_1.Renderer.getInstance().createWalls();
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
        Renderer_1.Renderer.getInstance().birdsAlive = this.size;
        Renderer_1.Renderer.getInstance().updateInfo();
        this.birds = [];
    }
    hasDiedOut() {
        let counter = 0;
        this.birds.forEach((bird) => {
            if (!bird.alive) {
                counter += 1;
            }
            this.bestScore = bird.score >= this.bestScore ? bird.score : this.bestScore;
        });
        const diedOut = counter === this.size;
        Renderer_1.Renderer.getInstance().bestScore = this.bestScore;
        Renderer_1.Renderer.getInstance().updateInfo();
        return diedOut;
    }
    crossOver(CHROMOSOME_A, CHROMOSOME_B, breedingMethod) {
        const offspring = [];
        if (breedingMethod === "uniform") {
            CHROMOSOME_A.map((x, i) => {
                offspring.push(Math.random() > 0.5 ? x : CHROMOSOME_B[i]);
            });
            return offspring;
        }
        else if (breedingMethod === "one-point") {
            const length = CHROMOSOME_A.length, point = Math.round(Math.random() * length);
            CHROMOSOME_A.map((x, i) => {
                offspring.push(i > point ? x : CHROMOSOME_B[i]);
            });
        }
        return offspring;
    }
    setElites(A, B) {
        this.elites = [A, B];
    }
}
exports.Generation = Generation;
