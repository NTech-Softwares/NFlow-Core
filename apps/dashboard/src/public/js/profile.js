const DAYS_NAME = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

let localSchedule = {};

window.initProfileView = async function () {
  console.log("[Profile] Sincronizando dados com o padrão NFlow...");
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;
  const resultElement = document.getElementById("profile-result");

  if (resultElement) {
    resultElement.innerText = "";
    resultElement.style.color = "#a0a0a0";
  }

  try {
    // 🟢 Ajustado para a rota correta do seu Express Core
    const response = await fetch(`${apiUrl}/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Erro na requisição.");

    const resBody = await response.json();

    // Suporta tanto se o backend responder o objeto direto quanto envelopado em .data ou .user
    const data = resBody.businessHours
      ? resBody
      : resBody.data || resBody.user || resBody;

    if (!data || !data.businessHours) {
      throw new Error(
        "Estrutura de dados de horário de atendimento não encontrada no retorno.",
      );
    }

    document.getElementById("profile-bh-enabled").checked =
      !!data.businessHours.enabled;
    document.getElementById("profile-bh-timezone").value =
      data.businessHours.timezone || "America/Sao_Paulo";

    const awayMessageArray = data.businessHours.awayMessage || [];
    document.getElementById("profile-bh-away-message").value =
      awayMessageArray.join("\n");

    localSchedule = data.businessHours.schedule || {};
    renderScheduleForm();
  } catch (error) {
    console.error("Erro Perfil:", error);
    if (resultElement)
      resultElement.innerText = "Erro ao carregar dados do perfil.";
  }
};

function renderScheduleForm() {
  const container = document.getElementById("profile-schedule-container");
  if (!container) return;

  container.innerHTML = "";

  for (let d = 0; d <= 6; d++) {
    const dayIntervals = localSchedule[d] || [];

    const dayItem = document.createElement("div");
    dayItem.classList.add("group-item");
    dayItem.style.flexDirection = "column";
    dayItem.style.alignItems = "stretch";
    dayItem.style.gap = "8px";

    let intervalsHtml = "";
    dayIntervals.forEach((interval, index) => {
      intervalsHtml += `
        <div class="d-flex" style="align-items: center; gap: 8px; margin-bottom: 4px;">
          <input type="time" class="time-input-open" data-day="${d}" data-index="${index}" value="${interval.open}" style="padding: 6px 10px; font-size: 14px;" />
          <span style="font-size: 12px; color: #7f7f7f;">até</span>
          <input type="time" class="time-input-close" data-day="${d}" data-index="${index}" value="${interval.close}" style="padding: 6px 10px; font-size: 14px;" />
          <button type="button" class="select-all-btn" onclick="removeInterval(${d}, ${index})" style="border-color: rgba(235, 24, 24, 0.4); color: #ff4d4d; padding: 6px 10px;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
    });

    dayItem.innerHTML = `
      <div class="d-flex" style="justify-content: space-between; align-items: center; width: 100%;">
        <span class="group-name" style="color: #18eb35;">${DAYS_NAME[d]}</span>
        <button type="button" class="select-all-btn" onclick="addInterval(${d})">
          <i class="fas fa-plus"></i> Turno
        </button>
      </div>
      <div class="d-flex flex-column" style="width: 100%; padding-left: 4px;">
        ${intervalsHtml || '<span class="group-members" style="font-style: italic;">Fechado o dia inteiro</span>'}
      </div>
    `;

    container.appendChild(dayItem);
  }
}

window.addInterval = function (day) {
  if (!localSchedule[day]) localSchedule[day] = [];
  localSchedule[day].push({ open: "08:00", close: "18:00" });
  renderScheduleForm();
};

window.removeInterval = function (day, index) {
  if (localSchedule[day]) {
    localSchedule[day].splice(index, 1);
    renderScheduleForm();
  }
};

window.saveProfileBusinessHours = async function () {
  const token = localStorage.getItem("token");
  const apiUrl = window.APP_CONFIG.API_URL;
  const resultElement = document.getElementById("profile-result");
  const saveBtn = document.getElementById("btn-save-profile");

  resultElement.innerText = "Sincronizando com o servidor...";
  resultElement.style.color = "#a0a0a0";
  saveBtn.disabled = true;

  for (let d = 0; d <= 6; d++) {
    const opens = document.querySelectorAll(
      `.time-input-open[data-day="${d}"]`,
    );
    const closes = document.querySelectorAll(
      `.time-input-close[data-day="${d}"]`,
    );

    localSchedule[d] = [];
    opens.forEach((input, index) => {
      const closeVal = closes[index]?.value;
      if (input.value && closeVal) {
        localSchedule[d].push({ open: input.value, close: closeVal });
      }
    });
  }

  const awayMessageText = document.getElementById(
    "profile-bh-away-message",
  ).value;
  const awayMessageArray = awayMessageText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const payload = {
    businessHours: {
      enabled: document.getElementById("profile-bh-enabled").checked,
      timezone: document.getElementById("profile-bh-timezone").value,
      schedule: localSchedule,
      awayMessage: awayMessageArray,
    },
  };

  try {
    // 🟢 Ajustado também o endpoint do PUT para bater com o Router do Core
    const response = await fetch(`${apiUrl}/profile/business-hours`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && (data.success || data.id || !data.error)) {
      resultElement.innerText = "Configurações salvas com sucesso! 🚀";
      resultElement.style.color = "#18eb35";
    } else {
      resultElement.innerText = data.error || "Erro ao salvar alterações.";
      resultElement.style.color = "#ff4d4d";
    }
  } catch (error) {
    console.error("Erro ao salvar:", error);
    resultElement.innerText = "Erro de conexão com a API Gateway.";
    resultElement.style.color = "#ff4d4d";
  } finally {
    saveBtn.disabled = false;
  }
};
