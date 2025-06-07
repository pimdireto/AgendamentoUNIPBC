function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetPrincipal = ss.getSheetByName("Página1");
  const dados = JSON.parse(e.postData.contents);
  const dataEnvio = new Date();

  if (dados.token !== 'UnipAdminBC2025') {
    return criarOutputJSON({ erro: "Token inválido." });
  }

  const raFormatado = dados.ra.padStart(7, '0');
  const registros = sheetPrincipal.getDataRange().getValues();
  const raJaExiste = registros.some(row => (row[1] || "").toString().replace(/^'/, "") === raFormatado);

  if (raJaExiste) {
    return criarOutputJSON({
      erro: "Você já realizou o agendamento. Caso tenha dúvidas, consulte seu agendamento."
    });
  }

  const contagemHorarios = getContagemPorHorario();
  for (const agendamento of dados.agendamentos) {
    const chave = `${agendamento.disciplina} - ${agendamento.horario}`;
    const total = (contagemHorarios[chave] || 0) + 1;
    if (total > 110) {
      return criarOutputJSON({
        erro: `O horário "${agendamento.horario}" da disciplina "${agendamento.disciplina}" está lotado.`
      });
    }
  }

  dados.agendamentos.forEach(agendamento => {
    // Registrar na aba principal
    sheetPrincipal.appendRow([
      dados.nome,
      "'" + raFormatado,
      dados.curso,
      Utilities.formatDate(dataEnvio, "GMT-3", "dd/MM/yyyy, HH:mm:ss"),
      agendamento.disciplina,
      agendamento.horario
    ]);

    // Registrar em aba específica do horário
    const nomeAba = agendamento.horario;
    let abaHorario = ss.getSheetByName(nomeAba);
    if (!abaHorario) {
      abaHorario = ss.insertSheet(nomeAba);
      abaHorario.getRange("A1:D1").setValues([["NOME COMPLETO", "RA", "CURSO", "DISCIPLINA"]]);
    }

    const proximaLinha = abaHorario.getLastRow() + 1;
    abaHorario.getRange(proximaLinha, 1, 1, 4).setValues([
      [dados.nome, "'" + raFormatado, dados.curso, agendamento.disciplina]
    ]);
  });

  reordenarAbas();
  return criarOutputJSON({ mensagem: "OK" });
}

function doGet(e) {
  if (e.parameter.ra) {
    const ra = e.parameter.ra;
    const dados = buscarPorRA(ra);
    if (dados) {
      return criarOutputJSON(dados);
    }
  }

  const horarios = getContagemPorHorario();
  return criarOutputJSON({ horarios });
}

function doOptions(e) {
  // Retorna resposta vazia para requisições preflight (CORS)
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

function getContagemPorHorario() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dados = ss.getSheetByName("Página1").getDataRange().getValues();
  const contagem = {};

  for (let i = 1; i < dados.length; i++) {
    const disciplina = dados[i][4];
    const horario = dados[i][5];
    if (disciplina && horario) {
      const chave = `${disciplina} - ${horario}`;
      contagem[chave] = (contagem[chave] || 0) + 1;
    }
  }

  return contagem;
}

function reordenarAbas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const todasAbas = ss.getSheets();
  const abaPrincipal = ss.getSheetByName("Página1");

  const abasOrdenadas = todasAbas
    .filter(s => s.getName() !== "Página1")
    .map(sheet => ({
      nome: sheet.getName(),
      chave: gerarChaveOrdenacao(sheet.getName()),
      sheet
    }))
    .sort((a, b) => compararChaves(a.chave, b.chave))
    .map(obj => obj.sheet);

  ss.setActiveSheet(abaPrincipal);
  ss.moveActiveSheet(0);

  abasOrdenadas.forEach((sheet, i) => {
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(i + 1);
  });
}

function gerarChaveOrdenacao(nomeAba) {
  try {
    const partes = nomeAba.split(" ");
    const [dia, mes] = partes[0].split("/").map(Number);
    const periodoTexto = partes[partes.length - 1].toLowerCase();
    const ano = new Date().getFullYear();
    const data = new Date(ano, mes - 1, dia);
    const pesoPeriodo = { "manhã": 1, "tarde": 2, "noite": 3 }[periodoTexto] || 99;
    return { data, periodo: pesoPeriodo };
  } catch {
    return { data: new Date(9999, 11, 31), periodo: 99 };
  }
}

function compararChaves(a, b) {
  return a.data - b.data || a.periodo - b.periodo;
}

function buscarPorRA(ra) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Página1");
  const dados = sheet.getDataRange().getValues();
  const raFormatado = ra.padStart(7, '0');
  const agendamentos = [];

  for (let i = 1; i < dados.length; i++) {
    if ((dados[i][1] || "").toString().replace(/^'/, "") === raFormatado) {
      agendamentos.push({
        nome: dados[i][0],
        curso: dados[i][2],
        data: dados[i][3],
        disciplina: dados[i][4],
        horario: dados[i][5]
      });
    }
  }

  return agendamentos.length > 0 ? { agendamentos } : null;
}

function criarOutputJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
