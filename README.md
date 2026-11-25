# Dropzone

Dropzone is a lightweight desktop app for discovering other Dropzone instances on a local network and requesting file transfers between computers. It is built with Tauri 2, React, TypeScript, and Rust, with Windows as the primary target.

## Current status

The app can discover Dropzone instances on the local network and send a file offer containing the sender, file name, and size. The receiving user can accept or cancel the request, and the sender receives the decision.

The actual file data transfer is not implemented yet. Network discovery and the request flow still need to be validated between two computers. **Check for updates** is also a placeholder; automatic update checking is not configured.

## Features

- Tray app with a compact drag-and-drop window.
- Select files or drop them into the app.
- Discover other running Dropzone instances using UDP broadcast on port `45827`.
- Ask the receiving computer for permission before a transfer.
- View recently selected files.
- Choose a preferred appearance and receive folder in Settings.

The selected receive folder is saved as a preference but is not used until file receiving is implemented. Discovery requires both computers to be on a network that allows local UDP broadcast; firewall rules may affect it.

## Requirements

- Node.js and pnpm
- Rust toolchain
- The platform dependencies required by [Tauri 2](https://v2.tauri.app/start/prerequisites/)

## Development

Install the JavaScript dependencies:

```sh
pnpm install
```

Run the desktop app in development mode:

```sh
pnpm tauri dev
```

Build the frontend:

```sh
pnpm build
```

## Project layout

- `src/` — React interface and window views.
- `src-tauri/src/` — Tauri commands and Rust network discovery/request handling.
- `src-tauri/tauri.conf.json` — Tauri app and window configuration.
