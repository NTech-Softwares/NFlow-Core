const API_URL = window.APP_CONFIG.API_URL;

const token = localStorage.getItem("token");

init();

async function init() {
  const authenticated = await loginHandle();

  if (!authenticated) {
    return;
  }

  await getStatus();

  let list_groups = false;

  if (!list_groups) {
    await listGroups();

    list_groups = true;
  }
}

/*
 =========================
 AUTENTICAÇÃO
 =========================
*/

async function loginHandle() {
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
    localStorage.removeItem("token");

    window.location.href = "/login";

    return false;
  }
}

/*
 =========================
 STATUS
 =========================
*/

async function getStatus() {
  const status = document.getElementById("status");

  try {
    const response = await fetch(`${API_URL}/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    status.innerText = data.whatsapp || "Erro";

    console.log("-----------------------------------------");

    console.log(data);
  } catch (error) {
    status.innerText = "Erro";

    console.log(error);
  }
}

/*
 =========================
 INPUT STATE
 =========================
*/

async function updateNumberInputState() {
  const numberInput = document.getElementById("number");

  const sendMsgBtn = document.getElementById("sendMessage");

  const sendCpmgBtn = document.getElementById("sendCampaign");

  const checkedGroups = document.querySelectorAll(".group-checkbox:checked");

  const hasSelectedGroups = checkedGroups.length > 0;

  if (hasSelectedGroups) {
    numberInput.disabled = true;

    numberInput.value = "";

    numberInput.placeholder = "Desabilitado ao selecionar grupos";

    sendMsgBtn.disabled = true;

    sendMsgBtn.style.backgroundColor = "#096315";

    sendCpmgBtn.disabled = false;

    sendCpmgBtn.style.backgroundColor = "#18eb35";
  } else {
    numberInput.disabled = false;

    numberInput.placeholder = "5585999999999";

    sendMsgBtn.disabled = false;

    sendMsgBtn.style.backgroundColor = "#18eb35";

    sendCpmgBtn.disabled = true;

    sendCpmgBtn.style.backgroundColor = "#096315";
  }
}

/*
 =========================
 ENVIAR MENSAGEM
 =========================
*/

async function sendMessage() {
  const number = document.getElementById("number").value;

  const message = document.getElementById("message").value;

  const image = document.getElementById("image").files[0];

  const result = document.getElementById("result");

  result.innerText = "Enviando...";

  try {
    const formData = new FormData();

    formData.append("number", number);

    formData.append("message", message);

    if (image) {
      formData.append("image", image);
    }

    const response = await fetch(`${API_URL}/whatsapp/send-message`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      result.innerText = "Mensagem adicionada na fila com sucesso!";
    } else {
      result.innerText = "Erro ao enviar mensagem";
    }
  } catch (error) {
    result.innerText = "Erro ao conectar com a API";

    console.log(error);
  }
}

/*
 =========================
 LISTAR GRUPOS
 =========================
*/

async function listGroups() {
  const groups = document.getElementById("groups");

  groups.innerHTML = "";

  const resultGroup = document.getElementById("resultGroup");

  resultGroup.innerText = "Listando...";

  try {
    const response = await fetch(`${API_URL}/whatsapp/list-groups`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      resultGroup.innerText = "Download de lista de grupos concluído...";
    } else {
      resultGroup.innerText = "Erro ao listar grupos";
    }

    data.array.forEach((group) => {
      const groupItem = document.createElement("div");

      groupItem.classList.add("group-item");

      groupItem.innerHTML = `
        <div class="group-left">

          <input
            type="checkbox"
            class="group-checkbox"
            value="${group.id}"
          >

          <div class="group-info">

            <span class="group-name">
              ${group.name}
            </span>

            <span class="group-members">
              ${group.participants} participantes
            </span>

          </div>

        </div>
      `;

      const checkbox = groupItem.querySelector(".group-checkbox");

      checkbox.addEventListener("change", updateNumberInputState);

      groups.appendChild(groupItem);
    });
  } catch (error) {
    resultGroup.innerText = "Erro ao conectar com a API";

    console.log(error);
  }
}

/*
 =========================
 SELECIONAR TODOS
 =========================
*/

async function toggleSelectAll() {
  const checkboxes = document.querySelectorAll(".group-checkbox");

  const allChecked = [...checkboxes].every((cb) => cb.checked);

  checkboxes.forEach((cb) => {
    cb.checked = !allChecked;
  });

  updateNumberInputState();
}

/*
 =========================
 ENVIAR CAMPANHA
 =========================
*/

async function sendCampaign() {
  const selectedGroups = [
    ...document.querySelectorAll(".group-checkbox:checked"),
  ].map((cb) => cb.value);

  const image = document.getElementById("image").files[0];

  const result = document.getElementById("result");

  result.innerText = "Enviando Campanha...";

  try {
    const formData = new FormData();

    selectedGroups.forEach((group) => {
      formData.append("groups", group);
    });

    formData.append("message", document.getElementById("message").value);

    if (image) {
      formData.append("image", image);
    }

    const response = await fetch(`${API_URL}/whatsapp/send-campaign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      result.innerText = "Campanha adicionada na fila com sucesso!";
    } else {
      result.innerText = "Erro ao enviar campanha";
    }
  } catch (error) {
    result.innerText = "Erro ao conectar com a API";

    console.log(error);
  }
}
