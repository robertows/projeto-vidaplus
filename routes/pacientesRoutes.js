const express = require('express');
const router = express.Router();
const verificarAutenticacao = require('../middlewares/authMiddleware');
const db = require('../db');
const {
  anonimizarCPFs,
  cancelarAnonimizacao,
  excluirPorCPF
} = require('../controllers/pacientesController');

// ✅ ROTA GET para listar pacientes
router.get('/', verificarAutenticacao(['admin', 'atendente', 'profissional']), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pacientes');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar pacientes:', err);
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

// ✅ ROTA POST para cadastrar paciente com validação e auditoria
router.post('/', verificarAutenticacao(['admin', 'atendente']), async (req, res) => {
  const { nome, cpf, data_nascimento, telefone, endereco } = req.body;

  if (!nome || !cpf) {
    return res.status(400).json({ error: 'Nome e CPF são obrigatórios.' });
  }

  // Expressão para detectar tentativas comuns de injeção
  const padraoSQL = /('|--|;|DROP\s+TABLE|SELECT\s+\*|INSERT\s+INTO|DELETE\s+FROM|UPDATE\s+\w+)/i;
  if (padraoSQL.test(nome)) {
    try {
      await db.query(
        'INSERT INTO auditoria (usuario, acao, data) VALUES (?, ?, NOW())',
        ['sistema', `Tentativa de injeção SQL no nome do paciente: "${nome}"`]
      );
      console.warn('🚨 Tentativa de injeção SQL registrada na auditoria.');
    } catch (auditErr) {
      console.error('Erro ao registrar tentativa maliciosa na auditoria:', auditErr);
    }

    // ✅ Fora do try/catch
    return res.status(400).json({ error: 'Nome do paciente contém padrões inválidos.' });
  }

  const nomeValido = /^[\p{L}\p{N}\s.,'-]+$/u.test(nome);
  const enderecoValido = !endereco || /^[\p{L}\p{N}\s.,'-]{0,255}$/u.test(endereco);
  const telefoneValido = !telefone || /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/.test(telefone);

  if (!nomeValido) {
    return res.status(400).json({ error: 'Nome contém caracteres inválidos.' });
  }

  if (!enderecoValido) {
    return res.status(400).json({ error: 'Endereço inválido.' });
  }

  if (!telefoneValido) {
    return res.status(400).json({ error: 'Telefone inválido. Ex: (21) 99999-9999' });
  }

  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) {
    return res.status(400).json({ error: 'CPF Inválido,deve conter exatamente 11 dígitos numéricos.' });
  }

  try {
    await db.query(
      'INSERT INTO pacientes (nome, cpf, data_nascimento, telefone, endereco) VALUES (?, ?, ?, ?, ?)',
      [nome, cpfLimpo, data_nascimento, telefone, endereco]
    );

    res.status(201).json({ message: 'Paciente cadastrado com sucesso.' });
  } catch (err) {
    console.error('Erro ao cadastrar paciente:', err);
    res.status(500).json({ error: 'Erro ao cadastrar paciente no banco de dados.' });
  }
});

// ✅ ROTA PUT para anonimizar CPFs
router.put('/anonimizar', verificarAutenticacao(['admin']), anonimizarCPFs);

// ✅ ROTA PUT para cancelar anonimização
router.put('/cancelar-anonimizacao/:id', verificarAutenticacao('admin'), cancelarAnonimizacao);

// ✅ ROTA DELETE por CPF
router.delete('/delete-by-cpf/:cpf', verificarAutenticacao('admin'), excluirPorCPF);

// ✅ ROTA DELETE por ID do paciente
router.delete('/:id', verificarAutenticacao('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM pacientes WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado.' });
    }

    res.json({ message: 'Paciente excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir paciente:', err);
    res.status(500).json({ error: 'Erro ao excluir paciente.' });
  }
});

module.exports = router;

