function createFlowHTML(flow) {
  return `
    <div class="flow-card">

      <div
        class="flow-header"
        onclick="toggleFlow('${flow.id}')"
      >

        <div class="flow-header-left">

          <div
            class="flow-collapse"
            id="collapse-${flow.id}"
          >
            ▼
          </div>

          <div class="flow-name">
            ${flow.id}
          </div>

        </div>

        <div class="flow-badge">
          ${flow.steps.length} steps
        </div>

      </div>

      <div
        class="flow-body"
        id="flow-body-${flow.id}"
      >

        ${flow.steps.map((step) => createStepHTML(flow, step)).join("")}

      </div>

    </div>
  `;
}
