const API_URL = window.APP_CONFIG.API_URL;
let currentStep = 1;

// Textos dinâmicos para guiar o usuário em cada etapa
const stepMeta = {
  1: {
    title: "Cadastro",
    subtitle: "Defina os dados de acesso do administrador.",
  },
  2: {
    title: "Horários",
    subtitle: "Configure o expediente padrão de atendimento.",
  },
  3: {
    title: "Ajustes",
    subtitle: "Insira os dados finais de integração do seu negócio.",
  },
};

function goToStep(step) {
  // Validação simples antes de sair do Passo 1
  if (step === 2 && currentStep === 1) {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    if (!name || !email || !password) {
      showMsg("Por favor, preencha todos os campos de acesso.", "#ff4a4a");
      return;
    }
  }

  // Atualiza visibilidade dos blocos de formulário
  document
    .querySelectorAll(".form-step")
    .forEach((el) => el.classList.remove("active"));
  document.getElementById(`step-${step}`).classList.add("active");

  // Atualiza os indicadores visuais redondos
  document
    .querySelectorAll(".indicator")
    .forEach((el) => el.classList.remove("active"));
  document.getElementById(`ind-${step}`).classList.add("active");

  // Atualiza títulos
  document.getElementById("step-title").innerText = stepMeta[step].title;
  document.getElementById("step-subtitle").innerText = stepMeta[step].subtitle;

  // Limpa mensagens de erro temporárias de passos anteriores
  document.getElementById("status").innerText = "";

  currentStep = step;
}

function showMsg(text, color) {
  const statusElement = document.getElementById("status");
  statusElement.style.color = color;
  statusElement.innerText = text;
}

async function executeFinalRegister() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const businessHoursEnabled = document.getElementById(
    "businessHoursEnabled",
  ).checked;
  const workStart = document.getElementById("workStart").value;
  const workEnd = document.getElementById("workEnd").value;

  const phone = document.getElementById("phone").value.trim();
  const timezone = document.getElementById("timezone").value.trim();

  if (!phone || !timezone) {
    showMsg("Por favor, preencha as configurações do passo 3.", "#ff4a4a");
    return;
  }

  // Estrutura o objeto JSON complexo para enviar ao backend de forma limpa
  const payload = {
    name,
    email,
    password,
    phone,
    timezone,
    businessHoursEnabled,
    businessHours: {
      start: workStart,
      end: workEnd,
    },
  };

  try {
    showMsg("Processando infraestrutura do cliente...", "#18eb35");

    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      showMsg(
        "Conta e ambiente configurados com sucesso! Redirecionando...",
        "#18eb35",
      );
      setTimeout(() => {
        window.location.href = "/login";
      }, 2500);
    } else {
      showMsg(
        data.error || "Erro ao realizar cadastro do ecossistema.",
        "#ff4a4a",
      );
    }
  } catch (error) {
    console.error("Erro na requisição de registro distribuído:", error);
    showMsg("Não foi possível conectar ao servidor central.", "#ff4a4a");
  }
}
