# Documentação Técnica - Portal de Apuração

## Stack Tecnológico
O projeto foi construído utilizando tecnologias modernas de desenvolvimento web focado em performance e produtividade:

- **Framework**: [React v19](https://react.dev/)
- **Ferramenta de Build**: [Vite](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Manipulação de Excel**: [SheetJS (XLSX)](https://sheetjs.com/) via integração dinâmica (CDN).

## Estrutura do Projeto (v0.2)
- `app.jsx`: Contém agora o sistema de roteamento interno (baseado em estado), a sidebar e as três lógicas de mecânicas.
- `docs/`: Central de documentação e notas de cada versão lançada.

## Lógica de Processamento v0.2
O motor de cálculo foi expandido para suportar:
1. **Escalonada**: Agregação por `category` utilizando o mapeamento de produtos.
2. **Combo**: Verificação de interseção entre os produtos comprados pelo cliente e a regra definida.

## Persistência
Utilizamos a API de `localStorage` para persistir o cabeçalho dos resultados no histórico, permitindo que o usuário acompanhe o volume de bonificações ao longo do tempo sem necessidade de backend.

## Dependências Críticas
- **SheetJS**: Carregada dinamicamente para ler os arquivos binários do Excel e converter em objetos JSON tratáveis pelo Javascript.
- **Tailwind CSS**: Utilizada para criar uma interface moderna (Glassmorphism, Dark Mode accents) compatível com os requisitos de excelência visual.

## Como Executar
1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm run dev`
3. Acesse via `localhost` (geralmente porta 5173).
