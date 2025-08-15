// report.js
const ReportGenerator = {
    generatePdf(clientId) {
        try {
            const jsPDFAvailable = typeof window.jspdf !== 'undefined' || typeof window.jsPDF !== 'undefined';
            const systemDataAvailable = typeof LoanApp !== 'undefined' && LoanApp.clients && LoanApp.loans;
            
            if (!jsPDFAvailable || !systemDataAvailable) {
                throw new Error('Sistema indisponível. Tente novamente.');
            }

            const jsPDF = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const client = LoanApp.clients.find(c => c.id === clientId);

        if (!client) {
            LoanApp.showToast('Cliente não encontrado para gerar o relatório.', 'error');
            return;
        }

        const clientLoans = LoanApp.loans.filter(loan => loan.clientId === clientId);
        
        this._addHeader(doc);
        let y = this._addClientInfo(doc, client, 40);
        y = this._addLoanHistory(doc, clientLoans, y);
        y = this._addSignatureArea(doc, y);
        this._addFooter(doc);

        doc.save(`Relatorio_${client.name.replace(/\s/g, '_')}.pdf`);
        } catch (error) {
            LoanApp.showToast('Erro ao gerar relatório. Tente novamente.', 'error');
        }
    },

    _addHeader(doc) {
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Relatório de Histórico do Cliente', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
    },

    _addClientInfo(doc, client, y) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Dados do Cliente', 14, y);
        y += 8;
        
        const clientData = [
            ['Nome:', client.name],
            ['CPF:', client.cpf],
            ['RG:', client.rg || 'Não informado'],
            ['Data de Nascimento:', client.birthDate || 'Não informada'],
            ['Nome da Mãe:', client.motherName || 'Não informado'],
            ['Nome do Pai:', client.fatherName || 'Não informado'],
            ['Telefone:', client.phone || 'Não informado'],
            ['Email:', client.email || 'Não informado'],
            ['Endereço:', client.address || 'Não informado'],
            ['Número:', client.number || 'S/N'],
            ['Complemento:', client.complement || 'Não informado'],
            ['Bairro:', client.neighborhood || 'Não informado'],
            ['Cidade:', client.city || 'Não informada'],
            ['Estado:', client.state || 'Não informado'],
            ['CEP:', client.cep || 'Não informado']
        ];

        doc.autoTable({
            startY: y,
            body: clientData,
            theme: 'grid',
            styles: { fontSize: 10 },
            headStyles: { fillColor: [22, 160, 133] },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
        });

        return doc.autoTable.previous.finalY + 10;
    },

    _addLoanHistory(doc, loans, y) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Histórico de Empréstimos', 14, y);
        y += 8;

        if (loans.length === 0) {
            doc.setFontSize(10);
            doc.text('Nenhum empréstimo registrado para este cliente.', 14, y);
            return y + 10;
        }

        loans.forEach((loan) => {
            // Garantir valores padrão sem mostrar avisos
            loan.amount = loan.amount || 0;
            loan.interestRate = typeof loan.interestRate === 'number' ? loan.interestRate : 0;
            loan.installments = loan.installments || (loan.payments ? loan.payments.length : 1);
            
            if (loan.payments && loan.payments[0]) {
                try {
                    new Date(loan.payments[0].dueDate).toISOString();
                } catch (e) {
                    loan.payments[0].dueDate = new Date().toISOString().split('T')[0];
                }
            }
            if (y > 260) { // Check for page break
                doc.addPage();
                y = 20;
            }
            
            const loanSummary = [
                ['ID do Empréstimo:', loan.id || 'N/A'],
                ['Data de Início:', loan.startDate ? new Date(loan.startDate).toLocaleDateString('pt-BR') : 'Data inválida'],
                ['Valor Original:', loan.amount > 0 ? LoanApp.formatCurrency(loan.amount) : 'Valor inválido'],
                ['Taxa de Juros:', typeof loan.interestRate === 'number' ? `${loan.interestRate}%` : 'Taxa inválida'],
                ['Juros de Mora (ao dia):', typeof loan.moraInterestRate === 'number' ? `${loan.moraInterestRate}%` : '0%'],
                ['Multa por Atraso:', typeof loan.lateFeeRate === 'number' ? `${loan.lateFeeRate}%` : '0%'],
                ['Nº de Parcelas:', loan.installments > 0 ? loan.installments : 'Inválido'],
                ['Valor da Parcela:', loan.totalValue > 0 && loan.payments?.length ? LoanApp.formatCurrency(loan.totalValue / loan.payments.length) : 'Valor inválido'],
                ['Valor Total:', loan.totalValue > 0 ? LoanApp.formatCurrency(loan.totalValue) : 'Valor inválido'],
                ['Status:', loan.status ? loan.status.charAt(0).toUpperCase() + loan.status.slice(1) : 'Indefinido'],
                ['Local de Pagamento:', loan.complement || 'Não informado']
            ];

            doc.autoTable({
                startY: y,
                body: loanSummary,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 1.5 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
                margin: { left: 14, right: 14 }
            });
            y = doc.autoTable.previous.finalY;

            const head = [['#', 'Vencimento', 'Valor', 'Juros/Multa', 'Total', 'Status', 'Data Pagto.']];
            const body = loan.payments.map(p => {
                const isOverdue = new Date(p.dueDate) < new Date() && p.status === 'pendente';
                let moraInterest = 0;
                let lateFee = 0;
                let total = p.amount;

                // Calculando com juros compostos (Tabela Price)
                if (isOverdue) {
                    const diffDays = Math.ceil((new Date() - new Date(p.dueDate)) / (1000 * 60 * 60 * 24));
                    // Juros de mora compostos diários
                    moraInterest = p.amount * (Math.pow(1 + loan.moraInterestRate/100, diffDays) - 1);
                    // Multa fixa
                    lateFee = p.amount * (loan.lateFeeRate / 100);
                    total = p.amount + moraInterest + lateFee;
                }

                return [
                    p.installmentNumber,
                    new Date(p.dueDate + 'T00:00:00').toLocaleDateString('pt-BR'),
                    LoanApp.formatCurrency(p.amount),
                    isOverdue ? LoanApp.formatCurrency(moraInterest + lateFee) : '---',
                    isOverdue ? LoanApp.formatCurrency(total) : LoanApp.formatCurrency(p.amount),
                    p.status.charAt(0).toUpperCase() + p.status.slice(1),
                    p.paidAt ? new Date(p.paidAt + 'T00:00:00').toLocaleDateString('pt-BR') : '---'
                ];
            });

            doc.autoTable({
                startY: y + 2,
                head: head,
                body: body,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
                styles: { fontSize: 8.5 },
                margin: { left: 14, right: 14 }
            });
            y = doc.autoTable.previous.finalY + 15;
        });
        return y;
    },

    _addSignatureArea(doc, y) {
        if (y > 220) { // Se não houver espaço suficiente na página atual
            doc.addPage();
            y = 20;
        }

        y += 20; // Espaço antes da área de assinatura

        // Linha para assinatura
        doc.setDrawColor(0);
        doc.line(14, y + 20, 110, y + 20);
        doc.line(150, y + 20, 196, y + 20);

        // Texto abaixo das linhas
        doc.setFontSize(8);
        doc.text('Assinatura do Cliente', 14, y + 25);
        doc.text('Data', 150, y + 25);

        // Texto dos termos
        doc.setFontSize(8);
        const terms = [
            'Declaro que todas as informações prestadas são verdadeiras e que estou ciente das condições',
            'do(s) empréstimo(s) acima descrito(s), incluindo taxas de juros, multas e encargos por atraso.',
            'Comprometo-me a cumprir com os pagamentos nas datas estabelecidas.'
        ];

        y += 35; // Espaço após as linhas de assinatura
        terms.forEach((line, index) => {
            doc.text(line, 14, y + (index * 5));
        });

        return y + (terms.length * 5) + 10;
    },

    _addFooter(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const text = `SharkPro | Página ${i} de ${pageCount}`;
            doc.text(text, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }
    }
};
