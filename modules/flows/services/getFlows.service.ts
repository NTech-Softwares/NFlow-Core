import { getFlowsForSession } from "../../flows/repository/flow.registry";

export async function getFlowsService(sessionId: string, id: string) {
  return getFlowsForSession(sessionId, id);
}

export async function getFlowByIdService(
  sessionId: string,
  id: string,
  flowId: string,
) {
  const flows = getFlowsForSession(sessionId, id);
  return flows[flowId];
}

export async function getFlowsTreeService(sessionId: string, id: string) {
  const flows = getFlowsForSession(sessionId, id);

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
