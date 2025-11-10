import { BreedingMethod } from "../enums/BreedingMethod";

export interface GenerationData {
  mutationChance: number;
  pipeDistance: number;
  size: number;
  speed: number;
  hiddenLayerSize: number;
  pipeGap: number;
  breedingMethod: BreedingMethod;
}
