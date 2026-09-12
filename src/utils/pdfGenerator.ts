import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatBRL, formatDate, formatDateTime, formatCNPJ, formatPhone } from './formatters';
import { Store, Sale, Product, Comanda } from '../types';

interface HeaderOptions {
  doc: jsPDF;
  store: Store;
  title: string;
  periodText?: string;
}

const addReportHeader = ({ doc, store, title, periodText }: HeaderOptions) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Company Name Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(store.name || store.fantasyName || 'CONVENIÊNCIA', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  const infoLine = [
    store.cnpj ? `CNPJ: ${formatCNPJ(store.cnpj)}` : '',
    store.phone ? `Tel: ${formatPhone(store.phone)}` : '',
    store.address ? store.address : '',
  ].filter(Boolean).join('  |  ');
  doc.text(infoLine, 14, 24);

  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(14, 28, pageWidth - 14, 28);

  // Report Title & Period
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(title, 14, 37);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const nowStr = formatDateTime(new Date().toISOString());
  doc.text(`Emissão: ${nowStr}${periodText ? `  |  Período: ${periodText}` : ''}`, 14, 43);

  return 48; // starting Y for table
};

const addReportFooter = (doc: jsPDF) => {
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Entre Copos Gestão - Sistema Comercial - Documento para uso interno', 14, pageHeight - 8);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }
};

