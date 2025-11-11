import { BreedingMethod } from "../enums/BreedingMethod";
import { GenerationData } from "../interfaces/GenerationData";

export const config: GenerationData = {
    mutationChance: 0.02,
    size: 100,
    pipeDistance: 20,
    speed: 1,
    hiddenLayerSize: 4,
    pipeGap: 20,
    breedingMethod: BreedingMethod.ONE_POINT,
};
