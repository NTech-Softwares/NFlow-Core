import { getFlows } from "../../../../providers/whatsapp/baileys/engine/flowRegistry";

export async function getFlowsTreeService() {
  const flows = getFlows();

  return Object.values(flows).map((flow: any) => {
    return {
      id: flow.id,

      initialStep: flow.initialStep,

      steps: Object.values(flow.steps).map((step: any) => ({
        id: step.id,

        messagePreview: step.message?.[0] || "",

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
