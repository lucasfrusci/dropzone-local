use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    net::{SocketAddr, UdpSocket},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, Manager};

const DISCOVERY_PORT: u16 = 45_827;
const ANNOUNCE_INTERVAL: Duration = Duration::from_secs(3);
const DEVICE_TIMEOUT: Duration = Duration::from_secs(15);
const DISCOVERY_EVENT: &str = "discovered-devices-changed";

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredDevice {
    pub id: String,
    pub name: String,
    pub address: String,
}

struct PeerRecord {
    device: DiscoveredDevice,
    last_seen: Instant,
}

#[derive(Default)]
pub struct DiscoveryState {
    peers: Arc<Mutex<HashMap<String, PeerRecord>>>,
    incoming_requests: Arc<Mutex<HashMap<String, PendingRequest>>>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IncomingFileRequest {
    pub request_id: String,
    pub sender_name: String,
    pub file_name: String,
    pub file_size: u64,
}

struct PendingRequest {
    request: IncomingFileRequest,
    sender: SocketAddr,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileOfferResponse {
    request_id: String,
    file_name: String,
    accepted: bool,
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum DiscoveryMessage {
    Discover {
        id: String,
    },
    Announcement {
        id: String,
        name: String,
    },
    FileOffer {
        request_id: String,
        sender_id: String,
        sender_name: String,
        file_name: String,
        file_size: u64,
    },
    OfferResponse {
        request_id: String,
        file_name: String,
        accepted: bool,
    },
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum OutgoingMessage<'a> {
    Discover {
        id: &'a str,
    },
    Announcement {
        id: &'a str,
        name: &'a str,
    },
    FileOffer {
        request_id: &'a str,
        sender_id: &'a str,
        sender_name: &'a str,
        file_name: &'a str,
        file_size: u64,
    },
    OfferResponse {
        request_id: &'a str,
        file_name: &'a str,
        accepted: bool,
    },
}

#[tauri::command]
pub fn get_discovered_devices(state: tauri::State<'_, DiscoveryState>) -> Vec<DiscoveredDevice> {
    get_devices(&state.peers)
}

#[tauri::command]
pub fn send_file_offer(
    state: tauri::State<'_, DiscoveryState>,
    target_id: String,
    file_name: String,
    file_size: u64,
) -> Result<String, String> {
    let target_ip = {
        let peers = state
            .peers
            .lock()
            .map_err(|_| "A lista de computadores está indisponível.".to_string())?;
        peers
            .get(&target_id)
            .map(|peer| peer.device.address.clone())
            .ok_or_else(|| "Esse computador não está mais conectado.".to_string())?
    };

    let target_ip = target_ip
        .parse()
        .map_err(|_| "O endereço do computador é inválido.".to_string())?;
    let destination = SocketAddr::new(target_ip, DISCOVERY_PORT);
    let request_id = format!(
        "{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|error| error.to_string())?
            .as_nanos()
    );
    let sender_id = machine_id();
    let sender_name = machine_name();
    let message = serde_json::to_vec(&OutgoingMessage::FileOffer {
        request_id: &request_id,
        sender_id: &sender_id,
        sender_name: &sender_name,
        file_name: &file_name,
        file_size,
    })
    .map_err(|error| error.to_string())?;
    let socket = UdpSocket::bind(("0.0.0.0", 0)).map_err(|error| error.to_string())?;
    socket
        .send_to(&message, destination)
        .map_err(|error| error.to_string())?;

    Ok(request_id)
}

#[tauri::command]
pub fn respond_to_file_request(
    state: tauri::State<'_, DiscoveryState>,
    request_id: String,
    accepted: bool,
) -> Result<(), String> {
    let pending = state
        .incoming_requests
        .lock()
        .map_err(|_| "A lista de solicitações está indisponível.".to_string())?
        .remove(&request_id)
        .ok_or_else(|| "Essa solicitação não está mais disponível.".to_string())?;

    let sender = SocketAddr::new(pending.sender.ip(), DISCOVERY_PORT);
    let message = serde_json::to_vec(&OutgoingMessage::OfferResponse {
        request_id: &pending.request.request_id,
        file_name: &pending.request.file_name,
        accepted,
    })
    .map_err(|error| error.to_string())?;
    let socket = UdpSocket::bind(("0.0.0.0", 0)).map_err(|error| error.to_string())?;
    socket
        .send_to(&message, sender)
        .map_err(|error| error.to_string())?;

    Ok(())
}

pub fn start(app: AppHandle, state: &DiscoveryState) {
    let peers = Arc::clone(&state.peers);
    let incoming_requests = Arc::clone(&state.incoming_requests);
    thread::spawn(move || run_discovery(app, peers, incoming_requests));
}

fn run_discovery(
    app: AppHandle,
    peers: Arc<Mutex<HashMap<String, PeerRecord>>>,
    incoming_requests: Arc<Mutex<HashMap<String, PendingRequest>>>,
) {
    let id = machine_id();
    let name = machine_name();
    let socket = match UdpSocket::bind(("0.0.0.0", DISCOVERY_PORT)) {
        Ok(socket) => socket,
        Err(error) => {
            eprintln!("Não foi possível iniciar a descoberta da rede: {error}");
            return;
        }
    };

    if let Err(error) = socket.set_broadcast(true) {
        eprintln!("Não foi possível habilitar broadcast UDP: {error}");
        return;
    }
    let _ = socket.set_read_timeout(Some(Duration::from_millis(500)));

    let mut buffer = [0_u8; 1024];
    let mut next_discovery = Instant::now();

    loop {
        if Instant::now() >= next_discovery {
            let message = serde_json::to_vec(&OutgoingMessage::Discover { id: &id });
            if let Ok(message) = message {
                let _ = socket.send_to(&message, ("255.255.255.255", DISCOVERY_PORT));
            }
            next_discovery = Instant::now() + ANNOUNCE_INTERVAL;
        }

        match socket.recv_from(&mut buffer) {
            Ok((length, sender)) => {
                let Ok(message) = serde_json::from_slice::<DiscoveryMessage>(&buffer[..length])
                else {
                    continue;
                };

                match message {
                    DiscoveryMessage::Discover { id: sender_id } if sender_id != id => {
                        announce(&socket, &sender, &id, &name);
                    }
                    DiscoveryMessage::Announcement {
                        id: sender_id,
                        name: sender_name,
                    } if sender_id != id => {
                        update_peer(&peers, sender_id, sender_name, sender);
                        let _ = app.emit(DISCOVERY_EVENT, get_devices(&peers));
                    }
                    DiscoveryMessage::FileOffer {
                        request_id,
                        sender_id,
                        sender_name,
                        file_name,
                        file_size,
                    } if sender_id != id => {
                        let request = IncomingFileRequest {
                            request_id: request_id.clone(),
                            sender_name,
                            file_name,
                            file_size,
                        };
                        let is_new = incoming_requests
                            .lock()
                            .map(|mut requests| {
                                if requests.contains_key(&request_id) {
                                    false
                                } else {
                                    requests.insert(
                                        request_id,
                                        PendingRequest {
                                            request: request.clone(),
                                            sender,
                                        },
                                    );
                                    true
                                }
                            })
                            .unwrap_or(false);

                        if is_new {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                            let _ = app.emit("incoming-file-request", request);
                        }
                    }
                    DiscoveryMessage::OfferResponse {
                        request_id,
                        file_name,
                        accepted,
                    } => {
                        let _ = app.emit(
                            "file-offer-response",
                            FileOfferResponse {
                                request_id,
                                file_name,
                                accepted,
                            },
                        );
                    }
                    _ => {}
                }
            }
            Err(error)
                if error.kind() == std::io::ErrorKind::WouldBlock
                    || error.kind() == std::io::ErrorKind::TimedOut => {}
            Err(error) => eprintln!("Erro ao ler descoberta UDP: {error}"),
        }

        if expire_peers(&peers) {
            let _ = app.emit(DISCOVERY_EVENT, get_devices(&peers));
        }
    }
}

fn announce(socket: &UdpSocket, destination: &SocketAddr, id: &str, name: &str) {
    if let Ok(message) = serde_json::to_vec(&OutgoingMessage::Announcement { id, name }) {
        let _ = socket.send_to(&message, destination);
    }
}

fn update_peer(
    peers: &Arc<Mutex<HashMap<String, PeerRecord>>>,
    id: String,
    name: String,
    sender: SocketAddr,
) {
    if let Ok(mut peers) = peers.lock() {
        peers.insert(
            id.clone(),
            PeerRecord {
                device: DiscoveredDevice {
                    id,
                    name,
                    address: sender.ip().to_string(),
                },
                last_seen: Instant::now(),
            },
        );
    }
}

fn expire_peers(peers: &Arc<Mutex<HashMap<String, PeerRecord>>>) -> bool {
    let Ok(mut peers) = peers.lock() else {
        return false;
    };
    let previous_len = peers.len();
    peers.retain(|_, peer| peer.last_seen.elapsed() < DEVICE_TIMEOUT);
    peers.len() != previous_len
}

fn get_devices(peers: &Arc<Mutex<HashMap<String, PeerRecord>>>) -> Vec<DiscoveredDevice> {
    let mut devices: Vec<_> = peers
        .lock()
        .map(|peers| peers.values().map(|peer| peer.device.clone()).collect())
        .unwrap_or_default();
    devices.sort_unstable_by(|left, right| left.name.cmp(&right.name));
    devices
}

fn machine_name() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Computador Dropzone".to_string())
}

fn machine_id() -> String {
    format!("{}-{}", machine_name(), std::process::id())
}
