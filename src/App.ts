import { Generation } from "./Generation";

const generation = new Generation();

document.addEventListener("keyup", e => {
  if (e.key == "n" || e.key == "N") {
    generation.nextGeneration();
  }
});
