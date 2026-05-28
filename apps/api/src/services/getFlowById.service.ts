import { getFlows } from "../../../../providers/whatsapp/baileys/engine/flowRegistry";

export async function getFlowByIdService(flowId: string) {
  const flows = getFlows();

  return flows[flowId];
}
