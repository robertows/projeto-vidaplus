# 🏥 VidaPlus2 – Sistema de Gestão Hospitalar e de Serviços de Saúde (SGHSS)

> RU: **4334534**  
> Autor: **Roberto Carvalho**  
> Projeto para a disciplina de **Engenharia de Software / Qualidade de Software**

---

## 📌 Descrição

O **VidaPlus2** é um sistema completo de gestão hospitalar com funcionalidades voltadas à **inclusão digital, controle, auditoria e segurança de dados** conforme a LGPD.  
Foi desenvolvido para fins educacionais e simula a rotina de um hospital moderno com suporte a **atendimentos presenciais e por telemedicina**.

---

## 🚀 Funcionalidades Principais

- ✅ Login com autenticação JWT
- ✅ Controle de acesso por perfil (admin, atendente, profissional)
- ✅ Cadastro de pacientes com CPF validado
- ✅ Anonimização e exclusão do CPF (conforme LGPD)
- ✅ Registro de auditoria para ações sensíveis e tentativas maliciosas
- ✅ Agendamento de consultas presenciais e online
- ✅ Atendimento por **telemedicina** com registro de vídeo e prescrição online
- ✅ Prescrições médicas presenciais e online
- ✅ Agendamento e resultados de exames
- ✅ Histórico clínico do paciente
- ✅ Controle de leitos hospitalares
- ✅ Gestão de suprimentos e estoque
- ✅ Histórico financeiro hospitalar
- ✅ Painel de auditoria com filtros por usuário, data e ação

---
🌐 Acesso ao Sistema

🔗 Sistema online:

https://projeto-vidaplus-production.up.railway.app/pacientes.html

🔐 Credenciais de Acesso para Testes:

Perfil	Usuário	     Senha
Admin	admin123	admin123

## 🛠️ Tecnologias Utilizadas

**Back-end:**
- Node.js
- Express
- MySQL2 (pool de conexões)
- Bcrypt (criptografia de senhas)
- JWT (autenticação segura)
- Dotenv (variáveis de ambiente)

**Front-end:**
- HTML, CSS, JavaScript puro
- Fetch API
- LocalStorage com token JWT

**Hospedagem:**
- Railway (Back-end e Front-end integrados)
- GitHub (código-fonte completo)
--

## 🧑‍💻 Como executar localmente

### Pré-requisitos:
- Node.js e npm
- MySQL Server
- Clonar este repositório

### 1. Clonar o projeto
```bash
git clone https://github.com/robertows/projeto-vidaplus.git
cd projeto-vidaplus
