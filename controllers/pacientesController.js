const db = require('../db');

// Função para anonimizar todos os CPFs dos pacientes
// Substitui os CPFs reais por 'XXXXXXXXXXX' e salva o original em 'cpf_original'
exports.anonimizarCPFs = async (req, res) => {
  const { acao } = req.body;

  // Verifica se a ação enviada na requisição é 'anonimizar'
  if (acao !== 'anonimizar') {
    return res.status(400).json({ error: 'Ação inválida. Use "acao": "anonimizar"' });
  }

  try {
    console.log('➡️ Requisição para anonimizar CPFs recebida');

    // Atualiza os registros dos pacientes que ainda não foram anonimizados
    // Armazena o CPF atual em 'cpf_original' e define 'XXXXXXXXXXX' no campo 'cpf'
    const [result] = await db.query(`
      UPDATE pacientes
      SET cpf_original = cpf, cpf = 'XXXXXXXXXXX'
      WHERE cpf NOT LIKE 'X%' AND LENGTH(cpf) = 11
    `);

    console.log(`CPFs anonimizados: ${result.affectedRows}`);
    res.json({ message: `CPFs anonimizados: ${result.affectedRows}`, affectedRows: result.affectedRows });
  } catch (err) {
    console.error('Erro ao anonimizar CPFs:', err);
    res.status(500).json({ error: 'Erro ao anonimizar CPFs' });
  }
};

// Função para cancelar a anonimização de um CPF
// Restaura o CPF original de um paciente com base no ID fornecido
exports.cancelarAnonimizacao = async (req, res) => {
  const pacienteId = req.params.id;

  try {
    // Busca o CPF original do paciente no banco de dados
    const [rows] = await db.query('SELECT cpf_original FROM pacientes WHERE id = ?', [pacienteId]);

    // Verifica se o paciente foi encontrado e se há um CPF original armazenado
    if (!rows.length || !rows[0].cpf_original) {
      return res.status(404).json({ error: 'Paciente não encontrado ou CPF original ausente.' });
    }

    const cpfOriginal = rows[0].cpf_original;

    // Atualiza o registro do paciente, restaurando o CPF original e limpando o campo 'cpf_original'
    const [result] = await db.query(
      'UPDATE pacientes SET cpf = ?, cpf_original = NULL WHERE id = ?',
      [cpfOriginal, pacienteId]
    );

    console.log(`CPF restaurado para o paciente ID ${pacienteId}`);
    res.json({ message: 'Anonimização cancelada com sucesso', affectedRows: result.affectedRows });
  } catch (err) {
    console.error('Erro ao cancelar anonimização:', err);
    res.status(500).json({ error: 'Erro interno ao cancelar anonimização' });
  }
};

// Função para excluir um paciente com base no CPF informado
// Remove permanentemente o registro do paciente com o CPF especificado
exports.excluirPorCPF = async (req, res) => {
  const cpf = req.params.cpf;

  try {
    // Executa o comando de exclusão no banco de dados
    const [result] = await db.query('DELETE FROM pacientes WHERE cpf = ?', [cpf]);

    // Caso nenhum registro tenha sido afetado, o paciente não foi encontrado
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    console.log(`Paciente com CPF ${cpf} excluído`);
    res.json({ message: 'Paciente excluído com sucesso', affectedRows: result.affectedRows });
  } catch (err) {
    console.error('Erro ao excluir paciente por CPF:', err);
    res.status(500).json({ error: 'Erro ao excluir paciente' });
  }
};




