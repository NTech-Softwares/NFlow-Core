function toggleFlow(flowId) {
  const body = document.getElementById(`flow-body-${flowId}`);
  const icon = document.getElementById(`collapse-${flowId}`);
  const collapsed = body.classList.contains("collapsed");

  if (collapsed) {
    body.classList.remove("collapsed");
    icon.classList.remove("collapsed");
  } else {
    body.classList.add("collapsed");
    icon.classList.add("collapsed");
  }
}

/**
 * Controla a exibição do conteúdo interno de cada Step individualmente
 */
function toggleStep(flowId, stepId) {
  const content = document.getElementById(`step-content-${flowId}-${stepId}`);
  const icon = document.getElementById(`step-collapse-${flowId}-${stepId}`);
  const isCollapsed = content.classList.contains("collapsed");

  if (isCollapsed) {
    content.classList.remove("collapsed");
    icon.classList.remove("collapsed");
  } else {
    content.classList.add("collapsed");
    icon.classList.add("collapsed");
  }
}
