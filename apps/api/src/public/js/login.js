async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const response = await fetch("http://localhost:3000/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: username,
      password,
    }),
  });

  const data = await response.json();

  if (response.ok) {
    // salva token
    localStorage.setItem("token", data.token);

    // redireciona
    window.location.href = "/dashboard/teste";
  } else {
    alert(data.message);
  }
}
