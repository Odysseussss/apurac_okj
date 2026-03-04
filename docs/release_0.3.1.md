# Release Notes - Versão 0.3.1

Esta versão refina a inteligência de apuração, transformando o "Não Positivados" em um filtro inteligente e global.

## Novidades
- **Integração Global**: O filtro de **"Data Venda"** agora atua em conjunto com todas as outras mecânicas (Metas Simples, Escalonada e Combo).
- **Interface Simplificada**: 
  - Removida a aba exclusiva de Não Positivados.
  - O campo de data agora fica no topo da seção de **Parâmetros da Campanha**, sinalizando sua natureza global.
- **Lógica de Higienização**: Se uma data for informada, o sistema exclui automaticamente da premiação qualquer cliente que já tenha comprado produtos participantes antes daquele marco temporal.

## Impacto no Fluxo
1. Defina a **Data Venda** no topo se quiser premiar apenas novas positivações.
2. Escolha sua mecânica preferida abaixo (Ex: Combo).
3. O portal garantirá que apenas atingimentos de meta em clientes "novos" (pós data) sejam contabilizados no Cash Out.

