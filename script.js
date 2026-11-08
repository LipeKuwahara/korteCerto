const cutRows = document.getElementById('cutRows');

const emptyState = document.getElementById('emptyState');

const stockSelect = document.getElementById('stockLength');

const customLength = document.getElementById('customLength');

const sawSelect = document.getElementById('sawModel');

const customKerfWrap = document.getElementById('customKerfWrap');

const customKerf = document.getElementById('customKerf');

const errorBox = document.getElementById('errorBox');

const results = document.getElementById('results');


// FORMATAÇÃO DE NÚMEROS

function fmt(value) {

    return Number(value).toLocaleString('pt-BR', {
        maximumFractionDigits: 2
    });

}


// INTERPRETAR EXPRESSÕES MATEMÁTICAS

function calculateLength(value) {

    value = String(value).trim();

    if (!value) {
        return null;
    }

    // Aceita somente números e operadores matemáticos básicos.
    // Também aceita vírgula como separador decimal.

    value = value.replace(/,/g, '.');

    if (!/^[\d\s.+\-*/()]+$/.test(value)) {
        return null;
    }

    try {

        const result = Function(
            `"use strict"; return (${value})`
        )();

        if (
            typeof result !== 'number' ||
            !Number.isFinite(result) ||
            result <= 0
        ) {
            return null;
        }

        return result;

    } catch {

        return null;

    }

}


// ADICIONAR LINHA

// ADICIONAR LINHA

function addRow(length = '', quantity = 1) {

    const tr = document.createElement('tr');

    // GRUPO

    const groupCell = document.createElement('td');

    const groupInput = document.createElement('input');

    groupInput.className = 'piece-group';

    groupInput.type = 'text';

    groupInput.maxLength = 10;

    groupInput.placeholder = 'Ex.: A';

    // Gerar letras automaticamente

    const rowCount = cutRows.querySelectorAll('tr').length;

    function getGroupLetter(index) {

        let result = '';

        while (index >= 0) {

            result = String.fromCharCode(index % 26 + 65) + result;

            index = Math.floor(index / 26) - 1;

        }

        return result;

    }

    groupInput.value = getGroupLetter(rowCount);

    groupCell.appendChild(groupInput);


    // COMPRIMENTO

    const lengthCell = document.createElement('td');

    const lengthInput = document.createElement('input');

    lengthInput.className = 'piece-length';

    lengthInput.type = 'text';

    lengthInput.inputMode = 'text';

    lengthInput.placeholder = 'Ex.: 1250 ou 8810 + 40';

    lengthInput.value = length;

    lengthInput.addEventListener('blur', () => {

        const result = calculateLength(lengthInput.value);

        if (result !== null) {

            lengthInput.value = result;

        }

        updateTotals();

    });

    lengthCell.appendChild(lengthInput);


    // QUANTIDADE

    const quantityCell = document.createElement('td');

    const quantityInput = document.createElement('input');

    quantityInput.className = 'piece-quantity';

    quantityInput.type = 'number';

    quantityInput.min = '1';

    quantityInput.step = '1';

    quantityInput.value = quantity;

    quantityCell.appendChild(quantityInput);


    // REMOVER

    const actionCell = document.createElement('td');

    const removeButton = document.createElement('button');

    removeButton.className = 'remove-btn';

    removeButton.type = 'button';

    removeButton.title = 'Remover linha';

    removeButton.textContent = '×';

    removeButton.addEventListener('click', () => {

        tr.remove();

        updateTotals();

    });

    actionCell.appendChild(removeButton);


    // ADICIONAR ELEMENTOS

    tr.append(
        groupCell,
        lengthCell,
        quantityCell,
        actionCell
    );


    // EVENTOS DOS INPUTS

    tr.querySelectorAll('input').forEach(input => {

        input.addEventListener('input', updateTotals);

        input.addEventListener('keydown', event => {

            if (event.key === 'Enter') {

                event.preventDefault();

                const currentLength = calculateLength(
                    lengthInput.value
                );

                if (currentLength === null) {

                    lengthInput.focus();

                    return;

                }

                lengthInput.value = currentLength;

                addRow();

                const inputs = cutRows.querySelectorAll('.piece-length');

                inputs[inputs.length - 1].focus();

            }

        });

    });


    cutRows.appendChild(tr);

    updateTotals();

}


