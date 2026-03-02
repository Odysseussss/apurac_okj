# Release Notes - Versão 0.2

A versão 0.2 introduz mudanças estruturais significativas, transformando o portal em uma ferramenta completa de gestão de apurações com suporte a mecânicas complexas.

## Novidades da Versão 0.2
- **Nova Interface com Sidebar**: Navegação intuitiva entre "Nova Apuração" e "Meu Histórico".
- **Mecânicas Avançadas**:
  - **Escalonada**: Permite definir metas e prêmios específicos por Categoria de Produto.
  - **Combo**: Permite criar conjuntos de produtos (SKUs) que, se comprados juntos, geram uma bonificação fixa.
- **Sistema de Histórico**: Salve suas apurações localmente para consulta posterior sem precisar reprocessar as planilhas.
- **Design 2.0 Enterprise**: Nova paleta de cores, cards redesenhados com sombras profundas e micro-interações aprimoradas.

## Melhorias Técnicas
- Refatoração do motor de cálculo para suportar múltiplas regras simultâneas.
- Persistência com `localStorage`.
- Extração dinâmica de categorias a partir do arquivo de produtos.
- Suporte a múltiplos códigos de produto na mesma mecânica (Combo).

## Próximos Passos (Backlog)
- [ ] Carregamento total de dados salvos do histórico (visualização completa).
- [ ] Gráficos de tendência de desempenho por RCA.
- [ ] Adicionar novas lógicas para apuração de mecânicas.