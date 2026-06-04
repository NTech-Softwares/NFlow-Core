const API_URL = window.APP_CONFIG.API_URL;

async function executeReset() {
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const statusElement = document.getElementById("status");

  // 1. Captura o token diretamente dos parâmetros da URL (?token=XXXX)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) {
    statusElement.style.color = "#ff4a4a";
    statusElement.innerText = "Token de recuperação ausente ou inválido.";
    return;
  }

  if (!password || !confirmPassword) {
    statusElement.style.color = "#ff4a4a";
    statusElement.innerText = "Preencha e confirme a sua nova senha.";
    return;
  }

  if (password !== confirmPassword) {
    statusElement.style.color = "#ff4a4a";
    statusElement.innerText = "As senhas informadas não coincidem.";
    return;
  }

  try {
    statusElement.style.color = "#18eb35";
    statusElement.innerText = "Atualizando credenciais...";

    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      statusElement.style.color = "#18eb35";
      statusElement.innerText = "Senha atualizada! Redirecionando ao Login...";

      setTimeout(() => {
        window.location.href = "/login";
      }, 2500);
    } else {
      statusElement.style.color = "#ff4a4a";
      statusElement.innerText = data.error || "Erro ao redefinir a senha.";
    }
  } catch (error) {
    console.error("Erro na requisição de redefinição:", error);
    statusElement.style.color = "#ff4a4a";
    statusElement.innerText = "Não foi possível conectar ao servidor central.";
  }
}
