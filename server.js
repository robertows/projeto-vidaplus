const express = require('express');
const cors = require('cors');
const app = express();

// ===== MIDDLEWARES GLOBAIS =====
// Habilita o uso de CORS para permitir requisições de outras origens (ex: front-end)
app.use(cors());
// Permite que a aplicação entenda JSON no corpo das requisições
app.use(express.json());

// ===== IMPORTAÇÃO DAS ROTAS =====
const pacientesRoutes = require('./routes/pacientesRoutes');             // Rota para pacientes (CRUD, LGPD)
const authRoutes = require('./routes/authRoutes');                       // Rota para autenticação (login)
const auditoriaRoutes = require('./routes/auditoriaRoutes');             // Rota para registro e listagem de auditoria
const profissionaisRoutes = require('./routes/profissionaisRoutes');     // Rota para cadastro e gestão de profissionais de saúde
const consultasRoutes = require('./routes/consultasRoutes');             // Rota para agendamento e gerenciamento de consultas
const examesRoutes = require('./routes/examesRoutes');                   // Rota para agendamento e resultados de exames
const telemedicinaRoutes = require('./routes/telemedicinaRoutes');       // Rota para agendamentos e funcionalidades de telemedicina
const prescricoesRoutes = require('./routes/prescricoesRoutes');         // Rota para prescrições médicas
const leitosRoutes = require('./routes/leitosRoutes');                   // Rota para controle e liberação de leitos
const suprimentosRoutes = require('./routes/suprimentosRoutes');         // Rota para gestão de estoque de suprimentos
const historicoFinanceiroRoutes = require('./routes/historicoFinanceiroRoutes'); // Rota para entradas e saídas financeiras
const usuariosRoutes = require('./routes/usuariosRoutes');               // Rota para cadastro e controle de usuários

// ===== USO DAS ROTAS NO SERVIDOR =====
app.use('/pacientes', pacientesRoutes);
app.use('/auditoria', auditoriaRoutes);
app.use('/profissionais', profissionaisRoutes);
app.use('/consultas', consultasRoutes);
app.use('/exames', examesRoutes);
app.use('/telemedicina', telemedicinaRoutes);
app.use('/prescricoes', prescricoesRoutes);
app.use('/leitos', leitosRoutes);
app.use('/suprimentos', suprimentosRoutes);
app.use('/historico_financeiro', historicoFinanceiroRoutes);
app.use('/usuarios', usuariosRoutes); // 🔁 Evite duplicar esta linha
app.use(authRoutes); // Login

// ===== ROTA PADRÃO =====
// Rota raiz para verificação se o servidor está rodando
app.get('/', (req, res) => {
  res.send('✅ Servidor VidaPlus2 rodando com sucesso!');
});

// ===== INICIALIZAÇÃO DO SERVIDOR =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
