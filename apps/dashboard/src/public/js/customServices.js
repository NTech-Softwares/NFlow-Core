/**
 * NFlow Core - Custom Services & Appointments Dashboard Component
 * Mantém o mesmo padrão de design reativo sem frameworks externos
 */

let originalServicesList = [];

/**
 * Inicialização chamada pelo roteador SPA da aplicação
 */
window.initCustomServicesView = async function () {
  console.log("[CustomServices] Sincronizando catálogo e agendas...");
  const feedback = document.getElementById("custom-services-result");
  if (feedback) feedback.innerText = "";

  // Dispara as duas cargas assíncronas em paralelo para performance
  await Promise.all([loadServicesCatalog(), loadClientAppointments()]);
};

/**
 * 1. Carrega o Catálogo e Configurações de Serviços do Tenant
 */
async function loadServicesCatalog() {
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;
  const container = document.getElementById("services-list-container");

  if (!container) return;
  container.innerHTML =
    '<p class="result-feedback">Buscando catálogo de serviços...</p>';

  try {
    const response = await fetch(`${apiUrl}/custom-services/services`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Erro ao obter serviços.");

    const resJson = await response.json();

    const configData = resJson.data || {};
    originalServicesList = configData.services || [];

    const inputSlots = document.getElementById("cfg-max-simultaneous");
    const txtMessage = document.getElementById("cfg-confirmation-message");

    if (inputSlots) inputSlots.value = configData.maxSimultaneousSlots || 1;
    if (txtMessage) txtMessage.value = configData.confirmationMessage || "";

    renderServicesCatalog(originalServicesList);
  } catch (error) {
    console.error("[Catalog Fetch Error]:", error);
    container.innerHTML =
      '<p class="result-feedback" style="color: #ff4d4d;">Falha ao sincronizar catálogo.</p>';
  }
}

/**
 * Renderiza as linhas editáveis do Catálogo de Serviços
 */
function renderServicesCatalog(services) {
  const container = document.getElementById("services-list-container");
  if (!container) return;

  container.innerHTML = "";

  if (services.length === 0) {
    container.innerHTML =
      '<p class="result-feedback" style="opacity: 0.6; font-style: italic;">Nenhum serviço cadastrado. Clique em "Novo Serviço" para iniciar.</p>';
    return;
  }

  services.forEach((service, idx) => {
    const itemRow = document.createElement("div");
    itemRow.classList.add("group-item");

    itemRow.style.display = "flex";
    itemRow.style.flexDirection = "column";
    itemRow.style.gap = "12px";
    itemRow.style.padding = "16px";
    itemRow.style.background = "#141414";
    itemRow.style.border = "1px solid #262626";
    itemRow.style.borderRadius = "10px";
    itemRow.style.marginBottom = "12px";
    itemRow.setAttribute("data-service-index", idx);

    const serviceId = service.id || `temp-${Date.now()}-${idx}`;
    const strategyType = service.strategyType || "STANDARD";
    const useCustomMsg = !!service.useCustomMessage;

    // Configura os metadados padrões de curso caso vazios
    const meta = service.courseMetadata || {
      totalClasses: 4,
      maxStudentsPerSlot: 1,
      allowedDaysOfWeek: [1, 2, 3, 4, 5],
      customHours: null,
    };

    itemRow.innerHTML = `
      <div style="display: flex; width: 100%; align-items: center; justify-content: space-between; border-bottom: 1px solid #1a1a1a; padding-bottom: 6px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-layout-neon); font-weight: bold;">
          <i class="fas fa-tag"></i> Item #${idx + 1}
        </span>
        <input type="hidden" class="catalog-service-id" value="${serviceId}" />
        <button type="button" onclick="removeServiceRow(${idx})" style="background: transparent; border: 1px solid rgba(235,24,24,0.2); color: #ff4d4d; padding: 4px 10px; font-size: 11px; border-radius: 6px; width: auto; cursor: pointer; transition: all 0.2s;">
          <i class="fas fa-trash-alt"></i> Remover
        </button>
      </div>
      
      <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; width: 100%;">
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 11px; color: #8f8f8f; margin-bottom: 4px;">Nome do Serviço / Curso</label>
          <input type="text" class="catalog-service-name" value="${escapeHtml(service.name)}" placeholder="Ex: Curso de Programação" required style="padding: 10px; font-size: 13px; background: #0d0d0d;" />
        </div>
        
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 11px; color: #8f8f8f; margin-bottom: 4px;">Preço Total (R$)</label>
          <input type="number" step="0.01" class="catalog-service-price" value="${service.price || 0}" placeholder="0,00" required style="padding: 10px; font-size: 13px; background: #0d0d0d;" />
        </div>
        
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 11px; color: #8f8f8f; margin-bottom: 4px;">Duração (mins)</label>
          <input type="number" class="catalog-service-duration" value="${service.durationMinutes || 30}" placeholder="Minutos" required style="padding: 10px; font-size: 13px; background: #0d0d0d;" />
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; background: #080808; padding: 14px; border-radius: 8px; border: 1px solid #1f1f1f;">
        
        <div class="form-group" style="margin-bottom: 0; width: 100%;">
          <label style="font-size: 10px; color: #a0a0a0; margin-bottom: 6px; display: block; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Tipo de Agendamento</label>
          <div style="position: relative;">
            <select class="catalog-service-strategy" onchange="toggleStrategyFields(${idx}, this.value)" style="padding: 10px 30px 10px 10px; font-size: 12px; background: #141414; color: #fff; border: 1px solid #333; border-radius: 6px; width: 100%; cursor: pointer; appearance: none; -webkit-appearance: none; font-weight: 500;">
              <option value="STANDARD" ${strategyType === "STANDARD" ? "selected" : ""}>💼 Serviço Padrão (Avulso)</option>
              <option value="RECURRENT_COURSE" ${strategyType === "RECURRENT_COURSE" ? "selected" : ""}>📚 Curso Recorrente</option>
            </select>
            <div style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #666; pointer-events: none; font-size: 10px;">
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
        </div>

        <div class="course-fields-${idx}" style="display: ${strategyType === "RECURRENT_COURSE" ? "flex" : "none"}; flex-direction: column; gap: 12px; border-top: 1px solid #1a1a1a; padding-top: 12px;">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 10px; color: #8f8f8f; margin-bottom: 4px; display: block;">Total Aulas</label>
              <input type="number" class="catalog-course-total" min="1" value="${meta.totalClasses || 4}" style="padding: 8px; font-size: 12px; background: #141414; color: #fff; border: 1px solid #333; border-radius: 6px; width: 100%;" />
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 10px; color: #8f8f8f; margin-bottom: 4px; display: block;">Vagas/Hora</label>
              <input type="number" class="catalog-course-max-students" min="1" value="${meta.maxStudentsPerSlot || 1}" style="padding: 8px; font-size: 12px; background: #141414; color: #fff; border: 1px solid #333; border-radius: 6px; width: 100%;" />
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 10px; color: #8f8f8f; margin-bottom: 4px; display: block;">Janela Horário</label>
              <div style="display: flex; gap: 4px; align-items: center;">
                <input type="text" 
                       class="catalog-course-open" 
                       placeholder="08:00" 
                       maxlength="5"
                       oninput="maskTimeInput(this)"
                       onblur="captureCurrentCatalogInputs()"
                       value="${meta.customHours?.open || ""}" 
                       style="padding: 8px 4px; font-size: 11px; background: #141414; color: #fff; border: 1px solid #333; border-radius: 6px; width: 100%; text-align: center;" />
                <span style="color:#555; font-size:10px;">as</span>
                <input type="text" 
                       class="catalog-course-close" 
                       placeholder="18:00" 
                       maxlength="5"
                       oninput="maskTimeInput(this)"
                       onblur="captureCurrentCatalogInputs()"
                       value="${meta.customHours?.close || ""}" 
                       style="padding: 8px 4px; font-size: 11px; background: #141414; color: #fff; border: 1px solid #333; border-radius: 6px; width: 100%; text-align: center;" />
              </div>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 10px; color: #8f8f8f; margin-bottom: 6px; display: block;">Dias da Semana Permitidos:</label>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
                .map((dayName, dIdx) => {
                  const isChecked = meta.allowedDaysOfWeek
                    ? meta.allowedDaysOfWeek.includes(dIdx)
                    : [1, 2, 3, 4, 5].includes(dIdx);
                  return `
                  <label style="display: flex; align-items: center; gap: 4px; background: #141414; padding: 6px 8px; border-radius: 4px; border: 1px solid #2d2d2d; font-size: 11px; color: #fff; cursor: pointer;">
                    <input type="checkbox" class="catalog-course-days" onchange="captureCurrentCatalogInputs()" value="${dIdx}" ${isChecked ? "checked" : ""} style="accent-color: #00ff88;" />
                    ${dayName}
                  </label>
                `;
                })
                .join("")}
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid #1a1a1a; padding-top: 12px; margin-top: 4px; display: flex; flex-direction: column; gap: 8px; width: 100%;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #fff; cursor: pointer; user-select: none; width: max-content;">
            <input type="checkbox" class="catalog-use-custom-msg" onchange="toggleCustomMsgField(${idx}, this.checked)" ${useCustomMsg ? "checked" : ""} style="accent-color: var(--color-layout-neon); width: 15px; height: 15px;" />
            <span style="font-weight: 600; color: #a0a0a0;">💬 Ativar Mensagem de Confirmação Personalizada</span>
          </label>
          
          <div class="custom-msg-wrapper-${idx}" style="display: ${useCustomMsg ? "flex" : "none"}; flex-direction: column; gap: 4px; width: 100%;">
            <textarea class="catalog-custom-msg-text" placeholder="Insira o texto do WhatsApp para este serviço. Tags suportadas: {cliente}, {servico}, {preco}, {data}, {horario}" style="width: 100%; min-height: 70px; max-height: 150px; background: #0d0d0d; color: #fff; border: 1px solid #2d2d2d; border-radius: 6px; padding: 10px; font-size: 12px; font-family: monospace; line-height: 1.4; resize: vertical;">${service.customConfirmationMessage || ""}</textarea>
            <span style="font-size: 10px; color: #555; font-style: italic;">Tags válidas: {cliente}, {servico}, {preco}, {data}, {horario}</span>
          </div>
        </div>

      </div>
    `;
    container.appendChild(itemRow);
  });
}

/**
 * Controla visualmente a exibição dos campos de Curso sem quebrar o fluxo reativo
 */
window.toggleStrategyFields = function (index, value) {
  const fields = document.querySelectorAll(`.course-fields-${index}`);
  fields.forEach((f) => {
    f.style.display = value === "RECURRENT_COURSE" ? "flex" : "none";
  });
  captureCurrentCatalogInputs();
};

/**
 * Controla dinamicamente o recolhimento ou abertura da caixa de texto da mensagem customizada
 */
window.toggleCustomMsgField = function (index, isChecked) {
  const wrapper = document.querySelectorAll(`.custom-msg-wrapper-${index}`);
  wrapper.forEach((w) => {
    w.style.display = isChecked ? "flex" : "none";
  });
  captureCurrentCatalogInputs();
};

/**
 * Adiciona uma nova linha em branco no array local e re-renderiza
 */
window.addNewServiceRow = function () {
  captureCurrentCatalogInputs();
  originalServicesList.push({
    id: `new-${Date.now()}`,
    name: "",
    price: 0,
    durationMinutes: 45,
    strategyType: "STANDARD",
    courseMetadata: null,
    useCustomMessage: false,
    customConfirmationMessage: "",
  });
  renderServicesCatalog(originalServicesList);
};

/**
 * Remove a linha do array local e atualiza a visualização
 */
window.removeServiceRow = function (index) {
  captureCurrentCatalogInputs();
  originalServicesList.splice(index, 1);
  renderServicesCatalog(originalServicesList);
};

/**
 * Máscara em JavaScript puro para inputs de Horário (HH:MM)
 */
window.maskTimeInput = function (input) {
  let value = input.value.replace(/\D/g, "");
  if (value.length > 4) value = value.slice(0, 4);
  if (value.length >= 3) {
    value = value.substring(0, 2) + ":" + value.substring(2, 4);
  }
  input.value = value;
};

/**
 * Captura o estado atual digitado nos Inputs mapeando corretamente a estratégia estruturada
 */
function captureCurrentCatalogInputs() {
  const rows = document.querySelectorAll(
    "#services-list-container .group-item",
  );
  const updatedList = [];

  rows.forEach((row, idx) => {
    const id = row.querySelector(".catalog-service-id").value;
    const name = row.querySelector(".catalog-service-name").value;
    const price =
      parseFloat(row.querySelector(".catalog-service-price").value) || 0;
    const durationMinutes =
      parseInt(row.querySelector(".catalog-service-duration").value) || 30;

    const strategyType = row.querySelector(".catalog-service-strategy").value;
    const useCustomMessage = row.querySelector(
      ".catalog-use-custom-msg",
    ).checked;
    const customConfirmationMessage = row.querySelector(
      ".catalog-custom-msg-text",
    ).value;

    let courseMetadata = null;
    if (strategyType === "RECURRENT_COURSE") {
      const totalClasses =
        parseInt(
          row.querySelector(`.course-fields-${idx} .catalog-course-total`)
            .value,
        ) || 4;

      const maxStudentsPerSlot =
        parseInt(
          row.querySelector(
            `.course-fields-${idx} .catalog-course-max-students`,
          ).value,
        ) || 1;

      const openTime = row
        .querySelector(`.course-fields-${idx} .catalog-course-open`)
        .value.trim();
      const closeTime = row
        .querySelector(`.course-fields-${idx} .catalog-course-close`)
        .value.trim();

      let customHours = null;
      if (openTime || closeTime) {
        customHours = { open: openTime, close: closeTime };
      }

      const checkedDaysBoxes = row.querySelectorAll(
        `.course-fields-${idx} .catalog-course-days:checked`,
      );
      const allowedDaysOfWeek = Array.from(checkedDaysBoxes).map((cb) =>
        parseInt(cb.value),
      );

      courseMetadata = {
        totalClasses,
        maxStudentsPerSlot,
        allowedDaysOfWeek,
        customHours,
      };
    }

    updatedList.push({
      id,
      name,
      price,
      durationMinutes,
      strategyType,
      courseMetadata,
      // 🔥 REPASSA OS DADOS EXTRAÍDOS PARA O ARRAY DE RE-ENVIO
      useCustomMessage,
      customConfirmationMessage,
    });
  });

  originalServicesList = updatedList;
}

/**
 * Salva as alterações coletadas do catálogo enviando o POST para a API
 */
window.saveCustomServicesCatalog = async function () {
  captureCurrentCatalogInputs();

  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;
  const feedback = document.getElementById("custom-services-result");
  const btnSave = document.getElementById("btn-save-services");

  const inputSlots = document.getElementById("cfg-max-simultaneous");
  const txtMessage = document.getElementById("cfg-confirmation-message");

  const maxSimultaneousSlots = inputSlots ? parseInt(inputSlots.value) || 1 : 1;
  const confirmationMessage = txtMessage ? txtMessage.value.trim() : "";

  const hasInvalid = originalServicesList.some((s) => !s.name.trim());
  if (hasInvalid) {
    if (feedback) {
      feedback.innerText = "⚠️ Todos os serviços/cursos precisam de um Nome.";
      feedback.style.color = "#ff4d4d";
    }
    return;
  }

  // VALIDAÇÃO ESTRITA DAS JANELAS DE HORÁRIO DOS CURSOS (Formato HH:MM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  for (const service of originalServicesList) {
    if (
      service.strategyType === "RECURRENT_COURSE" &&
      service.courseMetadata?.customHours
    ) {
      const { open, close } = service.courseMetadata.customHours;

      if (open || close) {
        if (!timeRegex.test(open) || !timeRegex.test(close)) {
          if (feedback) {
            feedback.innerText = `⚠️ O curso "${service.name || "Item sem nome"}" possui horários inválidos. Use o formato HH:MM (Ex: 08:00 às 18:00).`;
            feedback.style.color = "#ff4d4d";
          }
          return;
        }
      }
    }
  }

  if (feedback) {
    feedback.innerText = "Sincronizando configurações...";
    feedback.style.color = "#a0a0a0";
  }
  btnSave.disabled = true;

  try {
    const response = await fetch(`${apiUrl}/custom-services/services`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        services: originalServicesList,
        maxSimultaneousSlots,
        confirmationMessage,
      }),
    });

    const resJson = await response.json();

    if (response.ok && resJson.success) {
      feedback.innerText = "Catálogo inteligente atualizado com sucesso! 🚀";
      feedback.style.color = "#18eb35";

      const configData = resJson.data || {};
      originalServicesList = configData.services || [];
      renderServicesCatalog(originalServicesList);
    } else {
      throw new Error(resJson.error || "Erro retornado ao salvar.");
    }
  } catch (error) {
    console.error("[Save Catalog Error]:", error);
    feedback.innerText = error.message || "Erro de conexão com o servidor.";
    feedback.style.color = "#ff4d4d";
  } finally {
    btnSave.disabled = false;
  }
};

