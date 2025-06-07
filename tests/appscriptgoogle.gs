function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetPrincipal = ss.getSheetByName("Página1");
  const dados = JSON.parse(e.postData.contents);
  const dataEnvio = new Date();

  // Verificação opcional de segurança via token
  if (dados.token !== 'UnipAdminBC2025') {
    return ContentService.createTextOutput("Token inválido.");
  }

  // RA formatado com 7 dígitos
  const raFormatado = dados.ra.padStart(7, '0');
  const registros = sheetPrincipal.getDataRange().getValues();
  const raJaExiste = registros.some(row => (row[1] || "").toString().replace(/^'/, "") === raFormatado);

  if (raJaExiste) {
    return ContentService.createTextOutput(
      JSON.stringify({ erro: "Você já realizou o agendamento. Caso tenha dúvidas, consulte seu agendamento." })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // Verificação de limite de agendamentos
  const contagemHorarios = getContagemPorHorario();
  const contagemSimulada = { ...contagemHorarios };

  for (const agendamento of dados.agendamentos) {
    const chave = `${agendamento.disciplina} - ${agendamento.horario}`;
    contagemSimulada[chave] = (contagemSimulada[chave] || 0) + 1;

    if (contagemSimulada[chave] > 110) {
      return ContentService.createTextOutput(
        JSON.stringify({ erro: `O horário "${agendamento.horario}" da disciplina "${agendamento.disciplina}" está lotado.` })
      ).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Registrar agendamentos
  dados.agendamentos.forEach(agendamento => {
    // Inserir na planilha principal
    sheetPrincipal.appendRow([
      dados.nome,
      "'" + raFormatado,
      dados.curso,
      Utilities.formatDate(dataEnvio, "GMT-3", "dd/MM/yyyy, HH:mm:ss"),
      agendamento.disciplina,
      agendamento.horario
    ]);

    // Criar ou acessar aba do horário
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
  return ContentService.createTextOutput("OK");
}

// Reorganiza abas com base na data e período
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

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = e.parameter.action;
  const raParam = (e.parameter.ra || "").trim().toLowerCase();

  if (e.parameter.verificar === "1" || action === "contagemHorarios") {
    return ContentService.createTextOutput(
      JSON.stringify(getContagemPorHorario())
    ).setMimeType(ContentService.MimeType.JSON);
  }

  if (raParam) {
    const sheet = ss.getSheetByName("Página1");
    const dados = sheet.getDataRange().getValues();
    const disciplinas = [];
    let nome = "", curso = "", dataEnvio = "", encontrado = false;

    for (let i = 1; i < dados.length; i++) {
      const raLinha = (dados[i][1] || "").toString().replace(/^'/, "").trim().toLowerCase();
      if (raLinha === raParam) {
        encontrado = true;
        nome = dados[i][0];
        curso = dados[i][2];

        const dataBruta = dados[i][3];
        const fuso = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
        dataEnvio = dataBruta instanceof Date
          ? Utilities.formatDate(dataBruta, fuso, "dd/MM/yyyy, HH:mm:ss")
          : dataBruta;

        disciplinas.push({
          nome: dados[i][4],
          horario: dados[i][5]
        });
      }
    }

    if (!encontrado) {
      return ContentService.createTextOutput(
        JSON.stringify({ erro: "Agendamento não encontrado." })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ nome, ra: e.parameter.ra.trim(), curso, dataEnvio, disciplinas })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ erro: "Parâmetros inválidos." })
  ).setMimeType(ContentService.MimeType.JSON);
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
