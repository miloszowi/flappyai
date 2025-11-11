export interface SavedModel {
    id: string;
    name: string;
    chromosome: {
        weights: number[];
        biases: number[];
        fitness: number;
        score: number;
        timestamp: string;
    };
    hiddenLayerSize: number;
}

export class ModelManager {
    static saveModel(name: string, chromosomeJson: string, hiddenLayerSize: number): SavedModel {
        const chromosome = JSON.parse(chromosomeJson);

        const model: SavedModel = {
            id: `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            chromosome,
            hiddenLayerSize
        };

        const dataStr = JSON.stringify(model, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${name}_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return model;
    }

    static loadModel(file: File): Promise<SavedModel | null> {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const target = event.target as FileReader;
                    const result = target.result as string;
                    const model = JSON.parse(result) as SavedModel;
                    resolve(model);
                } catch (error) {
                    resolve(null);
                }
            };
            reader.onerror = () => {
                console.error("Failed to read file");
                resolve(null);
            };
            reader.readAsText(file);
        });
    }

    static downloadModelFile(model: SavedModel): void {
        const dataStr = JSON.stringify(model, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${model.name}_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    static async loadFromFile(file: File): Promise<SavedModel | null> {
        return this.loadModel(file);
    }
}
