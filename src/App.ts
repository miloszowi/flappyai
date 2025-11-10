import { Generation } from "./Generation";
import { Renderer } from "./Renderer";

const renderer = new Renderer()
const generation = new Generation(renderer);

document.addEventListener("keyup", e => {
  if (e.key == "n" || e.key == "N") {
    generation.nextGeneration();
  }

  if (e.key == "f" || e.key == "F") {
    renderer.freeze();
  }

  if (e.key == "u" || e.key == "U") {
    renderer.speedUp();
  }

  if (e.key == "d" || e.key == "D") {
    renderer.speedDown();
  }
});
