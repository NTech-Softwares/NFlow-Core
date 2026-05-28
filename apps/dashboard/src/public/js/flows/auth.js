const API_URL = window.APP_CONFIG.API_URL;

function getToken() {
  return localStorage.getItem("token");
}

async function checkAuthentication() {
  const token = getToken();

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
    console.log(error);

    return false;
  }
}

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
  };
}
