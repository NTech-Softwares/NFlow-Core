const API_URL = window.APP_CONFIG.API_URL;

async function requestRecovery() {
  const email = document.getElementById("email").value.trim();
  const statusElement = document.getElementById("status");

  if (!email) {
    statusElement.style.color = "#ff4a4a";
    statusElement.innerText = "Por favor, preencha o campo de e-mail.";
    return;
  }

  try {
    statusElement.style.color = "#18eb35";
    statusElement.innerText = "Verificando nos servidores...";

    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    // Como o backend envia status 200 mesmo se não achar (por segurança),
    // validamos o sucesso da mensagem devolvida
    statusElement.style.color = "#18eb35";
    statusElement.innerText =
      data.message || "Instruções enviadas com sucesso!";

    // 💡 Facilitador para o Desenvolvedor: Captura automática do token se estiver em localhost
    if (data.developmentLink) {
      console.log(
        "%c[NFLOW DEV] Link de recuperação gerado no terminal:",
        "color: #18eb35; font-weight: bold;",
        data.developmentLink,
      );
    }
  } catch (error) {
    console.error("Erro na requisição de recuperação:", error);
    statusElement.style.color = "#ff4a4a";
    statusElement.innerText = "Erro ao conectar-se à API do NFlow.";
  }
}
