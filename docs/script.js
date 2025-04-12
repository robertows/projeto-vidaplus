console.log('✅ Script carregado: utilizando decodificação manual de JWT');

// Remove todos os caracteres não numéricos de um CPF
function limparCPF(cpf) {
    return cpf.replace(/\D/g, '');
}
// Função para decodificar o token JWT manualmente
function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        throw new Error('Erro ao decodificar o token: ' + e.message);
    }
}

// URL base da API
const API_URL = 'https://projeto-vidaplus-production.up.railway.app';
function getUsuarioLogado() {
    const usuario = localStorage.getItem('usuarioLogado');
    return usuario ? JSON.parse(usuario) : null;
}

async function anonimizarCPFs() {
    const usuarioLogado = getUsuarioLogado();
    console.log('Usuário logado:', usuarioLogado);

    if (!usuarioLogado || usuarioLogado.permissao !== 'admin') {
        console.warn('Permissão negada');
        alert('Apenas administradores podem anonimizar CPFs.');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Você precisa estar autenticado para realizar esta ação.');
        return;
    }

    const confirmacao = confirm(
        'Tem certeza que deseja anonimizar todos os CPFs?\n' +
        'Esta ação substituirá todos os CPFs por "XXXXXXXXXXX".'
    );
    if (!confirmacao) return;

    try {
        console.log('Enviando requisição para anonimizar CPFs...');
        const response = await makeAuthenticatedRequest('/pacientes/anonimizar', 'PUT', { acao: 'anonimizar' });

        console.log('Resposta recebida da API:', response);

        const registrosAfetados = response.affectedRows ?? 0;

        alert(`CPFs anonimizados com sucesso! Registros afetados: ${registrosAfetados}`);

        // Recarrega a tabela de pacientes, se a função estiver definida
        if (typeof carregarPacientes === 'function') {
            await carregarPacientes();
        }
    } catch (error) {
        console.error('Erro ao anonimizar CPFs:', error);
        alert('Erro ao anonimizar CPFs: ' + error.message);
    }
}

async function makeAuthenticatedRequest(url, method, body = null) {
    const token = localStorage.getItem('token');
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (body !== null) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${url}`, options);
    const responseText = await response.text();

    if (!response.ok) {
        try {
            const errorData = JSON.parse(responseText);
            throw new Error(errorData.error || 'Erro na requisição');
        } catch (e) {
            throw new Error('Erro desconhecido: ' + responseText);
        }
    }

    // ✅ Aqui é onde você insere:
    console.log(`Resposta recebida de ${url}:`, responseText);

    return responseText ? JSON.parse(responseText) : {};
}

// Função para cancelar anonimização
async function cancelarAnonimizacao() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (usuarioLogado?.permissao !== 'admin') {
        alert('Apenas administradores podem cancelar anonimização.');
        return;
    }

    const cpf = prompt('Digite o CPF do paciente para cancelar a anonimização (ex.: XXX.XXX.XXX-XX ou original):');
    if (!cpf) {
        alert('Operação cancelada. Nenhum CPF fornecido.');
        return;
    }

    try {
        const cpfLimpo = limparCPF(cpf);
        const pacientes = await makeAuthenticatedRequest('/pacientes');
        const paciente = pacientes.find(p => p.cpf === cpfLimpo || p.cpf_original === cpfLimpo);
        if (!paciente) {
            throw new Error('Paciente com este CPF não encontrado.');
        }

        await makeAuthenticatedRequest(`/pacientes/cancelar-anonimizacao/${paciente.id}`, 'PUT');
        await registrarAuditoria(`Anonimização cancelada para paciente com CPF ${cpf}`);
        alert('Anonimização cancelada com sucesso!');
        await carregarPacientes();
    } catch (error) {
        console.error('Erro ao cancelar anonimização:', error);
        alert('Erro ao cancelar anonimização: ' + error.message);
    }
}

// Função para excluir dados por CPF
async function excluirDadosPorCPF() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (usuarioLogado?.permissao !== 'admin') {
        alert('Apenas administradores podem excluir dados.');
        return;
    }

    const cpf = prompt('Digite o CPF do paciente a ser excluído (ex.: XXX.XXX.XXX-XX ou original):');
    if (!cpf) {
        alert('Operação cancelada. Nenhum CPF fornecido.');
        return;
    }

    try {
        const cpfLimpo = limparCPF(cpf);
        await makeAuthenticatedRequest(`/pacientes/delete-by-cpf/${encodeURIComponent(cpfLimpo)}`, 'DELETE');
        await registrarAuditoria(`Dados do paciente com CPF ${cpf} excluídos`);
        alert('Dados excluídos com sucesso!');
        await carregarPacientes();
    } catch (error) {
        console.error('Erro ao excluir dados:', error);
        alert('Erro ao excluir dados: ' + error.message);
    }
}
// Função para registrar auditoria
async function registrarAuditoria(acao) {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    const usuario = usuarioLogado ? usuarioLogado.usuario : 'Desconhecido';

    try {
        await makeAuthenticatedRequest('/auditoria', 'POST', { usuario, acao });
    } catch (error) {
        console.error('Erro ao registrar auditoria:', error);
        throw new Error('Falha ao registrar auditoria: ' + error.message);
    }
}

// Verificar estado de login ao carregar a página
function verificarEstadoLogin() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    const usuarioLogadoSpan = document.getElementById('usuarioLogado');
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');

    if (usuarioLogado && localStorage.getItem('token')) {
        if (usuarioLogadoSpan) usuarioLogadoSpan.textContent = usuarioLogado.usuario;
        if (btnLogin) btnLogin.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'inline-block';
    } else {
        if (usuarioLogadoSpan) usuarioLogadoSpan.textContent = 'Nenhum';
        if (btnLogin) btnLogin.style.display = 'inline-block';
        if (btnLogout) btnLogout.style.display = 'none';
    }
}

// Função para destacar o link ativo na navegação
function destacarLinkAtivo() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Função para formatar CPF
function formatarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return cpf;
}
// Função para exibir CPF com pontuação no front-end
function formatarCPFVisual(cpf) {
    cpf = cpf.replace(/\D/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
// Função para formatar telefone no formato (XX) XXXXX-XXXX
function formatarTelefone(telefone) {
    telefone = telefone.replace(/\D/g, '');
    if (telefone.length !== 11) {
        throw new Error('Telefone deve ter 11 dígitos (DDD + número).');
    }
    telefone = telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    return telefone;
}

// Função auxiliar para formatar data e hora ISO para DD/MM/AAAA HH:mm:ss
function formatarDataHoraCompleta(dataISO) {
    const data = new Date(dataISO);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const minuto = String(data.getMinutes()).padStart(2, '0');
    const segundo = String(data.getSeconds()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
}
// Função auxiliar para formatar data ISO para DD/MM/AAAA
function formatarDataISO(dataISO) {
    const data = new Date(dataISO);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
}
// Função para configurar datas mínimas
function configurarDatasMinimas() {
    const hoje = new Date().toISOString().split('T')[0];
    const dataConsulta = document.getElementById('dataConsulta');
    const dataExame = document.getElementById('dataExame');
    const dataTele = document.getElementById('dataTele');
    if (dataConsulta) dataConsulta.setAttribute('min', hoje);
    if (dataExame) dataExame.setAttribute('min', hoje);
    if (dataTele) dataTele.setAttribute('min', hoje);
}

// Função para carregar leitos (movida para o escopo global)
async function carregarLeitos() {
    const leitosDisponiveisSpan = document.getElementById('leitosDisponiveis');
    const leitosOcupadosSpan = document.getElementById('leitosOcupados');
    if (!leitosDisponiveisSpan || !leitosOcupadosSpan) return;

    try {
        const leitos = await makeAuthenticatedRequest('/leitos');
        const disponiveis = leitos.filter(l => l.status === 'Disponível').length;
        const ocupados = leitos.filter(l => l.status === 'Ocupado').length;
        leitosDisponiveisSpan.textContent = disponiveis;
        leitosOcupadosSpan.textContent = ocupados;
    } catch (error) {
        console.error('Erro ao carregar leitos:', error);
        leitosDisponiveisSpan.textContent = 'Erro';
        leitosOcupadosSpan.textContent = 'Erro';
    }
}

// Função para carregar pacientes
async function carregarPacientes() {
    const corpoTabelaPacientes = document.getElementById('corpoTabela');
    const pacienteConsultaSelect = document.getElementById('pacienteConsulta');
    const pacienteExameSelect = document.getElementById('pacienteExame');
    const pacienteTeleSelect = document.getElementById('pacienteTele');
    const pacientePrescricaoSelect = document.getElementById('pacientePrescricao');
    const selecionarPacienteSelect = document.getElementById('selecionarPaciente');
    const selecionarPacienteHistoricoSelect = document.getElementById('selecionarPacienteHistorico');

    if (!pacienteConsultaSelect && !pacienteExameSelect && !corpoTabelaPacientes && 
        !pacienteTeleSelect && !pacientePrescricaoSelect && !selecionarPacienteSelect && 
        !selecionarPacienteHistoricoSelect) return;

    try {
        const pacientes = await makeAuthenticatedRequest('/pacientes');
        if (!Array.isArray(pacientes) || pacientes.length === 0) {
            if (corpoTabelaPacientes) corpoTabelaPacientes.innerHTML = '<tr><td colspan="6">Nenhum paciente cadastrado.</td></tr>';
            const selects = [pacienteConsultaSelect, pacienteExameSelect, pacienteTeleSelect, 
                            pacientePrescricaoSelect, selecionarPacienteSelect, selecionarPacienteHistoricoSelect];
            selects.forEach(select => {
                if (select) select.innerHTML = '<option value="">Nenhum paciente disponível</option>';
            });
            return;
        }

        if (corpoTabelaPacientes) {
            corpoTabelaPacientes.innerHTML = '';
            pacientes.forEach(paciente => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${paciente.nome || 'Nome não informado'}</td>
                    <td>${paciente.cpf || 'CPF não informado'}</td>
                    <td>${paciente.data_nascimento ? formatarDataISO(paciente.data_nascimento) : 'Data não informada'}</td>
                    <td>${paciente.telefone || 'Telefone não informado'}</td>
                    <td>${paciente.endereco || 'Endereço não informado'}</td>
                    <td><button onclick="exibirModalConfirmacao(() => excluirPaciente(${paciente.id}))">Excluir</button></td>
                `;
                corpoTabelaPacientes.appendChild(tr);
            });
        }

        const selects = [pacienteConsultaSelect, pacienteExameSelect, pacienteTeleSelect, 
                        pacientePrescricaoSelect, selecionarPacienteSelect, selecionarPacienteHistoricoSelect];
        selects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Selecione um paciente</option>';
                pacientes.forEach(paciente => {
                    const option = document.createElement('option');
                    option.value = paciente.id;
                    option.textContent = paciente.nome || 'Nome não informado';
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Erro ao carregar pacientes:', error);
        if (corpoTabelaPacientes) corpoTabelaPacientes.innerHTML = '<tr><td colspan="6">Erro ao carregar pacientes.</td></tr>';
        const selects = [pacienteConsultaSelect, pacienteExameSelect, pacienteTeleSelect, 
                        pacientePrescricaoSelect, selecionarPacienteSelect, selecionarPacienteHistoricoSelect];
        selects.forEach(select => {
            if (select) select.innerHTML = '<option value="">Erro ao carregar</option>';
        });
    }
}