export const generateSalesReportPdf = (
  store: Store,
  sales: Sale[],
  periodText: string = 'Personalizado'
) => {
  const doc = new jsPDF();
  const startY = addReportHeader({
    doc,
    store,
    title: 'RELATÓRIO GERENCIAL DE VENDAS',
    periodText,
  });

  const tableData = sales.map((sale) => [
    sale.saleNumber,
    formatDateTime(sale.createdAt),
    sale.origin,
    sale.userName,
    sale.paymentMethod,
    formatBRL(sale.subtotal),
    formatBRL(sale.discount),
    formatBRL(sale.total),
  ]);

  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const totalDiscount = sales.reduce((acc, s) => acc + s.discount, 0);

  autoTable(doc, {
    startY,
    head: [['Nº Venda', 'Data/Hora', 'Origem', 'Operador', 'Pagamento', 'Subtotal', 'Desc.', 'Total Líquido']],
    body: tableData,
    foot: [['TOTAIS', `${sales.length} vendas`, '', '', '', '', formatBRL(totalDiscount), formatBRL(totalRevenue)]],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 32 },
      2: { cellWidth: 18 },
      3: { cellWidth: 30 },
      4: { cellWidth: 22 },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
  });

  addReportFooter(doc);
  doc.save(`relatorio-vendas-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateComandasReportPdf = (
  store: Store,
  comandas: Comanda[],
  periodText: string = 'Geral'
) => {
  const doc = new jsPDF();
  const startY = addReportHeader({
    doc,
    store,
    title: 'RELATÓRIO DE COMANDAS E MESAS',
    periodText,
  });

  const tableData = comandas.map((c) => [
    c.comandaNumber,
    c.tableNumber ? `Mesa ${c.tableNumber}` : '-',
    c.clientName || '-',
    c.openedByUserName,
    formatDateTime(c.openedAt),
    c.closedAt ? formatDateTime(c.closedAt) : 'Em aberto',
    c.status,
    formatBRL(c.total),
  ]);

  const totalRevenue = comandas.reduce((acc, c) => acc + c.total, 0);

  autoTable(doc, {
    startY,
    head: [['Comanda', 'Mesa', 'Cliente', 'Atendente', 'Abertura', 'Fechamento', 'Status', 'Total']],
    body: tableData,
    foot: [['TOTAL', `${comandas.length} comandas`, '', '', '', '', '', formatBRL(totalRevenue)]],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      7: { halign: 'right', fontStyle: 'bold' },
    },
  });

  addReportFooter(doc);
  doc.save(`relatorio-comandas-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateInventoryReportPdf = (store: Store, products: Product[]) => {
  const doc = new jsPDF();
  const startY = addReportHeader({
    doc,
    store,
    title: 'RELATÓRIO POSIÇÃO DE ESTOQUE E REPOSIÇÃO',
    periodText: 'Posição Atual',
  });

  const tableData = products.map((p) => {
    let status = 'Normal';
    if (p.currentStock <= 0) status = 'SEM ESTOQUE';
    else if (p.currentStock <= p.minStock) status = 'ESTOQUE BAIXO';

    return [
      p.barcode,
      p.name,
      p.categoryName || '-',
      p.unit,
      p.minStock.toString(),
      p.currentStock.toString(),
      formatBRL(p.sellPrice),
      formatBRL((p.currentStock * p.sellPrice)),
      status,
    ];
  });

  const totalUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
  const totalSellValue = products.reduce((acc, p) => acc + (p.currentStock * p.sellPrice), 0);

  autoTable(doc, {
    startY,
    head: [['Cód. Barras', 'Produto', 'Categoria', 'UN', 'Mín', 'Atual', 'Preço Venda', 'Valor Total', 'Status']],
    body: tableData,
    foot: [['TOTAIS', `${products.length} itens`, '', '', '', `${totalUnits} un`, '', formatBRL(totalSellValue), '']],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 26 },
      4: { halign: 'center' },
      5: { halign: 'center', fontStyle: 'bold' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
      8: { halign: 'center' },
    },
  });

  addReportFooter(doc);
  doc.save(`relatorio-estoque-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateProductsProfitReportPdf = (
  store: Store,
  items: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
    cost: number;
    estimatedGrossProfit: number;
  }[]
) => {
  const doc = new jsPDF();
  const startY = addReportHeader({
    doc,
    store,
    title: 'RELATÓRIO DE PRODUTOS E LUCRO BRUTO ESTIMADO',
    periodText: 'Histórico Acumulado',
  });

  const tableData = items.map((item) => [
    item.productName,
    `${item.quantity} un`,
    formatBRL(item.revenue),
    formatBRL(item.cost),
    formatBRL(item.estimatedGrossProfit),
    item.revenue > 0 ? `${((item.estimatedGrossProfit / item.revenue) * 100).toFixed(1)}%` : '0%',
  ]);

  const totalRevenue = items.reduce((acc, i) => acc + i.revenue, 0);
  const totalCost = items.reduce((acc, i) => acc + i.cost, 0);
  const totalProfit = items.reduce((acc, i) => acc + i.estimatedGrossProfit, 0);

  autoTable(doc, {
    startY,
    head: [['Produto', 'Qtd Vendida', 'Faturamento', 'Custo Histórico', 'LUCRO BRUTO ESTIMADO', 'Margem Bruta']],
    body: tableData,
    foot: [[
      'TOTAIS',
      `${items.reduce((acc, i) => acc + i.quantity, 0)} un`,
      formatBRL(totalRevenue),
      formatBRL(totalCost),
      formatBRL(totalProfit),
      totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '0%',
    ]],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 8.5, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'center', fontStyle: 'bold' },
    },
  });

  addReportFooter(doc);
  doc.save(`relatorio-lucro-produtos-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateReceiptPdf = (store: Store, sale: Sale) => {
  // 80mm thermal receipt format (width: 80mm, dynamic height)
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200],
  });

  const pageWidth = 80;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(store.name || store.fantasyName || 'CONVENIÊNCIA', pageWidth / 2, 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  if (store.cnpj) {
    doc.text(`CNPJ: ${formatCNPJ(store.cnpj)}`, pageWidth / 2, 12, { align: 'center' });
  }
  if (store.address) {
    doc.text(store.address, pageWidth / 2, 16, { align: 'center' });
  }
  if (store.phone) {
    doc.text(`Tel: ${formatPhone(store.phone)}`, pageWidth / 2, 20, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DOCUMENTO NÃO FISCAL', pageWidth / 2, 25, { align: 'center' });

  doc.setLineWidth(0.2);
  doc.line(4, 27, pageWidth - 4, 27);

  // Sale metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Venda: ${sale.saleNumber}`, 5, 31);
  doc.text(`Data: ${formatDateTime(sale.createdAt)}`, 5, 35);
  doc.text(`Operador: ${sale.userName}`, 5, 39);
  if (sale.origin === 'COMANDA') {
    doc.text(`Origem: Comanda ${sale.comandaNumber || ''}${sale.tableNumber ? ` | Mesa ${sale.tableNumber}` : ''}`, 5, 43);
  }

  doc.line(4, 45, pageWidth - 4, 45);

  let y = 49;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ITEM', 5, y);
  doc.text('QTD x VALOR', 42, y);
  doc.text('TOTAL', pageWidth - 5, y, { align: 'right' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  sale.items?.forEach((item) => {
    doc.text(item.productName.substring(0, 24), 5, y);
    y += 3.5;
    doc.text(`${item.quantity} x ${formatBRL(item.unitPrice)}`, 5, y);
    doc.text(formatBRL(item.subtotal), pageWidth - 5, y, { align: 'right' });
    y += 4.5;
  });

  doc.line(4, y, pageWidth - 4, y);
  y += 4;

  doc.text('Subtotal:', 5, y);
  doc.text(formatBRL(sale.subtotal), pageWidth - 5, y, { align: 'right' });
  y += 4;

  if (sale.discount > 0) {
    doc.text('Desconto:', 5, y);
    doc.text(`- ${formatBRL(sale.discount)}`, pageWidth - 5, y, { align: 'right' });
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL A PAGAR:', 5, y);
  doc.text(formatBRL(sale.total), pageWidth - 5, y, { align: 'right' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Forma de Pagto: ${sale.paymentMethod}`, 5, y);
  y += 4;

  if (sale.paymentMethod === 'DINHEIRO') {
    doc.text(`Valor Recebido: ${formatBRL(sale.amountPaid)}`, 5, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text(`Troco: ${formatBRL(sale.changeAmount)}`, 5, y);
    y += 4;
  }

  doc.line(4, y, pageWidth - 4, y);
  y += 5;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text('Agradecemos a sua preferência!', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('Volte Sempre!', pageWidth / 2, y, { align: 'center' });

  doc.save(`cupom-${sale.saleNumber}.pdf`);
};