// ATUALIZAR CONTADORES

function updateTotals() {

    const rows = [...cutRows.querySelectorAll('tr')];

    let count = 0;

    let total = 0;

    rows.forEach(row => {

        const length = calculateLength(
            row.querySelector('.piece-length').value
        ) || 0;

        const quantity = Number(
            row.querySelector('.piece-quantity').value
        ) || 0;

        count += quantity;

        total += length * quantity;

    });


    emptyState.classList.toggle('hidden', rows.length > 0);

    document.getElementById('lineCount').textContent =

        `${rows.length} ${rows.length === 1 ? 'linha' : 'linhas'}`;

    document.getElementById('pieceCount').textContent =

        `${count} ${count === 1 ? 'peça' : 'peças'} no total`;

    document.getElementById('lengthTotal').textContent =

        `${fmt(total)} mm lineares`;

}


// CONFIGURAÇÃO DE BARRA

stockSelect.addEventListener('change', () => {

    customLength.classList.toggle(
        'hidden',
        stockSelect.value !== 'custom'
    );

});


// CONFIGURAÇÃO DE SERRA

sawSelect.addEventListener('change', () => {

    customKerfWrap.classList.toggle(
        'hidden',
        sawSelect.value !== 'personalizada'
    );

});


// OBTER COMPRIMENTO DA BARRA

function getStockLength() {

    if (stockSelect.value === 'custom') {

        return Number(customLength.value);

    }

    return Number(stockSelect.value);

}


// OBTER PERDA DA SERRA

function getKerf() {

    if (sawSelect.value === 'personalizada') {

        return Number(customKerf.value);

    }

    return Number(
        sawSelect.selectedOptions[0].dataset.kerf
    );

}


// MENSAGEM DE ERRO

function showError(message) {

    errorBox.textContent = message;

    errorBox.classList.remove('hidden');

}


// ALGORITMO DE OTIMIZAÇÃO

/*
    First-Fit Decreasing (FFD).

    1. Expande as quantidades em peças individuais.
    2. Divide comprimentos maiores que a barra disponível.
    3. Ordena as peças da maior para a menor.
    4. Tenta encaixar cada peça nas barras existentes.
    5. Se não couber, abre uma nova barra.

    Considera perda de serra por peça menor que a barra inteira.
*/

function optimizeCuts(cuts, stockLength, kerf) {

    const pieces = [];

    // CRIAR CONJUNTOS E SEGMENTOS

    cuts.forEach(cut => {

        for (let i = 1; i <= cut.quantity; i++) {

            const assemblyId = `${cut.group} (${i})`;

            let remaining = cut.length;

            let segmentNumber = 1;

            while (remaining > 0) {

                const segmentLength = Math.min(
                    remaining,
                    stockLength
                );

                pieces.push({

                    group: cut.group,

                    assemblyId,

                    segmentNumber,

                    length: segmentLength

                });

                remaining -= segmentLength;

                segmentNumber++;

            }

        }

    });


    // ORDENAR DO MAIOR PARA O MENOR

    pieces.sort((a, b) => b.length - a.length);


    const bars = [];


    // DISTRIBUIR SEGMENTOS NAS BARRAS

    for (const piece of pieces) {

        let placed = false;

        const pieceKerf = piece.length >= stockLength
            ? 0
            : kerf;


        for (const bar of bars) {

            const needed =

                bar.pieceSum +

                piece.length +

                bar.kerfTotal +

                pieceKerf;


            if (needed <= stockLength + 1e-9) {

                bar.pieces.push(piece);

                bar.pieceSum += piece.length;

                bar.kerfTotal += pieceKerf;

                placed = true;

                break;

            }

        }


        // ABRIR NOVA BARRA

        if (!placed) {

            bars.push({

                pieces: [piece],

                pieceSum: piece.length,

                kerfTotal: pieceKerf

            });

        }

    }


    // RESULTADOS

    const totalStock = bars.length * stockLength;

    const totalPieces = pieces.reduce(
        (sum, piece) => sum + piece.length,
        0
    );


    const resultBars = bars.map((bar, index) => ({

        number: index + 1,

        pieces: bar.pieces,

        pieceSum: bar.pieceSum,

        kerfTotal: bar.kerfTotal,

        leftover:

            stockLength -

            bar.pieceSum -

            bar.kerfTotal

    }));


    const totalLeftover = resultBars.reduce(
        (sum, bar) => sum + bar.leftover,
        0
    );


    return {

        bars: resultBars,

        barCount: bars.length,

        stockLength,

        totalStock,

        totalPieces,

        totalKerf: resultBars.reduce(
            (sum, bar) => sum + bar.kerfTotal,
            0
        ),

        totalLeftover,

        utilization: totalStock
            ? totalPieces / totalStock * 100
            : 0

    };

}


