async function updateNumberInputState() {

    const numberInput =
        document.getElementById('number');

    const checkedGroups =
        document.querySelectorAll(
            '.group-checkbox:checked'
        );

    const hasSelectedGroups =
        checkedGroups.length > 0;

    if (hasSelectedGroups) {

        numberInput.disabled = true;

        numberInput.value = '';

        numberInput.placeholder =
            'Desabilitado ao selecionar grupos';

    } else {

        numberInput.disabled = false;

        numberInput.placeholder =
            '5585999999999';
    }
}

async function sendMessage() {
    const number = document.getElementById('number').value
    const message = document.getElementById('message').value
    const result = document.getElementById('result')

    result.innerText = 'Enviando...'

    try {
        const response = await fetch(
            '/whatsapp/send-message',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    number,
                    message
                })
            }
        )

        const data = await response.json()

        if (data.success) {
            result.innerText = 'Mensagem adicionada na fila com sucesso!'
        } else {
            result.innerText = 'Erro ao enviar mensagem'
        }

    } catch (error) {
        result.innerText = 'Erro ao conectar com a API'
        console.log(error)
    }
}

async function listGroups() {
    const groups = document.getElementById('groups');
    groups.innerHTML = '';

    const resultGroup = document.getElementById('resultGroup')
    resultGroup.innerText = 'Listando...'

    try {
        const response = await fetch(
            '/whatsapp/list-groups',
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
            }
        )

        const data = await response.json()

        if (data.success) {
            resultGroup.innerText = 'Download de lista de grupos concluido...'
        } else {
            resultGroup.innerText = 'Erro ao listar grupos'
        }

        data.array.forEach(group => {
            const groupItem = document.createElement('div');
            groupItem.classList.add('group-item');
            groupItem.innerHTML =
                `<div class="group-left">
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
                    </div>`;

            const checkbox = groupItem.querySelector('.group-checkbox');

            checkbox.addEventListener(
                'change',
                updateNumberInputState
            );

            groups.appendChild(groupItem);
        });

    } catch (error) {
        resultGroup.innerText = 'Erro ao conectar com a API'
        console.log(error)
    }

}

async function toggleSelectAll() {

    const checkboxes =
        document.querySelectorAll('.group-checkbox');

    const allChecked =
        [...checkboxes].every(cb => cb.checked);

    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
    });

    updateNumberInputState();
}

async function sendCampaign() {
    const selectedGroups =
        [...document.querySelectorAll('.group-checkbox:checked')]
            .map(cb => cb.value)
    const result = document.getElementById('result')

    result.innerText = 'Enviando Campanha...'

    try {
        const response = await fetch('/whatsapp/send-campaign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                groups: selectedGroups,
                message: document.getElementById('message').value
            })
        })

        const data = await response.json()

        if (data?.success) {
            result.innerText = 'Campanha adicionada na fila com sucesso!'
        } else {
            result.innerText = 'Erro ao enviar campanha'
        }

    } catch (error) {
        result.innerText = 'Erro ao conectar com a API'
        console.log(error)
    }
}