// Função para excluir paciente
async function excluirPaciente(id) {
    try {
        await makeAuthenticatedRequest(`/pacientes/${id}`, 'DELETE');
        await registrarAuditoria(`Paciente ID ${id} excluído`);
        await carregarPacientes();
    } catch (error) {
        console.error('Erro ao excluir paciente:', error);
        alert('Erro ao excluir paciente: ' + error.message);
    }
}
// Função para carregar profissionais
async function carregarProfissionais() {
    const corpoTabelaProf = document.getElementById('corpoTabelaProf');
    const profissionalConsultaSelect = document.getElementById('profissionalConsulta');
    const profissionalTeleSelect = document.getElementById('profissionalTele');
    const selecionarProfissionalSelect = document.getElementById('selecionarProfissional');

    if (!corpoTabelaProf && !profissionalConsultaSelect && !profissionalTeleSelect && !selecionarProfissionalSelect) return;

    try {
        const profissionais = await makeAuthenticatedRequest('/profissionais');
        if (!Array.isArray(profissionais) || profissionais.length === 0) {
            if (corpoTabelaProf) corpoTabelaProf.innerHTML = '<tr><td colspan="7">Nenhum profissional cadastrado.</td></tr>';
            const selects = [profissionalConsultaSelect, profissionalTeleSelect, selecionarProfissionalSelect];
            selects.forEach(select => {
                if (select) select.innerHTML = '<option value="">Nenhum profissional disponível</option>';
            });
            return;
        }

        if (corpoTabelaProf) {
            corpoTabelaProf.innerHTML = '';
            profissionais.forEach(prof => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${prof.nome}</td>
                    <td>${prof.categoria}</td>
                    <td>${prof.especialidade || '-'}</td>
                    <td>${prof.crm || '-'}</td>
                    <td>${prof.telefone}</td>
                    <td>${prof.email}</td>
                    <td><button onclick="exibirModalConfirmacao(() => excluirProfissional(${prof.id}))">Excluir</button></td>
                `;
                corpoTabelaProf.appendChild(tr);
            });
        }

        const selects = [profissionalConsultaSelect, profissionalTeleSelect, selecionarProfissionalSelect];
        selects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Selecione um profissional</option>';
                profissionais.forEach(prof => {
                    const option = document.createElement('option');
                    option.value = prof.id;
                    option.textContent = prof.nome;
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Erro ao carregar profissionais:', error);
        if (corpoTabelaProf) corpoTabelaProf.innerHTML = '<tr><td colspan="7">Erro ao carregar profissionais.</td></tr>';
        const selects = [profissionalConsultaSelect, profissionalTeleSelect, selecionarProfissionalSelect];
        selects.forEach(select => {
            if (select) select.innerHTML = '<option value="">Erro ao carregar</option>';
        });
    }
}

// Função para excluir profissional
async function excluirProfissional(id) {
    try {
        await makeAuthenticatedRequest(`/profissionais/${id}`, 'DELETE');
        await registrarAuditoria(`Profissional ID ${id} excluído`);
        await carregarProfissionais();
    } catch (error) {
        console.error('Erro ao excluir profissional:', error);
        alert('Erro ao excluir profissional: ' + error.message);
    }
}

// Função para carregar especialidades
async function carregarEspecialidades() {
    const especialidadeConsultaSelect = document.getElementById('especialidadeConsulta');
    const especialidadeTeleSelect = document.getElementById('especialidadeTele');
    if (!especialidadeConsultaSelect && !especialidadeTeleSelect) return;

    try {
        const profissionais = await makeAuthenticatedRequest('/profissionais');
        const especialidades = [...new Set(profissionais.map(prof => prof.especialidade).filter(e => e))];

        const selects = [especialidadeConsultaSelect, especialidadeTeleSelect];
        selects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Selecione uma especialidade</option>';
                especialidades.forEach(especialidade => {
                    const option = document.createElement('option');
                    option.value = especialidade;
                    option.textContent = especialidade;
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Erro ao carregar especialidades:', error);
        const selects = [especialidadeConsultaSelect, especialidadeTeleSelect];
        selects.forEach(select => {
            if (select) select.innerHTML = '<option value="">Erro ao carregar</option>';
        });
    }
}

// Função para carregar consultas
async function carregarConsultas() {
    const corpoTabelaConsultas = document.getElementById('corpoTabelaConsultas');
    if (!corpoTabelaConsultas) return;

    try {
        const consultas = await makeAuthenticatedRequest('/consultas');
        if (!consultas || consultas.length === 0) {
            corpoTabelaConsultas.innerHTML = '<tr><td colspan="6">Nenhuma consulta agendada.</td></tr>';
            return;
        }
        corpoTabelaConsultas.innerHTML = '';
        consultas.forEach(consulta => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${consulta.paciente || 'Não informado'}</td>
                <td>${consulta.profissional || 'Não informado'}</td>
                <td>${consulta.data ? formatarDataISO(consulta.data) : 'Não informado'}</td>
                <td>${consulta.hora || 'Não informado'}</td>
                <td>${consulta.especialidade || 'Não informado'}</td>
                <td><button onclick="exibirModalConfirmacao(() => excluirConsulta(${consulta.id}))">Excluir</button></td>
            `;
            corpoTabelaConsultas.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar consultas:', error);
        corpoTabelaConsultas.innerHTML = '<tr><td colspan="6">Erro ao carregar consultas.</td></tr>';
    }
}

// Função para excluir consulta
async function excluirConsulta(id) {
    try {
        await makeAuthenticatedRequest(`/consultas/${id}`, 'DELETE');
        await registrarAuditoria(`Consulta ID ${id} excluída`);
        await carregarConsultas();
    } catch (error) {
        console.error('Erro ao excluir consulta:', error);
        alert('Erro ao excluir consulta: ' + error.message);
    }
}

// Função para carregar exames
async function carregarExames() {
    const corpoTabelaExames = document.getElementById('corpoTabelaExames');
    if (!corpoTabelaExames) return;

    try {
        const exames = await makeAuthenticatedRequest('/exames');
        if (!exames || exames.length === 0) {
            corpoTabelaExames.innerHTML = '<tr><td colspan="5">Nenhum exame agendado.</td></tr>';
            return;
        }
        corpoTabelaExames.innerHTML = '';
        exames.forEach(exame => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${exame.paciente || 'Não informado'}</td>
                <td>${exame.tipo || 'Não informado'}</td>
                <td>${exame.data ? formatarDataISO(exame.data) : 'Não informado'}</td>
                <td>${exame.resultado || 'Pendente'}</td>
                <td><button onclick="exibirModalConfirmacao(() => excluirExame(${exame.id}))">Excluir</button></td>
            `;
            corpoTabelaExames.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar exames:', error);
        corpoTabelaExames.innerHTML = '<tr><td colspan="5">Erro ao carregar exames.</td></tr>';
    }
}

// Função para excluir exame
async function excluirExame(id) {
    try {
        await makeAuthenticatedRequest(`/exames/${id}`, 'DELETE');
        await registrarAuditoria(`Exame ID ${id} excluído`);
        await carregarExames();
    } catch (error) {
        console.error('Erro ao excluir exame:', error);
        alert('Erro ao excluir exame: ' + error.message);
    }
}

// Função para carregar telemedicina
async function carregarTelemedicina() {
    const corpoTabelaTelemedicina = document.getElementById('corpoTabelaTelemedicina');
    const consultaTelePrescricaoSelect = document.getElementById('consultaTelePrescricao');
    const selecionarConsultaTeleSelect = document.getElementById('selecionarConsultaTele');

    if (!corpoTabelaTelemedicina && !consultaTelePrescricaoSelect && !selecionarConsultaTeleSelect) return;

    try {
        const teleconsultas = await makeAuthenticatedRequest('/telemedicina');
        if (!teleconsultas || teleconsultas.length === 0) {
            if (corpoTabelaTelemedicina) corpoTabelaTelemedicina.innerHTML = '<tr><td colspan="6">Nenhuma teleconsulta agendada.</td></tr>';
            const selects = [consultaTelePrescricaoSelect, selecionarConsultaTeleSelect];
            selects.forEach(select => {
                if (select) select.innerHTML = '<option value="">Nenhuma consulta disponível</option>';
            });
            return;
        }

        if (corpoTabelaTelemedicina) {
            corpoTabelaTelemedicina.innerHTML = '';
            teleconsultas.forEach(tele => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${tele.paciente || 'Não informado'}</td>
                    <td>${tele.profissional || 'Não informado'}</td>
                    <td>${tele.data ? formatarDataISO(tele.data) : 'Não informado'}</td>
                    <td>${tele.hora || 'Não informado'}</td>
                    <td>${tele.tipo || 'Online'}</td>
                    <td><button onclick="exibirModalConfirmacao(() => excluirTeleconsulta(${tele.id}))">Excluir</button></td>
                `;
                corpoTabelaTelemedicina.appendChild(tr);
            });
        }

        const selects = [consultaTelePrescricaoSelect, selecionarConsultaTeleSelect];
        selects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Selecione uma consulta</option>';
                teleconsultas.forEach(tele => {
                    const option = document.createElement('option');
                    option.value = tele.id;
                    option.textContent = `${tele.paciente || 'Paciente não informado'} - ${tele.data ? formatarDataISO(tele.data) : 'Data não informada'} ${tele.hora || ''}`;
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Erro ao carregar teleconsultas:', error);
        if (corpoTabelaTelemedicina) corpoTabelaTelemedicina.innerHTML = '<tr><td colspan="6">Erro ao carregar teleconsultas.</td></tr>';
        const selects = [consultaTelePrescricaoSelect, selecionarConsultaTeleSelect];
        selects.forEach(select => {
            if (select) select.innerHTML = '<option value="">Erro ao carregar</option>';
        });
    }
}

// Função para excluir teleconsulta
async function excluirTeleconsulta(id) {
    try {
        await makeAuthenticatedRequest(`/telemedicina/${id}`, 'DELETE');
        await registrarAuditoria(`Teleconsulta ID ${id} excluída`);
        await carregarTelemedicina();
    } catch (error) {
        console.error('Erro ao excluir teleconsulta:', error);
        alert('Erro ao excluir teleconsulta: ' + error.message);
    }
}

// Função para carregar usuários
async function carregarUsuarios() {
    const corpoTabelaAcesso = document.getElementById('corpoTabelaAcesso');
    if (!corpoTabelaAcesso) return;

    try {
        const usuarios = await makeAuthenticatedRequest('/usuarios');
        if (!usuarios || usuarios.length === 0) {
            corpoTabelaAcesso.innerHTML = '<tr><td colspan="3">Nenhum usuário cadastrado.</td></tr>';
            return;
        }
        corpoTabelaAcesso.innerHTML = '';
        usuarios.forEach(usuario => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${usuario.usuario}</td>
                <td>${usuario.permissao}</td>
                <td><button onclick="exibirModalConfirmacao(() => excluirUsuario(${usuario.id}))">Excluir</button></td>
            `;
            corpoTabelaAcesso.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        corpoTabelaAcesso.innerHTML = '<tr><td colspan="3">Erro ao carregar usuários.</td></tr>';
    }
}

// Função para excluir usuário
async function excluirUsuario(id) {
    try {
        await makeAuthenticatedRequest(`/usuarios/${id}`, 'DELETE');
        await registrarAuditoria(`Usuário ID ${id} excluído`);
        await carregarUsuarios();
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário: ' + error.message);
    }
}

async function carregarPrescricoesGenerico(tabelaId, pacienteId = null) {
    const corpoTabela = document.getElementById(tabelaId);
    if (!corpoTabela) return;

    try {
        const url = pacienteId ? `/prescricoes?paciente_id=${pacienteId}` : '/prescricoes';
        const prescricoes = await makeAuthenticatedRequest(url);
        if (!prescricoes || prescricoes.length === 0) {
            corpoTabela.innerHTML = `<tr><td colspan="${tabelaId === 'corpoTabelaHistoricoPrescricoes' ? 7 : 6}">Nenhuma prescrição ${pacienteId ? 'encontrada' : 'cadastrada'}.</td></tr>`;
            return;
        }

        corpoTabela.innerHTML = '';
        prescricoes.forEach(prescricao => {
            const tr = document.createElement('tr');
            if (tabelaId === 'corpoTabelaHistoricoPrescricoes') {
                tr.innerHTML = `
                    <td>${prescricao.data ? formatarDataISO(prescricao.data) : 'Não informado'}</td>
                    <td>${prescricao.profissional || 'Não informado'}</td>
                    <td>${prescricao.medicamento || 'Não informado'}</td>
                    <td>${prescricao.dosagem || 'Não informado'}</td>
                    <td>${prescricao.instrucoes || 'Não informado'}</td>
                    <td>Prescrição</td>
                    <td><button onclick="exibirModalConfirmacao(() => excluirPrescricao(${prescricao.id}))">Excluir</button></td>
                `;
            } else {
                tr.innerHTML = `
                    <td>${prescricao.paciente || 'Não informado'}</td>
                    <td>${prescricao.profissional || 'Não informado'}</td>
                    <td>${prescricao.medicamento || 'Não informado'}</td>
                    <td>${prescricao.dosagem || 'Não informado'}</td>
                    <td>${prescricao.instrucoes || 'Não informado'}</td>
                    <td><button onclick="exibirModalConfirmacao(() => excluirPrescricao(${prescricao.id}))">Excluir</button></td>
                `;
            }
            corpoTabela.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar prescrições:', error);
        corpoTabela.innerHTML = `<tr><td colspan="${tabelaId === 'corpoTabelaHistoricoPrescricoes' ? 7 : 6}">Erro ao carregar prescrições: ${error.message}</td></tr>`;
    }
}

// Substituir chamadas:
async function carregarPrescricoes() {
    await carregarPrescricoesGenerico('corpoTabelaPrescricoes');
}

async function atualizarTabelaPrescricoes() {
    const pacienteSelect = document.getElementById('selecionarPacienteHistorico');
    const pacienteId = pacienteSelect?.value;
    const corpoTabelaHistoricoPrescricoes = document.getElementById('corpoTabelaHistoricoPrescricoes');
    if (!pacienteId || !corpoTabelaHistoricoPrescricoes) {
        if (corpoTabelaHistoricoPrescricoes) corpoTabelaHistoricoPrescricoes.innerHTML = '<tr><td colspan="7">Selecione um paciente.</td></tr>';
        return;
    }

    try {
        console.log('Atualizando tabela para paciente ID:', pacienteId);
        const prescricoes = await makeAuthenticatedRequest(`/prescricoes?paciente_id=${pacienteId}`);
        console.log('Prescrições retornadas:', prescricoes);
        const exames = await makeAuthenticatedRequest(`/exames?paciente_id=${pacienteId}`);
        console.log('Exames retornados:', exames);

        const historico = [
            ...(prescricoes || []).map(p => ({ ...p, tipo: p.tipo_consulta || 'Presencial' })),
            ...(exames || []).map(e => ({ ...e, tipo: 'Exame', medicamento: e.tipo, dosagem: '-', instrucoes: e.resultado || 'Pendente' }))
        ];
        console.log('Histórico combinado:', historico);

        if (historico.length === 0) {
            corpoTabelaHistoricoPrescricoes.innerHTML = '<tr><td colspan="7">Nenhum histórico encontrado.</td></tr>';
            return;
        }

        corpoTabelaHistoricoPrescricoes.innerHTML = '';
        historico.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.data ? formatarDataISO(item.data) : 'Não informado'}</td>
                <td>${item.profissional || 'Não informado'}</td>
                <td>${item.medicamento || 'Não informado'}</td>
                <td>${item.dosagem || 'Não informado'}</td>
                <td>${item.instrucoes || 'Não informado'}</td>
                <td>${item.tipo}</td>
                <td><button onclick="exibirModalConfirmacao(() => excluirItemHistorico(${item.id}, '${item.tipo}'))">Excluir</button></td>
            `;
            corpoTabelaHistoricoPrescricoes.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        corpoTabelaHistoricoPrescricoes.innerHTML = '<tr><td colspan="7">Erro ao carregar histórico.</td></tr>';
    }
}

// Função auxiliar para excluir item do histórico
async function excluirItemHistorico(id, tipo) {
    const endpoint = tipo === 'Prescrição' ? '/prescricoes' : '/exames';
    try {
        await makeAuthenticatedRequest(`${endpoint}/${id}`, 'DELETE');
        await registrarAuditoria(`${tipo} ID ${id} excluída do histórico`);
        await atualizarTabelaPrescricoes();
    } catch (error) {
        console.error(`Erro ao excluir ${tipo.toLowerCase()}:`, error);
        alert(`Erro ao excluir ${tipo.toLowerCase()}: ` + error.message);
    }
}

// Função para carregar auditoria
async function carregarAuditoria() {
    const logAuditoria = document.getElementById('logAuditoria');
    if (!logAuditoria) return;

    try {
        const auditorias = await makeAuthenticatedRequest('/auditoria');
        if (!auditorias || auditorias.length === 0) {
            logAuditoria.innerHTML = 'Nenhum registro de auditoria encontrado.';
            return;
        }
        logAuditoria.innerHTML = '';
        auditorias.forEach(auditoria => {
            const p = document.createElement('p');
            const dataFormatada = formatarDataHoraCompleta(auditoria.data);
p.textContent = `${dataFormatada} - ${auditoria.usuario}: ${auditoria.acao}`;
            logAuditoria.appendChild(p);
        });
    } catch (error) {
        console.error('Erro ao carregar auditoria:', error);
        logAuditoria.innerHTML = 'Erro ao carregar auditoria.';
    }
}

// Função para configurar filtro de auditoria com debounce
function configurarFiltroAuditoria() {
    const filtroAuditoria = document.getElementById('filtroAuditoria');
    if (filtroAuditoria) {
        let timeout;
        filtroAuditoria.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(carregarAuditoria, 500);
        });
    }
}

// Função para exibir modal de confirmação
function exibirModalConfirmacao(callback) {
    const modal = new bootstrap.Modal(document.getElementById('confirmacaoModal'));
    const confirmarExclusao = document.getElementById('confirmarExclusao');

    confirmarExclusao.onclick = async () => {
        await callback();
        modal.hide();
    };

    modal.show();
}

// Função para iniciar videochamada
let localStream;

async function iniciarVideoChamada() {
    const selecionarConsultaTele = document.getElementById('selecionarConsultaTele');
    if (!selecionarConsultaTele.value) {
        alert('Selecione uma consulta para iniciar a videochamada.');
        return;
    }

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const remoteVideoPlaceholder = document.getElementById('remoteVideoPlaceholder');

        localVideo.srcObject = localStream;
        document.getElementById('videoArea').style.display = 'flex';
        document.getElementById('startVideoCall').style.display = 'none';
        document.getElementById('stopVideoCall').style.display = 'inline-block';

        // Simulação de vídeo remoto (para teste)
        setTimeout(() => {
            remoteVideoPlaceholder.style.display = 'none';
            remoteVideo.style.display = 'block';
            remoteVideo.srcObject = localStream; // Simula o remoto com o mesmo stream para teste
        }, 2000); // Simula atraso de conexão
    } catch (error) {
        console.error('Erro ao iniciar videochamada:', error);
        alert('Não foi possível iniciar a videochamada. Verifique as permissões de câmera e microfone.');
    }
}

