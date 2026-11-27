# Alterações do Dropzone

## Interface

- Adicionado o seletor **Enviar para** acima da área de arrastar arquivos, preparado para listar os computadores Dropzone encontrados na rede.
- Aumentada a altura da janela principal para acomodar o seletor e o restante do conteúdo.
- Criadas janelas para **Arquivos recentes** e **Configurações**, seguindo o visual do app.
- A janela de informações é reutilizada para exibir **About** ou **Check for updates**, conforme a opção escolhida no menu.
- As configurações permitem escolher o tema (sistema, claro ou escuro) e salvar a pasta preferida para recebimentos futuros.

## Rede local e pedidos de arquivo

- Adicionada em Rust a descoberta de outras instâncias do Dropzone por broadcast UDP na rede local. Dispositivos sem anúncio por 15 segundos são removidos da lista.
- Ao escolher arquivos e um computador de destino, o app envia um pedido de recebimento com o nome e o tamanho de cada arquivo.
- O computador destinatário mostra um aviso com as opções **Aceitar** e **Cancelar** e devolve a resposta ao remetente.
- O histórico registra arquivos escolhidos para envio neste computador.

## Verificação e pendências

- `cargo check` passou.
- `cargo build` passou.
- A descoberta e o fluxo de pedido/aceitação ainda precisam ser testados entre dois computadores na VM.
- A aceitação ainda não transfere os bytes do arquivo; o protocolo de transferência fica para uma próxima etapa.
- A verificação automática de atualizações ainda não está configurada.
