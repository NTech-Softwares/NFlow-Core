function renderFlows(flows) {
  const container = getFlowsContainer();

  container.innerHTML = "";

  window.flowsData = flows;

  flows.forEach((flow) => {
    container.innerHTML += createFlowHTML(flow);
  });
}