function encerrarVideoChamada() {
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const remoteVideoPlaceholder = document.getElementById('remoteVideoPlaceholder');

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    remoteVideo.style.display = 'none';
    remoteVideoPlaceholder.style.display = 'block';
    document.getElementById('videoArea').style.display = 'none';
    document.getElementById('startVideoCall').style.display = 'inline-block';
    document.getElementById('stopVideoCall').style.display = 'none';
}

// Função para atualizar tabela de agenda
async function atualizarTabelaAgenda() {
    const selecionarProfissional = document.getElementById('selecionarProfissional');
    const corpoTabelaAgenda = document.getElementById('corpoTabelaAgenda');
    if (!selecionarProfissional || !corpoTabelaAgenda) return;

    const profissionalId = selecionarProfissional.value;
    if (!profissionalId) {
        corpoTabelaAgenda.innerHTML = '<tr><td colspan="5">Selecione um profissional.</td></tr>';
        return;
    }

    try {
        // Buscar consultas presenciais
        const consultas = await makeAuthenticatedRequest('/consultas');
        // Buscar teleconsultas
        const teleconsultas = await makeAuthenticatedRequest(`/telemedicina?profissional_id=${profissionalId}`);
        // Filtrar consultas pelo profissional selecionado
        const agendaConsultas = consultas.filter(item => item.profissional_id == profissionalId);
        const agendaTele = teleconsultas; // Já filtrado pelo backend

        const agenda = [...agendaConsultas, ...agendaTele];

        if (agenda.length === 0) {
            corpoTabelaAgenda.innerHTML = '<tr><td colspan="5">Nenhuma consulta agendada.</td></tr>';
            return;
        }

        corpoTabelaAgenda.innerHTML = '';
        agenda.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.paciente || 'Não informado'}</td>
                <td>${item.data ? formatarDataISO(item.data) : 'Não informado'}</td>
                <td>${item.hora || 'Não informado'}</td>
                <td>${item.especialidade || 'Não informado'}</td>
                <td>${item.tipo_consulta || 'Presencial'}</td>
            `;
            corpoTabelaAgenda.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar agenda:', error);
        corpoTabelaAgenda.innerHTML = '<tr><td colspan="5">Erro ao carregar agenda: ' + error.message + '</td></tr>';
    }
}

// Função para preencher especialidade dinamicamente
async function preencherEspecialidade() {
    const profissionalTele = document.getElementById('profissionalTele');
    const especialidadeTele = document.getElementById('especialidadeTele');
    if (!profissionalTele || !especialidadeTele) return;

    especialidadeTele.innerHTML = '<option value="">Selecione uma especialidade</option>';
    if (profissionalTele.value) {
        try {
            const profissional = await makeAuthenticatedRequest(`/profissionais/${profissionalTele.value}`);
            if (profissional.especialidade) {
                const option = document.createElement('option');
                option.value = profissional.especialidade;
                option.textContent = profissional.especialidade;
                especialidadeTele.appendChild(option);
                especialidadeTele.value = profissional.especialidade;
            }
        } catch (error) {
            console.error('Erro ao buscar especialidade do profissional:', error);
            alert('Erro ao carregar especialidade do profissional.');
        }
    }
}

// Função para preencher profissional
async function preencherProfissional() {
    const especialidadeConsulta = document.getElementById('especialidadeConsulta');
    const profissionalConsulta = document.getElementById('profissionalConsulta');
    if (!especialidadeConsulta || !profissionalConsulta) return;

    try {
        const profissionais = await makeAuthenticatedRequest('/profissionais');
        profissionalConsulta.innerHTML = '<option value="">Selecione um profissional</option>';
        const especialidadeSelecionada = especialidadeConsulta.value;

        if (especialidadeSelecionada) {
            const profissionaisFiltrados = profissionais.filter(prof => prof.especialidade === especialidadeSelecionada);
            profissionaisFiltrados.forEach(prof => {
                const option = document.createElement('option');
                option.value = prof.id;
                option.textContent = prof.nome;
                profissionalConsulta.appendChild(option);
            });
        } else {
            profissionais.forEach(prof => {
                const option = document.createElement('option');
                option.value = prof.id;
                option.textContent = prof.nome;
                profissionalConsulta.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao preencher profissionais:', error);
        profissionalConsulta.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

// Função para mostrar histórico clínico
async function mostrarHistorico() {
    const selecionarPaciente = document.getElementById('selecionarPaciente');
    const historicoPaciente = document.getElementById('historicoPaciente');
    if (!selecionarPaciente || !historicoPaciente) return;

    const pacienteId = selecionarPaciente.value;
    if (!pacienteId) {
        historicoPaciente.innerHTML = 'Selecione um paciente para ver o histórico.';
        return;
    }

    try {
        const prescricoes = await makeAuthenticatedRequest(`/prescricoes?paciente_id=${pacienteId}`);
        const exames = await makeAuthenticatedRequest(`/exames?paciente_id=${pacienteId}`);

        if ((!prescricoes || prescricoes.length === 0) && (!exames || exames.length === 0)) {
            historicoPaciente.innerHTML = 'Nenhum histórico encontrado.';
            return;
        }

        let historicoHTML = '<ul>';
        if (prescricoes) {
            prescricoes.forEach(p => {
                historicoHTML += `<li>${p.data ? formatarDataISO(p.data) : 'Data não informada'}: Prescrição - ${p.medicamento || 'Não informado'} (${p.dosagem || 'Não informado'}) - ${p.instrucoes || 'Não informado'}</li>`;
            });
        }
        if (exames) {
            exames.forEach(e => {
                historicoHTML += `<li>${e.data ? formatarDataISO(e.data) : 'Data não informada'}: Exame - ${e.tipo || 'Não informado'} - ${e.resultado || 'Pendente'}</li>`;
            });
        }
        historicoHTML += '</ul>';
        historicoPaciente.innerHTML = historicoHTML;
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        historicoPaciente.innerHTML = 'Erro ao carregar histórico.';
    }
}

// Função para carregar controle financeiro
async function carregarControleFinanceiro() {
    const corpoTabelaFinanceiro = document.getElementById('corpoTabelaFinanceiro');
    if (!corpoTabelaFinanceiro) return;

    try {
        const financeiro = await makeAuthenticatedRequest('/historico_financeiro');
        if (!financeiro || financeiro.length === 0) {
            corpoTabelaFinanceiro.innerHTML = '<tr><td colspan="4">Nenhum registro financeiro encontrado.</td></tr>';
            return;
        }
        corpoTabelaFinanceiro.innerHTML = '';
        financeiro.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.data ? formatarDataISO(item.data) : 'Não informado'}</td>
                <td>R$ ${parseFloat(item.receita || 0).toFixed(2)}</td>
                <td>R$ ${parseFloat(item.despesa || 0).toFixed(2)}</td>
                <td><button onclick="exibirModalConfirmacao(() => excluirRegistroFinanceiro(${item.id}))">Excluir</button></td>
            `;
            corpoTabelaFinanceiro.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar histórico financeiro:', error);
        corpoTabelaFinanceiro.innerHTML = '<tr><td colspan="4">Erro ao carregar: ' + error.message + '</td></tr>';
    }
}

