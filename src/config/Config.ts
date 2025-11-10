import { BreedingMethod } from "../enums/BreedingMethod";
import { GenerationData } from "../interfaces/GenerationData";

export const config: GenerationData = {
    mutationChance: 5,
    size: 100,
    pipeDistance: 20,
    speed: 2,
    hiddenLayerSize: 12,
    pipeGap: 20,
    breedingMethod: BreedingMethod.ONE_POINT,
};
