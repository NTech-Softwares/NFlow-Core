const API_URL = window.APP_CONFIG.API_URL;

function getToken() {
  return localStorage.getItem("token");
}

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

/**
 * Executa a validação de segurança imediata ao carregar o script
 */
async function checkAuthentication() {
  const token = getToken();

  if (!token) {
    console.warn("[NFlow Shield] Acesso negado: Nenhum token encontrado.");
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
      console.error("[NFlow Shield] Token inválido ou expirado. Deslogando...");
      localStorage.removeItem("token");
      window.location.href = "/login";
      return false;
    }

    console.log("[NFlow Shield] Autenticação validada com sucesso!");
    return true;
  } catch (error) {
    console.error(
      "[NFlow Shield] Erro ao conectar com o servidor de autenticação:",
      error,
    );
    return false;
  }
}

// Executa automaticamente apenas se não estiver na página de login
if (
  window.location.pathname !== "/login" &&
  window.location.pathname !== "/login.html"
) {
  checkAuthentication();
}