// Função para excluir registro financeiro
async function excluirRegistroFinanceiro(id) {
    try {
        await makeAuthenticatedRequest(`/historico_financeiro/${id}`, 'DELETE');
        await registrarAuditoria(`Registro financeiro ID ${id} excluído`);
        await atualizarControleFinanceiro();
        await carregarControleFinanceiro();
    } catch (error) {
        console.error('Erro ao excluir registro financeiro:', error);
        alert('Erro ao excluir registro financeiro: ' + error.message);
    }
}

// Função para atualizar controle financeiro
async function atualizarControleFinanceiro() {
    const receitaSpan = document.getElementById('receita');
    const despesasSpan = document.getElementById('despesas');
    const saldoSpan = document.getElementById('saldo');
    if (!receitaSpan || !despesasSpan || !saldoSpan) return;

    try {
        const financeiro = await makeAuthenticatedRequest('/historico_financeiro');
        const receitaTotal = financeiro.reduce((sum, item) => sum + (parseFloat(item.receita) || 0), 0);
        const despesaTotal = financeiro.reduce((sum, item) => sum + (parseFloat(item.despesa) || 0), 0);
        const saldo = receitaTotal - despesaTotal;

        receitaSpan.textContent = receitaTotal.toFixed(2);
        despesasSpan.textContent = despesaTotal.toFixed(2);
        saldoSpan.textContent = saldo.toFixed(2);
    } catch (error) {
        console.error('Erro ao atualizar controle financeiro:', error);
        receitaSpan.textContent = 'Erro';
        despesasSpan.textContent = 'Erro';
        saldoSpan.textContent = 'Erro';
    }
}

