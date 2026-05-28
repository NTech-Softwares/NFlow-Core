function showLoading(container) {
  container.innerHTML = `
    <div class="loading">
      Carregando flows...
    </div>
  `;
}

function showError(container) {
  container.innerHTML = `
    <div class="error-message">
      Erro ao conectar com API
    </div>
  `;
}
