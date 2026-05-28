import flowsData from "../flows/data/flows.json";
import { Flow } from "../flows/types/flowTypes";

// Clonamos o JSON inicial para uma variável na memória que pode ser alterada
let registryInMemory: Record<string, Flow> = { ...flowsData } as Record<
  string,
  Flow
>;

/**
 * Retorna o estado atual dos fluxos guardados na memória.
 */
export function getFlows() {
  return registryInMemory;
}

/**
 * Atualiza o estado da memória (usado pelos serviços de mutação)
 */
export function updateRegistry(newRegistry: Record<string, Flow>) {
  registryInMemory = newRegistry;
}
