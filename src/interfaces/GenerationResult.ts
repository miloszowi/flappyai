export interface GenerationResult {
    generation: number;
    bestScore: number;
    bestFitness: number;
    avgFitness: number;
    maxFitness: number;
    birdsWithScoreGreaterThan1: number;
}
