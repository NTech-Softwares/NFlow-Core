const API_URL = window.APP_CONFIG.API_URL;

async function login() {
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const status = document.getElementById("status");

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
  alert(data);
  status.innerText = data;

  if (response.ok) {
    // salva token
    localStorage.setItem("token", data.token);

    // redireciona
    window.location.href = "/";
  } else {
    alert(data.message);
    console.log(data.message);
  }
}