// EXIBIR RESULTADOS

function renderResults(result, kerf) {

    document.getElementById('barMetric').textContent =

        result.barCount;

    document.getElementById('useMetric').textContent =

        `${fmt(result.utilization)}%`;

    document.getElementById('leftMetric').textContent =

        `${fmt(result.totalLeftover)} mm`;


    document.getElementById('methodNote').textContent =

        `Método: First-Fit Decreasing. ` +

        `Perda considerada: ${fmt(kerf)} mm por peça. ` +

        `O aproveitamento considera o comprimento útil das peças ` +

        `em relação ao material bruto total.`;


    const container = document.getElementById('barPlans');

    container.replaceChildren();


    result.bars.forEach(bar => {

        const card = document.createElement('article');

        card.className = 'bar-card';


        // CABEÇALHO DA BARRA

        const head = document.createElement('div');

        head.className = 'bar-head';

        const title = document.createElement('span');

        title.textContent =

            `BARRA ${String(bar.number).padStart(2, '0')} · ` +

            `${bar.pieces.length} cortes`;

        const remaining = document.createElement('span');

        remaining.textContent =

            `Sobra: ${fmt(bar.leftover)} mm`;

        head.append(title, remaining);


        // REPRESENTAÇÃO VISUAL

        const segments = document.createElement('div');

        segments.className = 'segments';


        bar.pieces.forEach(piece => {

            const segment = document.createElement('div');

            segment.className = 'segment';

            segment.style.flex = `${piece.length} 0 0`;

            segment.dataset.assembly = piece.assemblyId;
            segment.dataset.segment = piece.segmentNumber;
            segment.dataset.length = piece.length;

            segment.title =
                `${piece.assemblyId} · Segmento ${piece.segmentNumber} · ${fmt(piece.length)} mm`;

            segment.textContent =
                `${piece.assemblyId} - ${fmt(piece.length)}`;

            segments.appendChild(segment);

        });


        // INFORMAÇÕES DA BARRA

        const details = document.createElement('div');

        details.className = 'bar-left';

        details.textContent =

            `Barra: ${fmt(result.stockLength)} mm · ` +

            `Peças: ${fmt(bar.pieceSum)} mm · ` +

            `Perda de serra: ${fmt(bar.kerfTotal)} mm`;


        card.append(head, segments, details);

        container.appendChild(card);

    });


    results.classList.remove('hidden');

    results.scrollIntoView({

        behavior: 'smooth',

        block: 'start'

    });

}


// BOTÃO OTIMIZAR

