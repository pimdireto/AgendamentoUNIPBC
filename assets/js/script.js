// script.js

console.log("JS carregado com sucesso!");

let count = 0;

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
    "29/09 Segunda-feira - Tarde", "29/09 Segunda-feira - Noite",
    "30/09 Terça-feira - Manhã", "30/09 Terça-feira - Tarde", "30/09 Terça-feira - Noite",
    "01/10 Quarta-feira - Manhã", "01/10 Quarta-feira - Tarde", "01/10 Quarta-feira - Noite",
    "02/10 Quinta-feira - Manhã", "02/10 Quinta-feira - Tarde", "02/10 Quinta-feira - Noite",
    "03/06 Sexta-feira - Manhã", "03/06 Sexta-feira - Tarde", "03/06 Sexta-feira - noite",
    "04/10 Sábado - Manhã", "04/10 Sábado - Tarde"
  ];
  return horarios.map(h => `<div class="schedule-option" onclick="selecionarHorario(this)">${h}</div>`).join("");
}

function toggleGrade(btn) {
  const grid = btn.nextElementSibling;
  grid.classList.toggle("active");
}

function selecionarHorario(el) {
  const siblings = el.parentElement.querySelectorAll(".schedule-option");
  siblings.forEach(sib => sib.classList.remove("selected"));
  el.classList.add("selected");

  const btnHorario = el.parentElement.previousElementSibling;
  btnHorario.textContent = "Horário: " + el.textContent;

  toggleGrade(btnHorario);
}

function exibirErroAgendamento(mensagem) {
  const popup = document.getElementById("resumoPopup");
  popup.querySelector("h3").textContent = "Horário Indisponível";
  document.getElementById("resumoConteudo").innerHTML = `
    <div class="erro-popup">
      <p>⛔ ${mensagem}</p>
    </div>
  `;
  document.getElementById("overlay").style.display = "block";
  popup.style.display = "block";
}

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

  document.getElementById("loadingOverlay").style.display = "flex";
  let progress = 0;
  const progressBar = document.getElementById("progress");
  const loadingPercentage = document.getElementById("loadingPercentage");

  const interval = setInterval(() => {
    if (progress < 90) {
      progress += 10;
      progressBar.style.width = progress + "%";
      loadingPercentage.textContent = progress + "%";
    }
  }, 100);

  const URL_API = "https://script.google.com/macros/s/AKfycbzMNpbx2XJ1_myToc-r7h8DP4zYHesni2wsTZJKNckHlHv9NSv2WcuxwiiKfsamKlTqRg/exec";

  fetch(`${URL_API}?ra=${ra}`)
    .then(res => res.json())
    .then(data => {
      if (data && data.ra && data.nome) {
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

      fetch(URL_API, {
        method: "POST",
        mode: "no-cors",
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

        setTimeout(() => {
          document.getElementById("loadingOverlay").style.display = "none";

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
        }, 500);
      });
    })
    .catch(error => {
      clearInterval(interval);
      document.getElementById("loadingOverlay").style.display = "none";
      alert("Erro ao verificar RA: " + error.message);
    });
}

function fecharResumo() {
  document.getElementById("resumoPopup").style.display = "none";
  document.getElementById("overlay").style.display = "none";
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

  document.getElementById("loadingOverlay").style.display = "flex";
  const URL_API = "https://script.google.com/macros/s/AKfycbzMNpbx2XJ1_myToc-r7h8DP4zYHesni2wsTZJKNckHlHv9NSv2WcuxwiiKfsamKlTqRg/exec";

  fetch(`${URL_API}?ra=${ra}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById("loadingOverlay").style.display = "none";
      if (!data || !data.nome) {
        alert("Agendamento não encontrado.");
        return;
      }

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

let horariosLotados = {};

async function carregarHorariosLotados() {
  try {
    const response = await fetch("https://script.google.com/macros/s/AKfycbzMNpbx2XJ1_myToc-r7h8DP4zYHesni2wsTZJKNckHlHv9NSv2WcuxwiiKfsamKlTqRg/exec");
    const data = await response.json();
    horariosLotados = data;
  } catch (error) {
    console.error("Erro ao carregar contagem de horários:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await carregarHorariosLotados();
  // Se houver função para criar grade, chame aqui
});
