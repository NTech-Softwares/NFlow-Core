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
