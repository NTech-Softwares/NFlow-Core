const API_URL = window.APP_CONFIG.API_URL;

async function login() {
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const statusElement = document.getElementById("status");

  if (!email || !password) {
    statusElement.innerText = "Preencha o usuário e a senha.";
    return;
  }

  try {
    statusElement.style.color = "#18eb35";
    statusElement.innerText = "Autenticando...";

    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Salva o token JWT com segurança no localStorage
      localStorage.setItem("token", data.token);

      statusElement.innerText = "Login autorizado! Entrando...";
      window.location.href = "/";
    } else {
      // Exibe a mensagem de erro amigável vinda do backend
      statusElement.style.color = "#ff4a4a";
      statusElement.innerText = data.error || "Credenciais inválidas.";
    }
  } catch (error) {
    console.error("Erro na requisição de login:", error);
    statusElement.style.color = "#ff4a4a";
    statusElement.innerText = "Erro ao conectar-se à API do NFlow.";
  }
}
