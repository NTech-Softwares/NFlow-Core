import {
  addFlowJson,
  removeFlowJson,
  addStepJson,
  removeStepJson,
  updateStepMessageJson,
  updateStepOptionsJson,
} from "../../../../modules/flows/services/setflows.service";

// Exportamos com nomes mais limpos para o Controller
export const addFlow = addFlowJson;
export const removeFlow = removeFlowJson;
export const addStep = addStepJson;
export const removeStep = removeStepJson;
export const updateStepMessage = updateStepMessageJson;
export const updateStepOptions = updateStepOptionsJson;
