import type { ModelDefinition } from "../types/public.js";

export interface ModelRegistry<C extends string> {
  getModel(modelId: string): ModelDefinition<C> | undefined;
  getAllModels(): readonly ModelDefinition<C>[];
  register(models: readonly ModelDefinition<C>[]): void;
}

export function createModelRegistry<C extends string>(): ModelRegistry<C> {
  const models = new Map<string, ModelDefinition<C>>();

  return {
    getModel(modelId) {
      return models.get(modelId);
    },
    getAllModels() {
      return Array.from(models.values());
    },
    register(newModels) {
      for (const model of newModels) {
        models.set(model.id, model);
      }
    }
  };
}

export function registerModels<C extends string>(
  registry: ModelRegistry<C>,
  models: readonly ModelDefinition<C>[]
): void {
  registry.register(models);
}
