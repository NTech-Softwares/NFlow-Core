function handleFlowChange(select) {
  const optionElement = select.closest(".tree-option");

  const stepSelect = optionElement.querySelector(".step-select");

  const flowId = select.value;

  const flows = window.flowsData;

  const flow = flows.find((item) => item.id === flowId);

  const steps = flow ? flow.steps : [];

  stepSelect.innerHTML = `
    <option value="">
      Selecione o Step
    </option>

    ${steps
      .map(
        (step) => `
          <option value="${step.id}">
            ${step.id}
          </option>
        `,
      )
      .join("")}
  `;

  stepSelect.disabled = !flowId;
}
