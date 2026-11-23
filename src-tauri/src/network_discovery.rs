use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    net::{SocketAddr, UdpSocket},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter};

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
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum DiscoveryMessage {
    Discover { id: String },
    Announcement { id: String, name: String },
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum OutgoingMessage<'a> {
    Discover { id: &'a str },
    Announcement { id: &'a str, name: &'a str },
}

#[tauri::command]
pub fn get_discovered_devices(state: tauri::State<'_, DiscoveryState>) -> Vec<DiscoveredDevice> {
    get_devices(&state.peers)
}

pub fn start(app: AppHandle, state: &DiscoveryState) {
    let peers = Arc::clone(&state.peers);
    thread::spawn(move || run_discovery(app, peers));
}

fn run_discovery(app: AppHandle, peers: Arc<Mutex<HashMap<String, PeerRecord>>>) {
    let id = format!("{}-{}", machine_name(), std::process::id());
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