document.getElementById('optimizeBtn').addEventListener('click', () => {

    errorBox.classList.add('hidden');

    results.classList.add('hidden');


    const rows = [...cutRows.querySelectorAll('tr')];


    if (!rows.length) {

        return showError(

            'Adicione pelo menos uma linha de corte.'

        );

    }


    const cuts = [];


    // VALIDAR ENTRADAS

    for (const row of rows) {

        const groupInput = row.querySelector('.piece-group');

        const group = groupInput.value.trim().toUpperCase();

        const lengthInput = row.querySelector('.piece-length');

        const length = calculateLength(lengthInput.value);

        const quantity = Number(
            row.querySelector('.piece-quantity').value
        );


        if (
            !group ||
            !Number.isFinite(length) ||
            length <= 0 ||
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {

            return showError(
                'Preencha grupo, comprimento e quantidade corretamente.'
            );

        }


        groupInput.value = group;

        lengthInput.value = length;


        cuts.push({

            group,

            length,

            quantity

        });

    }


    const stockLength = getStockLength();

    const kerf = getKerf();


    if (

        !Number.isFinite(stockLength) ||

        stockLength <= 0

    ) {

        return showError(

            'Informe um comprimento de barra válido.'

        );

    }


    if (

        !Number.isFinite(kerf) ||

        kerf < 0

    ) {

        return showError(

            'Informe uma perda de serra válida.'

        );

    }


    // EXECUTAR OTIMIZAÇÃO

    const button = document.getElementById('optimizeBtn');

    button.disabled = true;

    button.textContent = 'CALCULANDO...';


    try {

        const result = optimizeCuts(

            cuts,

            stockLength,

            kerf

        );

        renderResults(result, kerf);

    } catch (error) {

        showError(

            `Não foi possível calcular: ${error.message}`

        );

    } finally {

        button.disabled = false;

        button.innerHTML =

            'OTIMIZAR CORTES <span>↗</span>';

    }

});


// IMPRESSÃO

document.getElementById('printBtn').addEventListener(

    'click',

    () => window.print()

);


// INICIALIZAÇÃO

document.getElementById('addRow').addEventListener(

    'click',

    () => addRow()

);

addRow();

// ==========================================
// IMPORTAÇÃO DE PLANILHAS - CORTE-CERTO
// ==========================================

const importButton = document.getElementById('btnImportExcel');
const excelFileInput = document.getElementById('excelFileInput');

let importedCuts = [];


// Abrir seletor de arquivos
importButton.addEventListener('click', () => {
    excelFileInput.click();
});


// Selecionar arquivo
excelFileInput.addEventListener('change', async (event) => {

    const file = event.target.files[0];

    if (!file) return;

    if (typeof XLSX === 'undefined') {
        alert('A biblioteca de leitura do Excel não foi carregada.');
        return;
    }

    try {

        const data = await file.arrayBuffer();

        const workbook = XLSX.read(data, {
            type: 'array'
        });

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json(firstSheet, {
            defval: '',
            raw: false
        });

        if (!rows.length) {
            throw new Error('A planilha está vazia.');
        }

        importedCuts = processExcelData(rows);

        if (!importedCuts.length) {
            throw new Error('Nenhum registro válido foi encontrado.');
        }

        const action = prompt(
            `Arquivo: ${file.name}\n` +
            `Registros encontrados: ${importedCuts.length}\n\n` +
            `Digite:\n` +
            `1 - Adicionar à lista atual\n` +
            `2 - Substituir a lista atual\n` +
            `0 - Cancelar`
        );

        if (action === '1') {

            insertImportedCuts(false);

        } else if (action === '2') {

            insertImportedCuts(true);

        }

    } catch (error) {

        alert('Erro na importação:\n' + error.message);

    }

    // Permite importar novamente o mesmo arquivo
    excelFileInput.value = '';

});


// Normalizar nomes das colunas
function normalizeHeader(value) {

    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

}


// Identificar colunas e validar registros
function processExcelData(rows) {

    const firstRow = rows[0];

    const headers = Object.keys(firstRow);

    const findColumn = (possibilities) => {

        return headers.find(header =>
            possibilities.includes(normalizeHeader(header))
        );

    };

    const groupColumn = findColumn([
        'GRUPO',
        'GROUP',
        'IDENTIFICACAO'
    ]);

    const lengthColumn = findColumn([
        'COMPRIMENTO',
        'LENGTH',
        'TAMANHO'
    ]);

    const quantityColumn = findColumn([
        'QUANTIDADE',
        'QTD',
        'QTDE',
        'QUANTITY'
    ]);

    if (!lengthColumn || !quantityColumn) {
        throw new Error(
            'Não foi possível identificar as colunas de comprimento e quantidade.'
        );
    }

    const result = [];

    const usedGroups = new Set();

    rows.forEach((row, index) => {

        const lengthValue = String(row[lengthColumn]).trim();
        const quantityValue = String(row[quantityColumn]).trim();

        // Ignorar linhas completamente vazias
        if (!lengthValue && !quantityValue) return;

        const group = groupColumn
            ? String(row[groupColumn]).trim().toUpperCase()
            : '';

        const length = calculateLength(lengthValue);

        const quantity = Number(quantityValue.replace(',', '.'));

        if (!group) {
            throw new Error(`Grupo não informado na linha ${index + 2}.`);
        }

        if (!lengthValue || !Number.isFinite(length) || length <= 0) {
            throw new Error(`Comprimento inválido na linha ${index + 2}.`);
        }

        if (
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            throw new Error(`Quantidade inválida na linha ${index + 2}.`);
        }

        if (usedGroups.has(group)) {
            throw new Error(
                `O grupo "${group}" está duplicado na planilha.`
            );
        }

        usedGroups.add(group);

        result.push({
            group,
            length,
            quantity
        });

    });

    return result;

}


// Inserir os dados na tabela
function insertImportedCuts(replaceExisting) {

    // Localizar as linhas atuais
    const existingRows = Array.from(
        document.querySelectorAll('.piece-group')
    ).map(input => input.closest('tr'));

    // Substituir dados existentes
    if (replaceExisting) {

        existingRows.forEach(row => row.remove());

    }

    // Inserir novos registros
    importedCuts.forEach(cut => {

        addRow();

        const rows = document.querySelectorAll('.piece-group');

        const lastRow = rows[rows.length - 1].closest('tr');

        lastRow.querySelector('.piece-group').value = cut.group;

        lastRow.querySelector('.piece-length').value = cut.length;

        lastRow.querySelector('.piece-quantity').value = cut.quantity;

    });

    // Atualizar indicadores
    updateTotals();

    alert(
        `${importedCuts.length} registro(s) importado(s) com sucesso!`
    );

}

// ==========================================
// IMPRESSÃO DE ETIQUETAS - CORTE-CERTO
// ==========================================

document.getElementById('btnPrintLabels')
    .addEventListener('click', printPieceLabels);


function printPieceLabels() {

    if (!window.jspdf) {
        alert('A biblioteca PDF não foi carregada. Verifique sua conexão.');
        return;
    }

    const segments = document.querySelectorAll(
        '.segment[data-assembly]'
    );

    if (!segments.length) {
        alert('Nenhuma peça encontrada. Execute a otimização primeiro.');
        return;
    }

    const { jsPDF } = window.jspdf;

    // Etiqueta de 100 x 50 mm
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [100, 50]
    });

    const labels = Array.from(segments);

    labels.forEach((element, index) => {

        const assembly = element.dataset.assembly;
        const segment = element.dataset.segment;
        const length = Number(element.dataset.length);

        if (index > 0) {
            doc.addPage([100, 50], 'landscape');
        }

        // Borda da etiqueta
        doc.setLineWidth(0.4);
        doc.rect(2, 2, 96, 46);

        // Identificação do conjunto
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(25);

        doc.text(assembly, 50, 17, {
            align: 'center'
        });

        // Separador
        doc.setLineWidth(0.3);
        doc.line(10, 21, 90, 21);

        // Número do segmento
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(13);

        doc.text(
            `SEGMENTO: ${segment}`,
            50,
            30,
            { align: 'center' }
        );

        // Comprimento
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(17);

        doc.text(
            `${length.toLocaleString('pt-BR')} mm`,
            50,
            41,
            { align: 'center' }
        );

    });

    doc.save('Etiquetas_Corte-Certo.pdf');

}