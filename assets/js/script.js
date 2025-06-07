console.log("JS carregado com sucesso!");

let count = 0;
let horariosLotados = [];

function adicionarDisciplina() {
  count++;
  const container = document.createElement("div");
  container.className = "discipline";
  container.innerHTML = `
    <label>Disciplina ${count}</label>
    <input type="text" class="nome-disciplina" />
    <button class="btn btn-select-time" onclick="toggleGrade(this)">Selecionar Horário</button>
    <div class="schedule-grid">
      ${gerarOpcoesHorarios()}
    </div>
    <button class="btn btn-remove" onclick="this.parentElement.remove()">Remover Disciplina</button>
  `;
  document.getElementById("disciplinas").appendChild(container);
}

function gerarOpcoesHorarios() {
  const horarios = [
    "16/06 Segunda-feira - Tarde", "16/06 Segunda-feira - Noite",
    "17/06 Terça-feira - Manhã", "17/06 Terça-feira - Tarde", "17/06 Terça-feira - Noite",
    "18/06 Quarta-feira - Manhã", "18/06 Quarta-feira - Tarde", "18/06 Quarta-feira - Noite",
    "20/06 Sexta-feira - Manhã", "20/06 Sexta-feira - Tarde", "20/06 Sexta-feira - Noite",
    "21/06 Sábado - Manhã", "21/06 Sábado - Tarde",
    "23/06 Segunda-feira - Manhã", "23/06 Segunda-feira - Tarde", "23/06 Segunda-feira - Noite",
    "24/06 Terça-feira - Manhã", "24/06 Terça-feira - Tarde", "24/06 Terça-feira - Noite"
  ];

  return horarios.map(h => {
    const isLotado = horariosLotados.includes(h);
    return `<div class="schedule-option ${isLotado ? "lotado" : ""}" onclick="selecionarHorario(this)">${h}</div>`;
  }).join("");
}

function toggleGrade(btn) {
  const grid = btn.nextElementSibling;
  grid.classList.toggle("active");
}

function selecionarHorario(el) {
  if (el.classList.contains("lotado")) {
    alert("Este horário está com todas as vagas preenchidas. Por favor, selecione outro horário.");
    return;
  }

  const siblings = el.parentElement.querySelectorAll(".schedule-option");
  siblings.forEach(sib => sib.classList.remove("selected"));
  el.classList.add("selected");

  const btnHorario = el.parentElement.previousElementSibling;
  btnHorario.textContent = "Horário: " + el.textContent;

  toggleGrade(btnHorario);
}

function carregarHorariosLotados() {
  const URL_API = "https://script.google.com/macros/s/AKfycby8ORvubh5DABIV10qNSoNQYhibR9VCZJ6i4RBgXhgowDVISUgQikyn0CpKpJK1K_ywBQ/exec";

  fetch(URL_API)
    .then(res => res.json())
    .then(data => {
      console.log("Dados recebidos da API (horarios):", data.horarios);

      // Verifica se a resposta está no formato esperado
      if (!data || typeof data.horarios !== 'object') {
        console.error("Formato de dados inesperado:", data);
        return;
      }

      // Ajuste para considerar horário lotado o que tiver 1 ou mais agendamentos
      const lotados = [];
      for (const [horario, total] of Object.entries(data.horarios)) {
        if (total >= 1) {  // limite ajustado para 1 (apenas 1 aluno permitido)
          lotados.push(horario);
        }
      }
      horariosLotados = lotados;
      console.log("Horários lotados atualizados:", horariosLotados);

      // Atualiza as opções de horários nas disciplinas já criadas
      document.querySelectorAll(".discipline").forEach(d => {
        const grid = d.querySelector(".schedule-grid");
        if (grid) {
          grid.innerHTML = gerarOpcoesHorarios();
        }
      });
    })
    .catch(err => {
      console.error("Erro ao carregar horários lotados:", err);
    });
}

window.onload = () => {
  carregarHorariosLotados();
};