// Função para carregar suprimentos
async function carregarSuprimentos() {
    const corpoTabelaSuprimentos = document.getElementById('corpoTabelaSuprimentos');
    if (!corpoTabelaSuprimentos) return;

    try {
        const suprimentos = await makeAuthenticatedRequest('/suprimentos');
        if (!suprimentos || suprimentos.length === 0) {
            corpoTabelaSuprimentos.innerHTML = '<tr><td colspan="4">Nenhum suprimento cadastrado.</td></tr>';
            return;
        }
        corpoTabelaSuprimentos.innerHTML = '';
        suprimentos.forEach(sup => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${sup.nome || 'Não informado'}</td>
                <td>${sup.quantidade || 0}</td>
                <td>R$ ${parseFloat(sup.preco_unitario || 0).toFixed(2)}</td>
                <td><button onclick="exibirModalConfirmacao(() => excluirSuprimento(${sup.id}))">Excluir</button></td>
            `;
            corpoTabelaSuprimentos.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar suprimentos:', error);
        corpoTabelaSuprimentos.innerHTML = '<tr><td colspan="4">Erro ao carregar: ' + error.message + '</td></tr>';
    }
}

// Função para excluir suprimento
async function excluirSuprimento(id) {
    try {
        await makeAuthenticatedRequest(`/suprimentos/${id}`, 'DELETE');
        await registrarAuditoria(`Suprimento ID ${id} excluído`);
        await carregarSuprimentos();
    } catch (error) {
        console.error('Erro ao excluir suprimento:', error);
        alert('Erro ao excluir suprimento: ' + error.message);
    }
}
async function preencherProfissionaisPrescricao() {
    const profissionalPrescricaoSelect = document.getElementById('profissionalPrescricao');
    if (!profissionalPrescricaoSelect) return;

    try {
        const profissionais = await makeAuthenticatedRequest('/profissionais');
        profissionalPrescricaoSelect.innerHTML = '<option value="">Selecione um profissional</option>';
        profissionais.forEach(prof => {
            const option = document.createElement('option');
            option.value = prof.id;
            option.textContent = prof.nome;
            profissionalPrescricaoSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar profissionais:', error);
        profissionalPrescricaoSelect.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}


// Função para inicializar eventos
// Função para inicializar eventos
function inicializarEventos() {
    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const usuario = document.getElementById('loginUsuario')?.value.trim();
            const senha = document.getElementById('loginSenha')?.value.trim();

            if (!usuario || !senha) {
                alert('Por favor, preencha todos os campos.');
                return;
            }

            if (!/^[a-zA-Z0-9_]+$/.test(usuario)) {
                alert('O nome de usuário deve conter apenas letras, números e underscores.');
                return;
            }

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario, senha }),
                });

                const data = await response.json();
                console.log('Resposta da API de login:', data);

                if (!response.ok) throw new Error(data.error || 'Erro ao realizar login');

                const decodedToken = decodeJWT(data.token); // Usando a função manual
                localStorage.setItem('token', data.token);
                localStorage.setItem('usuarioLogado', JSON.stringify({
                    id: decodedToken.id,
                    usuario: data.usuario,
                    permissao: data.permissao
                }));
                verificarEstadoLogin();
                await registrarAuditoria(`Login realizado por ${data.usuario}`);
                alert('Login realizado com sucesso!');
                window.location.href = 'pacientes.html';
            } catch (error) {
                console.error('Erro ao realizar login:', error);
                alert(error.message);
            }
        });   // ... (restante da função inicializarEventos, se houver)
}

    // Evento para o formulário de leitos
    const formLeito = document.getElementById('formLeito');
    if (formLeito) {
        formLeito.addEventListener('submit', async (e) => {
            e.preventDefault();
            const acao = document.getElementById('acaoLeito')?.value;
            const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
            if (usuarioLogado?.permissao !== 'admin' && usuarioLogado?.permissao !== 'atendente') {
                alert('Apenas administradores e atendentes podem gerenciar leitos.');
                return;
            }

            try {
                const leitos = await makeAuthenticatedRequest('/leitos');
                if (acao === 'adicionar') {
                    const leitoDisponivel = leitos.find(l => l.status === 'Disponível');
                    if (!leitoDisponivel) {
                        alert('Nenhum leito disponível para ocupar.');
                        return;
                    }
                    await makeAuthenticatedRequest(`/leitos/${leitoDisponivel.id}`, 'PUT', {
                        status: 'Ocupado',
                        data_ocupacao: new Date().toISOString().split('T')[0],
                        data_liberacao: null
                    });
                    await registrarAuditoria(`Leito ID ${leitoDisponivel.id} ocupado`);
                } else if (acao === 'liberar') {
                    const leitoOcupado = leitos.find(l => l.status === 'Ocupado');
                    if (!leitoOcupado) {
                        alert('Nenhum leito ocupado para liberar.');
                        return;
                    }
                    await makeAuthenticatedRequest(`/leitos/${leitoOcupado.id}`, 'PUT', {
                        status: 'Disponível',
                        data_ocupacao: null,
                        data_liberacao: new Date().toISOString().split('T')[0]
                    });
                    await registrarAuditoria(`Leito ID ${leitoOcupado.id} liberado`);
                }
                await carregarLeitos();
                alert(`Leito ${acao === 'adicionar' ? 'ocupado' : 'liberado'} com sucesso!`);
            } catch (error) {
                console.error('Erro ao gerenciar leito:', error);
                alert('Erro ao gerenciar leito: ' + error.message);
            }
        });
    }
    // Função de logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
            if (usuarioLogado) {
                try {
                    await registrarAuditoria(`Logout realizado por ${usuarioLogado.usuario}`);
                } catch (auditError) {
                    console.error('Falha na auditoria, mas logout foi bem-sucedido:', auditError);
                }
            }
            localStorage.removeItem('token');
            localStorage.removeItem('usuarioLogado');
            verificarEstadoLogin();
            alert('Logout realizado com sucesso!');
            window.location.href = 'index.html';
        });
    }

    const formPaciente = document.getElementById('formPaciente');
    if (formPaciente) {
        formPaciente.addEventListener('submit', async (e) => {
            e.preventDefault();
    
            const nome = document.getElementById('nome')?.value.trim();
            const cpf = formatarCPF(document.getElementById('cpf')?.value.trim());
            const dataNascimento = document.getElementById('dataNascimento')?.value;
            let telefone = document.getElementById('telefone')?.value.trim();
            const endereco = document.getElementById('endereco')?.value.trim();
    
            if (!nome || !cpf || !dataNascimento || !telefone || !endereco) {
                alert('Por favor, preencha todos os campos.');
                return;
            }
    
            const padraoSQL = /('|--|;|DROP\s+TABLE|SELECT\s+\*|INSERT\s+INTO|DELETE\s+FROM|UPDATE\s+\w+)/i;
            if (padraoSQL.test(nome)) {
                alert('Nome inválido: contém comandos não permitidos.');
                return;
            }
    
            try {
                telefone = formatarTelefone(telefone);
    
                const response = await makeAuthenticatedRequest('/pacientes', 'POST', {
                    nome,
                    cpf,
                    data_nascimento: dataNascimento,
                    telefone,
                    endereco
                });
    
                if (!response.ok) {
                    const erro = await response.json();
                    alert(erro.error || 'Erro desconhecido ao cadastrar paciente.');
                    return;
                }
    
                await registrarAuditoria(`Paciente ${nome} adicionado`);
                await carregarPacientes();
                formPaciente.reset();
                alert('Paciente cadastrado com sucesso!');
            } catch (error) {
                console.error('Erro ao cadastrar paciente:', error);
                alert('Erro ao cadastrar paciente: ' + error.message);
            }
        });
    }
    
    // Cadastro de profissional
    const formProfissional = document.getElementById('formProfissional');
    if (formProfissional) {
        formProfissional.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('nomeProfissional')?.value.trim();
            const categoria = document.getElementById('categoriaProfissional')?.value;
            const especialidade = document.getElementById('especialidadeProfissional')?.value.trim();
            const crm = document.getElementById('crm')?.value.trim();
            let telefone = document.getElementById('telefoneProfissional')?.value.trim();
            const email = document.getElementById('emailProfissional')?.value.trim();

            if (!nome || !categoria || !telefone || !email) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }

            try {
                telefone = formatarTelefone(telefone);
                await makeAuthenticatedRequest('/profissionais', 'POST', {
                    nome,
                    categoria,
                    especialidade,
                    crm,
                    telefone,
                    email
                });
                await registrarAuditoria(`Profissional ${nome} adicionado`);
                await carregarProfissionais();
                formProfissional.reset();
                alert('Profissional cadastrado com sucesso!');
            } catch (error) {
                console.error('Erro ao cadastrar profissional:', error);
                alert('Erro ao cadastrar profissional: ' + error.message);
            }
        });
    }

    // Cadastro de consulta
    const formConsulta = document.getElementById('formConsulta');
    if (formConsulta) {
        formConsulta.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pacienteId = document.getElementById('pacienteConsulta')?.value;
            const profissionalId = document.getElementById('profissionalConsulta')?.value;
            const especialidade = document.getElementById('especialidadeConsulta')?.value.trim();
            const data = document.getElementById('dataConsulta')?.value;
            const hora = document.getElementById('horaConsulta')?.value;

            if (!pacienteId || !profissionalId || !especialidade || !data || !hora) {
                alert('Por favor, preencha todos os campos.');
                return;
            }

            try {
                await makeAuthenticatedRequest('/consultas', 'POST', {
                    paciente_id: pacienteId,
                    profissional_id: profissionalId,
                    especialidade,
                    data,
                    hora
                });
                await registrarAuditoria(`Consulta agendada para ${data} às ${hora}`);
                await carregarConsultas();
                formConsulta.reset();
                alert('Consulta agendada com sucesso!');
            } catch (error) {
                console.error('Erro ao agendar consulta:', error);
                alert('Erro ao agendar consulta: ' + error.message);
            }
        });
    }

    // Cadastro de exame
    const formExame = document.getElementById('formExame');
    if (formExame) {
        formExame.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pacienteId = document.getElementById('pacienteExame')?.value;
            const tipo = document.getElementById('tipoExame')?.value.trim();
            const data = document.getElementById('dataExame')?.value;
            const resultado = document.getElementById('resultadoExame')?.value.trim();

            if (!pacienteId || !tipo || !data) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return;
            }

            try {
                await makeAuthenticatedRequest('/exames', 'POST', {
                    paciente_id: pacienteId,
                    tipo,
                    data,
                    resultado
                });
                await registrarAuditoria(`Exame ${tipo} agendado para ${data}`);
                await carregarExames();
                formExame.reset();
                alert('Exame agendado com sucesso!');
            } catch (error) {
                console.error('Erro ao agendar exame:', error);
                alert('Erro ao agendar exame: ' + error.message);
            }
        });
    }

    // Cadastro de teleconsulta
    const formTelemedicina = document.getElementById('formtelemedicina');
    if (formTelemedicina) {
        formTelemedicina.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pacienteId = document.getElementById('pacienteConsulta')?.value;
            const profissionalId = document.getElementById('profissionalConsulta')?.value;
            const especialidade = document.getElementById('especialidadeConsulta')?.value;
            const data = document.getElementById('dataConsulta')?.value;
            const hora = document.getElementById('horaConsulta')?.value;

            if (!pacienteId || !profissionalId || !especialidade || !data || !hora) {
                alert('Por favor, preencha todos os campos.');
                return;
            }

            try {
                await makeAuthenticatedRequest('/telemedicina', 'POST', {
                    paciente_id: pacienteId,
                    profissional_id: profissionalId,
                    especialidade,
                    data,
                    hora,
                    tipo_consulta: 'Online' // Definindo como Online por padrão para telemedicina
                });
                await registrarAuditoria(`Teleconsulta agendada para ${data} às ${hora}`);
                await carregarTelemedicina();
                formTelemedicina.reset();
                alert('Teleconsulta agendada com sucesso!');
            } catch (error) {
                console.error('Erro ao agendar teleconsulta:', error);
                alert('Erro ao agendar teleconsulta: ' + error.message);
            }
        });
    }
    const formPrescricao = document.getElementById('formPrescricao');
    if (formPrescricao) {
        formPrescricao.addEventListener('submit', async (e) => {
            e.preventDefault();
    
            const consultaId = document.getElementById('consultaTelePrescricao')?.value?.trim();
            let medicamento = document.getElementById('medicamento')?.value.trim();
            let dosagem = document.getElementById('dosagem')?.value.trim();
            let instrucoes = document.getElementById('instrucoes')?.value.trim();
    
            if (!consultaId || !medicamento || !dosagem || !instrucoes) {
                alert('Por favor, preencha todos os campos.');
                return;
            }
    
            if (isNaN(consultaId) || Number(consultaId) <= 0) {
                alert('Selecione uma consulta válida.');
                return;
            }
    
            const textoRegex = /^[a-zA-Z0-9À-ÖØ-öø-ÿ\s.,-]+$/;
            if (medicamento.length > 100 || !textoRegex.test(medicamento)) {
                alert('O medicamento deve ter até 100 caracteres (permitidos: letras, números, espaços, vírgulas e pontos).');
                return;
            }
    
            if (dosagem.length > 50 || !textoRegex.test(dosagem)) {
                alert('A dosagem deve ter até 50 caracteres.');
                return;
            }
    
            if (instrucoes.length > 200 || !textoRegex.test(instrucoes)) {
                alert('As instruções devem ter até 200 caracteres.');
                return;
            }
    
            try {
                console.log('Buscando teleconsulta com ID:', consultaId);
                const teleconsulta = await makeAuthenticatedRequest(`/telemedicina/${consultaId}`);
                console.log('Teleconsulta retornada:', teleconsulta);
    
                if (!teleconsulta || !teleconsulta.paciente_id || !teleconsulta.profissional_id) {
                    throw new Error('Consulta inválida ou dados incompletos.');
                }
    
                const pacienteId = Number(teleconsulta.paciente_id);
                const profissionalId = Number(teleconsulta.profissional_id);
    
                console.log('Paciente ID:', pacienteId, 'Profissional ID:', profissionalId);
    
                if (isNaN(pacienteId) || isNaN(profissionalId) || pacienteId <= 0 || profissionalId <= 0) {
                    throw new Error('IDs de paciente ou profissional inválidos.');
                }
    
                const dataAtual = new Date().toISOString().split('T')[0];
                const payload = {
                    paciente_id: pacienteId,
                    profissional_id: profissionalId,
                    medicamento,
                    dosagem,
                    instrucoes,
                    data: dataAtual,
                    tipo_consulta: 'Online' // Já estava correto
                };
                console.log('Payload enviado:', JSON.stringify(payload, null, 2));
    
                const response = await makeAuthenticatedRequest('/prescricoes', 'POST', payload);
                console.log('Resposta do backend:', response);
    
                await registrarAuditoria(`Prescrição de ${medicamento} adicionada para consulta ID ${consultaId}`);
                formPrescricao.reset();
                alert('Prescrição adicionada com sucesso!');
                await atualizarTabelaPrescricoes();
            } catch (error) {
                console.error('Erro ao adicionar prescrição:', error);
                alert(`Erro ao adicionar prescrição: ${error.message}`);
            }
        });
    }

    // Cadastro de prescrição Presencial profissional da saude
    const formPrescricaoProf = document.getElementById('formPrescricaoProf');
    if (formPrescricaoProf) {
        formPrescricaoProf.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pacienteId = document.getElementById('pacientePrescricao')?.value;
            const profissionalId = document.getElementById('profissionalPrescricao')?.value;
            const medicamento = document.getElementById('medicamentoProf')?.value.trim();
            const dosagem = document.getElementById('dosagemProf')?.value.trim();
            const instrucoes = document.getElementById('instrucoesProf')?.value.trim();
    
            if (!pacienteId || !profissionalId || !medicamento || !dosagem || !instrucoes) {
                alert('Por favor, preencha todos os campos.');
                return;
            }
    
            try {
                const dataAtual = new Date().toISOString().split('T')[0];
                await makeAuthenticatedRequest('/prescricoes', 'POST', {
                    paciente_id: pacienteId,
                    profissional_id: profissionalId,
                    medicamento,
                    dosagem,
                    instrucoes,
                    data: dataAtual,
                    tipo_consulta: 'Presencial' // Já estava correto
                });
                await registrarAuditoria(`Prescrição de ${medicamento} adicionada para paciente ID ${pacienteId}`);
                formPrescricaoProf.reset();
                alert('Prescrição adicionada com sucesso!');
                await atualizarTabelaPrescricoes();
            } catch (error) {
                console.error('Erro ao adicionar prescrição:', error);
                alert('Erro ao adicionar prescrição: ' + error.message);
            }
        });
    }

    // Cadastro de usuário com controle de acesso
    const formAcesso = document.getElementById('formAcesso');
    if (formAcesso) {
        const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        if (usuarioLogado?.permissao !== 'admin') {
            formAcesso.innerHTML = '<p>Apenas administradores podem adicionar usuários.</p>';
        } else {
            formAcesso.addEventListener('submit', async (e) => {
                e.preventDefault();
                const usuario = document.getElementById('novoUsuario')?.value.trim();
                const senha = document.getElementById('novaSenha')?.value.trim();
                const permissao = document.getElementById('permissao')?.value;

                if (!usuario || !senha || !permissao) {
                    alert('Por favor, preencha todos os campos.');
                    return;
                }

                if (!/^[a-zA-Z0-9_]+$/.test(usuario)) {
                    alert('O nome de usuário deve conter apenas letras, números e underscores.');
                    return;
                }

                try {
                    await makeAuthenticatedRequest('/usuarios', 'POST', { usuario, senha, permissao });
                    await registrarAuditoria(`Usuário ${usuario} adicionado com permissão ${permissao}`);
                    await carregarUsuarios();
                    formAcesso.reset();
                    alert('Usuário cadastrado com sucesso!');
                } catch (error) {
                    console.error('Erro ao cadastrar usuário:', error);
                    alert('Erro ao cadastrar usuário: ' + error.message);
                }
            });
        }
    }

    // Outros eventos
    const selecionarProfissional = document.getElementById('selecionarProfissional');
    if (selecionarProfissional) {
        selecionarProfissional.addEventListener('change', atualizarTabelaAgenda);
    }

    const selecionarPaciente = document.getElementById('selecionarPaciente');
    if (selecionarPaciente) {
        selecionarPaciente.addEventListener('change', mostrarHistorico);
    }

    const selecionarConsultaTele = document.getElementById('selecionarConsultaTele');
    if (selecionarConsultaTele) {
        selecionarConsultaTele.addEventListener('change', carregarConsultaSelecionada);
    }

    const startVideoCall = document.getElementById('startVideoCall');
    if (startVideoCall) {
        startVideoCall.addEventListener('click', iniciarVideoChamada);
    }

    const stopVideoCall = document.getElementById('stopVideoCall');
    if (stopVideoCall) {
        stopVideoCall.addEventListener('click', encerrarVideoChamada);
    }

    const profissionalTele = document.getElementById('profissionalTele');
    if (profissionalTele) {
        profissionalTele.addEventListener('change', preencherEspecialidade);
    }

    const especialidadeConsulta = document.getElementById('especialidadeConsulta');
    if (especialidadeConsulta) {
        especialidadeConsulta.addEventListener('change', preencherProfissional);
    }

    // Evento para adicionar suprimento
    const formSuprimento = document.getElementById('formSuprimento');
    if (formSuprimento) {
        formSuprimento.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('nomeSuprimento')?.value.trim();
            const quantidade = parseInt(document.getElementById('quantidadeSuprimento')?.value);
            const precoUnitario = parseFloat(document.getElementById('precoUnitario')?.value);

            if (!nome || isNaN(quantidade) || isNaN(precoUnitario) || quantidade <= 0 || precoUnitario <= 0) {
                alert('Por favor, preencha todos os campos com valores válidos.');
                return;
            }

            const despesaTotal = quantidade * precoUnitario;

            try {
                // Adicionar suprimento
                await makeAuthenticatedRequest('/suprimentos', 'POST', {
                    nome,
                    quantidade,
                    preco_unitario: precoUnitario
                });

                // Registrar despesa no histórico financeiro
                // Esse registro já é feito pelo back-end
                // await makeAuthenticatedRequest('/historico_financeiro', 'POST', {
                //     data: new Date().toISOString().split('T')[0],
                //     receita: 0,
                //     despesa: despesaTotal,
                //     categoria: `Compra de Suprimento: ${nome}`
                // });


                await registrarAuditoria(`Suprimento ${nome} adicionado (${quantidade} unid., R$ ${despesaTotal.toFixed(2)})`);
                await carregarSuprimentos();
                await atualizarControleFinanceiro();
                await carregarControleFinanceiro();
                formSuprimento.reset();
                alert('Suprimento adicionado com sucesso!');
            } catch (error) {
                console.error('Erro ao adicionar suprimento:', error);
                alert('Erro ao adicionar suprimento: ' + error.message);
            }
        });
    }

    // Evento para adicionar receita
    const formReceita = document.getElementById('formReceita');
    if (formReceita) {
        formReceita.addEventListener('submit', async (e) => {
            e.preventDefault();
            const valor = parseFloat(document.getElementById('valorReceita')?.value);
            if (isNaN(valor) || valor <= 0) {
                alert('Por favor, insira um valor válido para a receita.');
                return;
            }

            try {
                await makeAuthenticatedRequest('/historico_financeiro', 'POST', {
                    data: new Date().toISOString().split('T')[0],
                    receita: valor,
                    despesa: 0,
                    categoria: 'Receita Manual'
                });
                await registrarAuditoria(`Receita de R$ ${valor.toFixed(2)} adicionada`);
                await atualizarControleFinanceiro();
                await carregarControleFinanceiro();
                formReceita.reset();
                alert('Receita adicionada com sucesso!');
            } catch (error) {
                console.error('Erro ao adicionar receita:', error);
                alert('Erro ao adicionar receita: ' + error.message);
            }
        });
    }

    // Evento para adicionar despesa
    const formDespesa = document.getElementById('formDespesa');
    if (formDespesa) {
        formDespesa.addEventListener('submit', async (e) => {
            e.preventDefault();
            const valor = parseFloat(document.getElementById('valorDespesa')?.value);
            if (isNaN(valor) || valor <= 0) {
                alert('Por favor, insira um valor válido para a despesa.');
                return;
            }

            try {
                await makeAuthenticatedRequest('/historico_financeiro', 'POST', {
                    data: new Date().toISOString().split('T')[0],
                    receita: 0,
                    despesa: valor,
                    categoria: 'Despesa Manual'
                });
                await registrarAuditoria(`Despesa de R$ ${valor.toFixed(2)} adicionada`);
                await atualizarControleFinanceiro();
                await carregarControleFinanceiro();
                formDespesa.reset();
                alert('Despesa adicionada com sucesso!');
            } catch (error) {
                console.error('Erro ao adicionar despesa:', error);
                alert('Erro ao adicionar despesa: ' + error.message);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Página carregada:', window.location.pathname);
    verificarEstadoLogin();
    destacarLinkAtivo();
    configurarDatasMinimas();

    const token = localStorage.getItem('token');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (!token && currentPage !== 'index.html') {
        console.log('Usuário não autenticado, redirecionando para login...');
        window.location.href = 'index.html';
        return;
    }

    if (token && currentPage !== 'index.html') {
        console.log('Token encontrado, carregando dados...');
        try {
            if (currentPage === 'pacientes.html') {
                await carregarPacientes();
            }
            if (currentPage === 'profissionais.html') {
                await carregarProfissionais();
                await carregarPacientes();
                await preencherProfissionaisPrescricao();
                await atualizarTabelaAgenda();
                await atualizarTabelaPrescricoes();
            }
            if (currentPage === 'consultas.html') {
                await carregarPacientes();
                await carregarProfissionais();
                await carregarEspecialidades();
                await carregarConsultas();
                await carregarExames(); // ✅ Exames agora carregam ao entrar na página
            }
            if (currentPage === 'telemedicina.html') {
                await carregarPacientes();
                await carregarProfissionais();
                await carregarEspecialidades();
                await carregarTelemedicina();
                await atualizarTabelaPrescricoes();
            }
            if (currentPage === 'seguranca.html') {
                await carregarUsuarios();
                await carregarAuditoria();
            
                // Vincular os botões às funções
                const anonimizarBtn = document.getElementById('anonimizarBtn');
                if (anonimizarBtn) {
                    anonimizarBtn.addEventListener('click', async () => {
                        try {
                            await anonimizarCPFs();
                        } catch (error) {
                            console.error('Erro ao anonimizar CPFs:', error);
                            alert('Erro ao anonimizar CPFs: ' + error.message);
                        }
                    });
                }
            
                const cancelarAnonimizacaoBtn = document.getElementById('cancelarAnonimizacaoBtn');
                if (cancelarAnonimizacaoBtn) {
                    cancelarAnonimizacaoBtn.addEventListener('click', cancelarAnonimizacao);
                }
            
                const excluirDadosBtn = document.getElementById('excluirDadosBtn');
                if (excluirDadosBtn) {
                    excluirDadosBtn.addEventListener('click', excluirDadosPorCPF);
                }
            }
            if (currentPage === 'administracao.html') {
                await carregarLeitos();
                await atualizarControleFinanceiro();
                await carregarControleFinanceiro();
                await carregarSuprimentos();
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados: ' + error.message);
        }
    }

    configurarFiltroAuditoria();
    inicializarEventos();
});
