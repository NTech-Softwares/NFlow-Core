// Estado global do ciclo de vida da SPA
let currentActiveView = null;
let globalRefreshIntervalId = null;
const REFRESH_INTERVAL_MS = 10000; // ⏱️ 10 segundos

// Alternador das seções (Views) do Dashboard
async function switchView(viewId) {
  // 🚀 [NOVO] Salva a view atual no localStorage para persistir no F5
  localStorage.setItem("nflow_active_view", viewId);

  // Atualiza a view ativa no estado global
  currentActiveView = viewId;

  // 1. Esconde todas as seções
  const sections = document.querySelectorAll(".view-section");
  sections.forEach((section) => section.classList.add("hidden"));

  // 2. Mostra a seção desejada
  const targetSection = document.getElementById(viewId);
  if (targetSection) {
    targetSection.classList.remove("hidden");
  }

  // 3. Atualiza o estado visual dos botões no Menu Lateral
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    if (item.getAttribute("data-target") === viewId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // 4. Se estiver no mobile, fecha a sidebar automaticamente após clicar
  const sidebar = document.getElementById("sidebar");
  if (sidebar && sidebar.classList.contains("open")) {
    toggleSidebar();
  }

  // 5. Disparadores de Ciclo de Vida Contextuais (Orquestração SPA)
  console.log(`[SPA] Mudando para a visão: ${viewId}`);

  if (
    viewId === "view-dashboard" &&
    typeof window.initDashboardView === "function"
  ) {
    await window.initDashboardView();
  } else if (
    viewId === "view-flows" &&
    typeof window.initFlowsView === "function"
  ) {
    await window.initFlowsView();
  } else if (
    viewId === "view-schedule" &&
    typeof window.initScheduleView === "function"
  ) {
    await window.initScheduleView();
  } else if (
    viewId === "view-profile" &&
    typeof window.initProfileView === "function"
  ) {
    await window.initProfileView();
  } else if (
    viewId === "view-attendance" &&
    typeof window.initAttendanceView === "function"
  ) {
    await window.initAttendanceView();
  } else if (
    viewId === "view-custom-services" &&
    typeof window.initCustomServicesView === "function"
  ) {
    await window.initCustomServicesView();
  }
}

/**
 * 🔄 Indicador Visual Global de Atualização (Polling Loader)
 */
window.showGlobalRefreshIndicator = function () {
  let indicator = document.getElementById("global-refresh-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "global-refresh-indicator";

    indicator.style.position = "fixed";
    indicator.style.bottom = "16px";
    indicator.style.right = "16px";
    indicator.style.backgroundColor = "#141414";
    indicator.style.border = "1px solid #18eb35";
    indicator.style.color = "#18eb35";
    indicator.style.width = "34px";
    indicator.style.height = "34px";
    indicator.style.borderRadius = "50%";
    indicator.style.display = "flex";
    indicator.style.alignItems = "center";
    indicator.style.justifyContent = "center";
    indicator.style.zIndex = "9999";
    indicator.style.fontSize = "14px";
    indicator.style.boxShadow = "0 0 12px rgba(24, 235, 53, 0.2)";
    indicator.style.transition = "opacity 0.2s ease";
    indicator.style.pointerEvents = "none";

    indicator.innerHTML = '<i class="fas fa-clock"></i>';
    document.body.appendChild(indicator);
  }
  indicator.style.display = "flex";
  setTimeout(() => {
    indicator.style.opacity = "1";
  }, 10);
};

window.hideGlobalRefreshIndicator = function () {
  const indicator = document.getElementById("global-refresh-indicator");
  if (indicator) {
    setTimeout(() => {
      indicator.style.opacity = "0";
      setTimeout(() => {
        if (indicator.style.opacity === "0") indicator.style.display = "none";
      }, 200);
    }, 1000);
  }
};

/**
 * 🔄 MOTOR DE ATUALIZAÇÃO GLOBAL (POLLING)
 */
function startGlobalRefreshEngine() {
  if (globalRefreshIntervalId) clearInterval(globalRefreshIntervalId);

  globalRefreshIntervalId = setInterval(async () => {
    if (!currentActiveView) return;

    const viewRefreshMappers = {
      "view-dashboard": "refreshDashboardView",
      "view-flows": "refreshFlowsView",
      "view-schedule": "refreshScheduleView",
      "view-profile": "refreshProfileView",
      "view-attendance": "refreshAttendanceView",
      "view-custom-services": "refreshCustomServicesView",
    };

    const targetFunctionName = viewRefreshMappers[currentActiveView];

    if (
      targetFunctionName &&
      typeof window[targetFunctionName] === "function"
    ) {
      const targetSection = document.getElementById(currentActiveView);

      if (targetSection && !targetSection.classList.contains("hidden")) {
        try {
          console.log(
            `[Global Polling] Atualizando dados de: ${currentActiveView}`,
          );
          await window[targetFunctionName]();
        } catch (error) {
          console.error(
            `[Global Polling Error] Falha ao atualizar ${currentActiveView}:`,
            error,
          );
        }
      }
    }
  }, REFRESH_INTERVAL_MS);
}

// Alternar barra lateral no Mobile (Hamburger)
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (sidebar && overlay) {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  }
}

// Manipulação do botão de deslogar
function handleLogout() {
  if (confirm("Deseja realmente sair da plataforma?")) {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("nflow_active_view"); // 🚀 [NOVO] Limpa o estado da view para o próximo login vir limpo
    window.location.href = "/login";
  }
}

// Inicialização Automática da SPA assim que o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  // Liga o motor de atualização contínua
  startGlobalRefreshEngine();

  // 🚀 [NOVO] SISTEMA DE PRIORIDADE DE RENDERIZAÇÃO NO BOOT
  // 1ª Prioridade: Parâmetro via URL Query string (ex: /?view=view-flows)
  const urlParams = new URLSearchParams(window.location.search);
  const viewFromQuery = urlParams.get("view");

  // 2ª Prioridade: Estado salvo no localStorage (F5/Recarregamento)
  const savedView = localStorage.getItem("nflow_active_view");

  // 3ª Prioridade: O padrão ativo mapeado no HTML original
  const activeNavItem = document.querySelector(".sidebar-nav .nav-item.active");
  const defaultView = activeNavItem
    ? activeNavItem.getAttribute("data-target")
    : "view-dashboard";

  let viewToRender = defaultView;

  // Validações para garantir que a section realmente existe no HTML antes de aplicar
  if (viewFromQuery && document.getElementById(viewFromQuery)) {
    viewToRender = viewFromQuery;

    // Limpa o parâmetro da URL de forma elegante sem recarregar a página, deixando a URL limpa de novo
    const cleanUrl =
      window.location.protocol +
      "//" +
      window.location.host +
      window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, "", cleanUrl);
  } else if (savedView && document.getElementById(savedView)) {
    viewToRender = savedView;
  }

  // Executa o ciclo de renderização da aba selecionada pelas regras acima
  switchView(viewToRender);
});
