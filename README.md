# NFlow Core

Backend moderno para automação de atendimento, campanhas e fluxos inteligentes via WhatsApp utilizando Baileys + Node.js.

---

# 🚀 Sobre o projeto

O **NFlow Core** é o núcleo backend da plataforma NFlow.

O objetivo do projeto é fornecer uma estrutura escalável para:

- automação de mensagens
- campanhas em grupos
- filas de envio
- atendimento automático
- fluxos conversacionais
- múltiplas sessões WhatsApp
- integrações futuras com IA, CRM e dashboards

O projeto foi desenvolvido com foco em:

✅ organização  
✅ escalabilidade  
✅ modularização  
✅ facilidade de adaptação  
✅ arquitetura simples e extensível

---

# ✨ Funcionalidades atuais

- ✅ Conexão com WhatsApp via Baileys
- ✅ Worker de processamento de mensagens
- ✅ Sistema de filas
- ✅ Envio de mensagens individuais
- ✅ Envio de campanhas para grupos
- ✅ Dashboard simples em HTML/CSS/JS
- ✅ Listagem de grupos
- ✅ Fluxos automáticos de atendimento
- ✅ Templates reutilizáveis de mensagens
- ✅ Delay anti-spam
- ✅ Estrutura modular

---

# 🧠 Tecnologias utilizadas

- Node.js
- TypeScript
- Express
- Baileys
- Socket.IO *(em breve)*
- Redis *(planejado)*
- BullMQ *(planejado)*

---

# 📁 Estrutura do projeto

```txt
src/
│
├── api/
│   ├── routes/
│   ├── views/
│   ├── public/
│   │   ├── css/
│   │   └── js/
│   │
│   └── app.ts
│
├── modules/
│   ├── workers/
│   ├── queue/
│   └── status/
│
├── providers/
│   └── whatsapp/
│       └── baileys/
│           ├── client/
│           ├── flows/
│           │   ├── handlers/
│           │   └── templates/
│           │
│           ├── events/
│           ├── services/
│           └── sessions/
│
├── shared/
│   ├── queue/
│   └── utils/
│
└── server.ts
```

---

# ⚙️ Como iniciar o projeto

## 1. Clone o repositório

```bash
git clone <repo-url>
```

---

## 2. Instale as dependências

```bash
npm install
```

ou

```bash
yarn
```

---

## 3. Execute o projeto

```bash
npm run dev
```

---

# 🔌 Conectando o WhatsApp

Ao iniciar o projeto:

- um QR Code será exibido no terminal
- escaneie com o WhatsApp
- a sessão será salva automaticamente

---

# 📨 Sistema de filas

O projeto utiliza uma fila simples em memória para processamento das mensagens.

Exemplo:

```ts
messageQueue.push({
    jid: '558599999999@s.whatsapp.net',
    message: {
        text: 'Olá!'
    }
})
```

---

# 🤖 Fluxo automático de mensagens

Os fluxos ficam organizados em:

```txt
providers/whatsapp/baileys/flows
```

---

## Exemplo de template

```ts
export const messages = {

    welcome: `
Olá! Você está falando com a NTech 🚀

Digite uma opção:
1 - Cursos
2 - Automação
3 - Web
4 - Mobile
`
}
```

---

# 🧩 Adaptando o projeto

O NFlow Core foi pensado para ser facilmente adaptável.

Você pode utilizar para:

- atendimento empresarial
- automação comercial
- CRM
- campanhas
- suporte técnico
- SaaS de automação
- chatbots
- funis de vendas
- notificações

---

# 📦 Endpoints disponíveis

## WhatsApp

### Enviar mensagem

```http
POST /whatsapp/send-message
```

Body:

```json
{
  "number": "5585999999999",
  "message": "Olá!"
}
```

---

### Enviar campanha

```http
POST /whatsapp/send-campaign
```

Body:

```json
{
  "groups": [
    "120363XXXXXXXX@g.us"
  ],
  "message": "Mensagem da campanha"
}
```

---

### Listar grupos

```http
GET /whatsapp/list-groups
```

---

# 🛡️ Anti-spam

O sistema possui delays automáticos entre mensagens:

```ts
const randomDelay =
    Math.floor(Math.random() * 5000) + 3000
```

Isso reduz riscos de bloqueios.

---

# 🧠 Próximas implementações

- [ ] Redis Queue
- [ ] BullMQ
- [ ] Multi sessão
- [ ] Painel em tempo real
- [ ] Socket.IO
- [ ] Banco de dados
- [ ] IA integrada
- [ ] Funil de atendimento
- [ ] Agendamento de campanhas
- [ ] Upload de mídia
- [ ] Controle de leads
- [ ] API pública

---

# 📌 Observações importantes

O Baileys depende do WhatsApp Web e pode sofrer mudanças conforme atualizações do WhatsApp.

Utilize o projeto com responsabilidade.

---

# 👨‍💻 Contribuindo

Sinta-se livre para adaptar, melhorar e evoluir o projeto.

Pull requests são bem-vindos.

---

# 📄 Licença

MIT License

---

# 💚 NFlow

Automação inteligente para negócios modernos.
