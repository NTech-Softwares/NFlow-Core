async function fetchFlows() {
  const response = await fetch(`${API_URL}/flows/tree`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Erro ao carregar flows");
  }

  return response.json();
}