function enviarFormulario() {
  const nome = document.getElementById("nome").value.trim();
  const ra = document.getElementById("ra").value.trim();
  const curso = document.getElementById("curso").value.trim();
  if (!nome || !ra || !curso) return alert("Preencha todos os campos obrigatórios.");

  const disciplinas = document.querySelectorAll(".discipline");
  if (disciplinas.length === 0) return alert("Adicione pelo menos uma disciplina.");

  const agendamentos = [];
  for (const d of disciplinas) {
    const nomeDisc = d.querySelector(".nome-disciplina").value.trim();
    const horarioSel = d.querySelector(".schedule-option.selected");
    if (!nomeDisc || !horarioSel) return alert("Preencha todas as disciplinas e selecione um horário.");
    agendamentos.push({
      disciplina: nomeDisc,
      horario: horarioSel.textContent
    });
  }

  // Exibe o indicador de carregamento
  document.getElementById("loadingOverlay").style.display = "flex";
  let progress = 0;
  const progressBar = document.getElementById("progress");
  const loadingPercentage = document.getElementById("loadingPercentage");

  // Simula o carregamento
  const interval = setInterval(() => {
    if (progress < 90) {
      progress += 10;
      progressBar.style.width = progress + "%";
      loadingPercentage.textContent = progress + "%";
    }
  }, 100);

  const URL_API = "https://script.google.com/macros/s/AKfycby8ORvubh5DABIV10qNSoNQYhibR9VCZJ6i4RBgXhgowDVISUgQikyn0CpKpJK1K_ywBQ/exec";

  // Primeiro, verifica se o RA já tem agendamento
  fetch(`${URL_API}?ra=${ra}`)
    .then(res => res.json())
    .then(data => {
      if (data && data.nome) {
        clearInterval(interval);
        document.getElementById("loadingOverlay").style.display = "none";

        const msg = `
          <div class="popup-alert">
            <i>⚠️</i>
            <div>
              <p>Este RA <strong>${ra}</strong> já possui um agendamento registrado.</p>
              <p>Por favor, utilize a opção <strong>CONSULTAR AGENDAMENTO</strong>.</p>
            </div>
          </div>
        `;

        document.getElementById("resumoConteudo").innerHTML = msg;
        document.getElementById("overlay").style.display = "block";
        document.getElementById("resumoPopup").style.display = "block";
        return;
      }

      // Se não encontrou, envia o agendamento normalmente
      fetch(URL_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: "UnipAdminBC2025",
          nome,
          ra,
          curso,
          agendamentos
        })
      }).then(() => {
        clearInterval(interval);
        progress = 100;
        progressBar.style.width = progress + "%";
        loadingPercentage.textContent = progress + "%";

        // Exibe o resumo após um pequeno atraso
        setTimeout(() => {
          // Oculta o indicador de carregamento
          document.getElementById("loadingOverlay").style.display = "none";

          // Exibe o resumo
          let resumo = `
            <p><strong>Nome:</strong> ${nome}</p>
            <p><strong>RA:</strong> ${ra}</p>
            <p><strong>Curso:</strong> ${curso}</p>
            <p><strong>Data de envio:</strong> ${new Date().toLocaleString()}</p>
            <ul>
          `;
          agendamentos.forEach(item => {
            resumo += `<li><strong>${item.disciplina}:</strong> ${item.horario}</li>`;
          });
          resumo += `</ul>`;

          document.getElementById("resumoConteudo").innerHTML = resumo;
          document.getElementById("overlay").style.display = "block";
          document.getElementById("resumoPopup").style.display = "block";
        }, 500); // Atraso de 500ms para simular o tempo de processamento
      });
    })
    .catch(error => {
      clearInterval(interval); // Para a simulação de carregamento
      document.getElementById("loadingOverlay").style.display = "none";
      alert("Erro ao verificar RA: " + error.message);
    });
}

function fecharResumo() {
  document.getElementById("resumoPopup").style.display = "none";
  document.getElementById("overlay").style.display = "none";
  // Atualiza a página para permitir um novo agendamento
  location.reload();
}

function abrirConsulta() {
  document.getElementById("popupConsulta").classList.remove("hidden");
  document.getElementById("raConsulta").value = "";
  document.getElementById("resultadoConsulta").innerHTML = "";
}

function fecharConsulta() {
  document.getElementById("popupConsulta").classList.add("hidden");
}

function consultarAgendamento() {
  const ra = document.getElementById("raConsulta").value.trim();

  if (ra === "") {
    alert("Por favor, digite o RA.");
    return;
  }

  // Mostra o carregamento opcional
  document.getElementById("loadingOverlay").style.display = "flex";

  const URL_API = "https://script.google.com/macros/s/AKfycby8ORvubh5DABIV10qNSoNQYhibR9VCZJ6i4RBgXhgowDVISUgQikyn0CpKpJK1K_ywBQ/exec";

  fetch(`${URL_API}?ra=${ra}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById("loadingOverlay").style.display = "none";

      if (!data || !data.nome) {
        alert("Agendamento não encontrado.");
        return;
      }

      // Reutiliza o mesmo popup de confirmação
      let resumo = `
        <p><strong>Nome:</strong> ${data.nome}</p>
        <p><strong>RA:</strong> ${data.ra}</p>
        <p><strong>Curso:</strong> ${data.curso}</p>
        <p><strong>Data de envio:</strong> ${data.dataEnvio}</p>
        <ul>
      `;
      data.disciplinas.forEach(item => {
        resumo += `<li><strong>${item.nome}:</strong> ${item.horario}</li>`;
      });
      resumo += `</ul>`;

      document.getElementById("resumoConteudo").innerHTML = resumo;
      document.getElementById("overlay").style.display = "block";
      document.getElementById("resumoPopup").style.display = "block";
    })
    .catch(error => {
      document.getElementById("loadingOverlay").style.display = "none";
      alert("Erro na consulta: " + error.message);
    });
}

function mostrarResumoConsulta(dados) {
  document.getElementById('consulta-nome').innerText = dados.nome || '---';
  document.getElementById('consulta-ra').innerText = dados.ra || '---';
  document.getElementById('consulta-curso').innerText = dados.curso || '---';
  document.getElementById('consulta-data').innerText = dados.dataEnvio || '---';

  const lista = document.getElementById('consulta-disciplinas');
  lista.innerHTML = "";
  dados.disciplinas.forEach(d => {
    const item = document.createElement("li");
    item.textContent = `${d.nome}: ${d.horario}`;
    lista.appendChild(item);
  });

  document.getElementById('resumoConsulta').style.display = 'block';
}

function fecharResumoConsulta() {
  document.getElementById('resumoConsulta').style.display = 'none';
}
