init();

async function init() {
  const authenticated = await checkAuthentication();

  if (!authenticated) {
    return;
  }

  await loadFlows();
}

async function loadFlows() {
  const container = getFlowsContainer();

  showLoading(container);

  try {
    const flows = await fetchFlows();

    renderFlows(flows);
  } catch (error) {
    showError(container);

    console.log(error);
  }
}
