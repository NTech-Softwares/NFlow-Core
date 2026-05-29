const API_URL = window.APP_CONFIG.API_URL;

async function register() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const statusElement = document.getElementById("status");

  // Validação simples antes de disparar o fetch
  if (!name || !email || !password) {
    statusElement.style.color = "#ff4a4a";
    statusElement.innerText = "Por favor, preencha todos os campos.";
    return;
  }

  try {
    statusElement.style.color = "#18eb35";
    statusElement.innerText = "Processando cadastro...";

    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      statusElement.style.color = "#18eb35";
      statusElement.innerText =
        "Cliente registrado com sucesso! Redirecionando...";

      // Dá um breve delay para o usuário ver o feedback positivo antes de ir para o login
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } else {
      // Exibe o erro vindo direto da validação do backend (ex: Email já cadastrado)
      statusElement.style.color = "#ff4a4a";
      statusElement.innerText = data.error || "Erro ao realizar cadastro.";
    }
  } catch (error) {
    console.error("Erro na requisição de registro:", error);
    statusElement.style.color = "#ff4a4a";
    statusElement.innerText = "Não foi possível conectar ao servidor.";
  }
}
