import { getFlows } from "../../../../providers/whatsapp/baileys/engine/flowRegistry";

export async function getFlowsService() {
  return getFlows();
}

export async function getFlowByIdService(flowId: string) {
  const flows = getFlows();

  return flows[flowId];
}

export async function getFlowsTreeService() {
  const flows = getFlows();

  return Object.values(flows).map((flow: any) => {
    return {
      id: flow.id,

      name: flow.name,

      initialStep: flow.initialStep,

      steps: Object.values(flow.steps || {}).map((step: any) => ({
        id: step.id,

        name: step.name,

        message: Array.isArray(step.message)
          ? step.message.join("\n")
          : step.message || "",

        options:
          step.options?.map((option: any) => ({
            key: option.key,

            nextFlow: option.nextFlow || null,

            nextStep: option.nextStep || null,

            goToStep: option.goToStep || null,

            back: option.back || false,
          })) || [],
      })),
    };
  });
}
