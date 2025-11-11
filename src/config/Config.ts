import { BreedingMethod } from "../enums/BreedingMethod";
import { GenerationData } from "../interfaces/GenerationData";

export const config: GenerationData = {
    mutationChance: 0.05,
    size: 50,
    pipeDistance: 20,
    speed: 1,
    hiddenLayerSize: 6,
    pipeGap: 25,
    breedingMethod: BreedingMethod.TWO_POINT,
};