/**
 * 2. Carrega a lista de Reservas (Appointments) efetuadas pelos clientes
 */
window.loadClientAppointments = async function () {
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;
  const container = document.getElementById("appointments-list-container");

  if (!container) return;
  container.innerHTML =
    '<p class="result-feedback">Buscando compromissos...</p>';

  try {
    const response = await fetch(`${apiUrl}/custom-services/appointments`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Erro ao buscar agenda.");

    const resJson = await response.json();
    const appointments = resJson.data || [];

    const countBadge = document.getElementById("badge-appointments-count");
    if (countBadge) countBadge.textContent = appointments.length;

    container.innerHTML = "";

    if (appointments.length === 0) {
      container.innerHTML =
        '<p class="result-feedback" style="opacity: 0.5;">Nenhuma reserva confirmada na agenda até o momento. 🤖</p>';
      return;
    }

    appointments.sort(
      (a, b) =>
        new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`),
    );

    appointments.forEach((app) => {
      const appCard = document.createElement("div");
      appCard.classList.add("group-item");
      appCard.style.display = "flex";
      appCard.style.justifyContent = "space-between";
      appCard.style.alignItems = "center";
      appCard.style.padding = "16px";
      appCard.style.background = "#141414";
      appCard.style.border = "1px solid #262626";
      appCard.style.borderRadius = "12px";
      appCard.style.marginBottom = "12px";

      const [year, month, day] = app.date.split("-");
      const localDateFormated = `${day}/${month}/${year}`;
      const priceFormatted =
        app.service && typeof app.service.price === "number"
          ? app.service.price.toFixed(2)
          : "0.00";
      const serviceName = app.service
        ? app.service.name
        : "Serviço Não Informado";

      appCard.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; padding-right: 16px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <strong style="color: #ffffff; font-size: 15px; font-weight: 700;">${escapeHtml(app.clientName)}</strong>
            <span style="font-size: 11px; background: rgba(24,235,53,0.08); color: var(--color-layout-neon); border: 1px solid rgba(24,235,53,0.15); padding: 2px 8px; border-radius: 12px; font-weight: 600;">
              ${escapeHtml(serviceName)}
            </span>
          </div>
          
          <div style="font-size: 13px; color: #e9edef; display: flex; align-items: center; gap: 6px;">
            <span style="color: #ff9f43;"><i class="far fa-calendar-alt"></i></span> 
            <span>${localDateFormated} às <strong style="color: #ff9f43; font-size: 14px;">${app.time}</strong></span>
          </div>
          
          <div style="font-size: 11px; color: #7f7f7f; display: flex; gap: 12px; border-top: 1px solid #1c1c1c; padding-top: 4px; margin-top: 2px;">
            <span><strong style="color: #a0a0a0;">Whats:</strong> ${app.remoteJid.split("@")[0]}</span>
            <span><strong style="color: #a0a0a0;">Valor:</strong> R$ ${priceFormatted}</span>
          </div>
        </div>

        <button type="button" onclick="cancelClientAppointment('${app.id}')" style="background: rgba(235,24,24,0.05); border: 1px solid rgba(235,24,24,0.2); color: #ff4d4d; padding: 8px 12px; font-size: 12px; border-radius: 6px; width: auto; cursor: pointer; font-weight: 600; transition: all 0.2s;">
          <i class="fas fa-times-circle"></i> Cancelar
        </button>
      `;

      container.appendChild(appCard);
    });
  } catch (error) {
    console.error("[Fetch Appointments Error]:", error);
    container.innerHTML =
      '<p class="result-feedback" style="color: #ff4d4d;">Erro ao renderizar agenda activa.</p>';
  }
};

/**
 * Cancela a reserva via Painel Administrativo
 */
window.cancelClientAppointment = async function (appointmentId) {
  if (
    !confirm(
      "Deseja realmente cancelar este agendamento?\nEsta ação removerá os lembretes automáticos agendados para o cliente.",
    )
  )
    return;

  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;
  const feedback = document.getElementById("custom-services-result");

  try {
    const response = await fetch(
      `${apiUrl}/custom-services/appointments/${appointmentId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const resJson = await response.json();

    if (response.ok && resJson.success) {
      if (feedback) {
        feedback.innerText = "Agendamento cancelado com sucesso! 🛡️";
        feedback.style.color = "#ff9f43";
      }
      await loadClientAppointments();
    } else {
      throw new Error(resJson.error || "Erro ao deletar compromisso.");
    }
  } catch (error) {
    console.error("[Cancel Appointment Error]:", error);
    alert(error.message || "Não foi possível cancelar o agendamento.");
  }
};

/**
 * Função Auxiliar Anti-XSS (Sanitização)
 */
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
