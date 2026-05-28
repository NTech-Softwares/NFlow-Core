import { getFlows } from "../../../../providers/whatsapp/baileys/engine/flowRegistry";

export async function getFlowsService() {
  return getFlows();
}
