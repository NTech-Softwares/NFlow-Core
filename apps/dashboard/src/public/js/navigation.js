// Alternador das seções (Views) do Dashboard
async function switchView(viewId) {
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
    // ⏰ Gancho automático executado ao clicar na aba de agendamentos
    await window.initScheduleView();
  } else if (
    viewId === "view-profile" &&
    typeof window.initProfileView === "function"
  ) {
    // 🗓️ Gancho automático executado ao clicar na aba de perfil
    await window.initProfileView();
  } else if (
    viewId === "view-attendance" &&
    typeof window.initAttendanceView === "function"
  ) {
    // 🟢 Gancho automático executado ao clicar na aba de Atendimento Humano
    await window.initAttendanceView();
  } else if (
    viewId === "view-custom-services" &&
    typeof window.initCustomServicesView === "function"
  ) {
    // 🔔 Gancho automático disparado ao entrar na tela de Serviços e Reservas
    await window.initCustomServicesView();
  }
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
    window.location.href = "/login";
  }
}

// Inicialização Automática da SPA assim que o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  // Executa o ciclo da primeira aba marcada como ativa no HTML (Dashboard)
  const activeNavItem = document.querySelector(".sidebar-nav .nav-item.active");
  if (activeNavItem) {
    const defaultView = activeNavItem.getAttribute("data-target");
    switchView(defaultView);
  }
});
