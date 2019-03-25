"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Generation_1 = require("./Generation");
const generation = new Generation_1.Generation();
document.addEventListener("keyup", e => {
    if (e.key == "n" || e.key == "N") {
        generation.nextGeneration();
    }
});
