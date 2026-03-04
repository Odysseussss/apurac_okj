# Release Notes - Versão 0.3

A versão 0.3 traz melhorias focadas na exportação de dados retroativos e uma nova inteligência de apuração baseada em datas.

## Novidades
- **Download Total do Histórico**: O botão "Revisar Planilha" foi substituído por **"Baixar Dados"**. Agora você pode baixar o Excel consolidado de qualquer apuração salva sem precisar reprocessar os arquivos.
- **Mecânica "Não Positivados"**: Nova aba de configuração que permite premiar apenas novas positivações.
  - **Filtro Data Venda**: Define o marco temporal. Clientes com vendas antes dessa data são ignorados; clientes que compraram pela primeira vez a partir desta data são premiados.
- **Persistência de Dados Detalhados**: O histórico agora armazena os resultados completos de cada RCA, garantindo que o download seja fiel ao momento da apuração.

## Melhorias Técnicas
- Suporte a múltiplos nomes de colunas de data (Data Venda, Data, Emissão).
- Tratamento automático de datas no formato serial do Excel.
- Otimização do objeto de histórico para exportação rápida.
