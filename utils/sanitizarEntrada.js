// Função para sanitizar entradas do usuário
// Remove caracteres potencialmente perigosos para evitar injeções de código ou SQL
const sanitizarEntrada = (valor) => {
    // Se o valor for uma string, aplica a substituição
    if (typeof valor === 'string') {
        // Remove caracteres especiais que podem ser usados em ataques (ex: < > " ' % ; ( ) & +)
        return valor.replace(/[<>"'%;()&+]/g, '');
    }

    // Se não for string, retorna o valor original
    return valor;
};

module.exports = sanitizarEntrada;

