function createFlowHTML(flow) {
  return `
    <div class="flow-card">

      <div
        class="flow-header"
        onclick="toggleFlow('${flow.id}')"
      >

        <div class="flow-header-left">

          <div
            class="flow-collapse collapsed"
            id="collapse-${flow.id}"
          >
            ▼
          </div>

          <div class="flow-name">
            ${flow.name}
          </div>

        </div>

        <div class="flow-badge">
          ${flow.steps.length} steps
        </div>

      </div>

      <div
        class="flow-body collapsed"
        id="flow-body-${flow.id}"
      >

        ${flow.steps.map((step) => createStepHTML(flow, step)).join("")}

      </div>

    </div>
  `;
}
