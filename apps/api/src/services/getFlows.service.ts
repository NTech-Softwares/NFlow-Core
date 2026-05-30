import {
  getFlowsService as coreGetFlows,
  getFlowByIdService as coreGetFlowById,
  getFlowsTreeService as coreGetFlowsTree,
} from "../../../../modules/flows/services/getFlows.service";

export const getFlowsService = coreGetFlows;
export const getFlowByIdService = coreGetFlowById;
export const getFlowsTreeService = coreGetFlowsTree;
