# Dropzone

Dropzone é um aplicativo desktop leve para compartilhar arquivos entre computadores na mesma rede local. O projeto começou com Tauri e foi migrado para **Rust puro com [eframe](https://github.com/emilk/egui/tree/main/crates/eframe) + egui** — não há mais frontend JavaScript/React. O Windows é o alvo principal, mas a ideia é ser multiplataforma. Ainda está em fase inicial.

## Status atual

- Janela compacta e sem bordas, no estilo OneDrive, com área de drag-and-drop.
- Seleção de arquivos (botão ou arrastar/soltar) e histórico de uploads recentes.
- Descoberta de outros computadores rodando o Dropzone na rede local via UDP broadcast na porta `45827`.
- Alternância entre tema claro e escuro nas configurações.
- Interface em português (pt-BR).

O envio/recebimento real de arquivos **ainda não está implementado** — hoje os arquivos selecionados só são registrados no histórico. A descoberta por rede também ainda precisa ser validada entre dois computadores. A opção **Check for updates** é um placeholder; verificação automática de atualizações não está configurada.

## Recursos planejados

- Ícone na bandeja do sistema (tray icon) — dependência `tray-icon` já adicionada, integração ainda pendente.
- Upload a partir da área de transferência (placeholder na interface).
- Notificações nativas (`notify-rust` já adicionado).
- Recebimento de arquivos em pasta configurável (a pasta escolhida em Settings ainda não é usada).

## Estrutura do projeto

- `src/main.rs` — ponto de entrada, configuração da viewport e descoberta de rede (UDP).
- `src/ui.rs` — interface egui: home, drop zone, arquivos recentes, configurações, about e updates.

## Requisitos

- Rust toolchain (edition 2024)
- Dependências de sistema para egui/glow no seu sistema operacional

## Desenvolvimento

```sh
cargo run          # rodar em modo de desenvolvimento
cargo build        # build de debug
cargo build --release  # build otimizado
```

Atalhos de teclado na janela principal: `Ctrl+O` (selecionar arquivo), `Ctrl+U` (uploads recentes), `Ctrl+;` (settings), `Ctrl+Q` (sair).
