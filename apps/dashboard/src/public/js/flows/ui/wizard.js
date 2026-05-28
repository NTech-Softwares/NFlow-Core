const token = localStorage.getItem("token");

// Estado do Wizard na Memória da Tela (Navegação reduzida de 1 a 3)
let etapaAtual = 1;

// Objeto de acumulação mapeado de forma idêntica à assinatura limpa aceita pela API
const flowPayload = {
  flowId: "", // Identificador do Fluxo (ex: 'main')
  initialStep: "", // Nome do passo inicial (ex: 'menu')
  stepMessage: "", // Será enviado como texto puro e tratado no backend se necessário
};

// Executa a verificação de sessão assim que o script é carregado
initWizard();

/**
 * Controla o ciclo de vida inicial da tela de criação
 */
async function initWizard() {
  const authenticated = await verificarAutenticacao();
  if (!authenticated) {
    return;
  }
}

/**
 * Valida a sessão do usuário baseando-se estritamente no padrão do seu dashboard.js
 */
async function verificarAutenticacao() {
  if (!token) {
    window.location.href = "/login";
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return false;
    }

    return true;
  } catch (error) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    return false;
  }
}

/**
 * Avança para a próxima etapa realizando as validações de campos obrigatórios
 */
function proximaEtapa() {
  // Etapa 1: Captura e valida o Identificador Único do Fluxo
  if (etapaAtual === 1) {
    const idInput = document.getElementById("flow-id").value.trim();
    if (!idInput) {
      alert("Por favor, digite o Nome do fluxo.");
      return;
    }
    flowPayload.flowId = idInput;
  }

  // Etapa 2: Captura e valida o Nome do Passo Inicial (Ex: 'menu' ou 'inicio')
  if (etapaAtual === 2) {
    const stepInput = document.getElementById("initial-step").value.trim();
    if (!stepInput) {
      alert("Por favor, defina o nome do passo inicial (Ex: menu).");
      return;
    }
    flowPayload.initialStep = stepInput;
  }

  // Avança na navegação física das telas se não estiver no último estágio (passo 3)
  if (etapaAtual < 3) {
    etapaAtual++;
    atualizarVisibilidadeEtapas();
  }
}

/**
 * Retorna para a etapa anterior
 */
function etapaAnterior() {
  if (etapaAtual > 1) {
    etapaAtual--;
    atualizarVisibilidadeEtapas();
  }
}

/**
 * Gerencia quais blocos HTML devem aparecer alternando a classe CSS 'active'
 */
function atualizarVisibilidadeEtapas() {
  // Varre de 1 a 3 visto que removemos a antiga etapa de saudação do fluxo
  for (let i = 1; i <= 3; i++) {
    const divEtapa = document.getElementById(`step-${i}`);
    if (divEtapa) {
      if (i === etapaAtual) {
        divEtapa.classList.add("active");
      } else {
        divEtapa.classList.remove("active");
      }
    }
  }
}

/**
 * Coleta os dados finais do passo inicial e faz a postagem segura na API
 */
async function concluirWizard() {
  const stepMessageInput = document.getElementById("step-message").value.trim();

  if (!stepMessageInput) {
    alert("Por favor, digite a mensagem ou o menu inicial do passo.");
    return;
  }

  // Passa o texto digitado na text-area para o payload final
  flowPayload.stepMessage = stepMessageInput;

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (typeof getAuthHeaders === "function") {
      Object.assign(headers, getAuthHeaders());
    } else {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Chamada direta para o endpoint POST reconfigurado na API
    const response = await fetch(`${API_URL}/flows/addflow`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(flowPayload),
    });

    // Validação de segurança para barrar HTML de erros de rota
    if (!response.ok) {
      const textoErro = await response.text();
      console.error("Servidor respondeu com erro:", textoErro);
      alert(
        `Erro ${response.status}: O servidor rejeitou ou não encontrou a rota.\nVerifique as chaves e métodos no backend.`,
      );
      return;
    }

    const data = await response.json();

    if (data.success || data.status === "success") {
      alert("Fluxo criado e configurado com sucesso!");
      window.location.href = "/flows";
    } else {
      alert(
        `Erro na criação: ${data.message || "Verifique os logs do servidor."}`,
      );
    }
  } catch (error) {
    alert("Erro ao conectar com a API de Fluxos: " + error.message);
    console.error(error);
  }
}
