//! Dropzone — local file sharing built with eframe and egui.

use std::collections::HashMap;
use std::net::UdpSocket;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

mod ui;

const DISCOVERY_PORT: u16 = 45827;
const ANNOUNCE_INTERVAL: Duration = Duration::from_secs(3);
pub(crate) const DEVICE_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Clone, Debug)]
pub(crate) struct DiscoveredDevice {
    pub id: String,
    pub name: String,
    pub address: String,
}

#[derive(serde::Deserialize)]
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

#[derive(serde::Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum OutgoingMessage<'a> {
    Discover { id: &'a str },
    Announcement { id: &'a str, name: &'a str },
}

#[derive(Default)]
pub(crate) struct DiscoveryState {
    pub peers: Arc<Mutex<HashMap<String, PeerRecord>>>,
}

pub(crate) struct PeerRecord {
    pub device: DiscoveredDevice,
    pub last_seen: Instant,
}

fn machine_name() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Computador Dropzone".to_string())
}

fn machine_id() -> String {
    format!("{}-{}", machine_name(), std::process::id())
}

pub(crate) fn run_discovery(state: Arc<DiscoveryState>) {
    let id = machine_id();
    let name = machine_name();

    let socket = match UdpSocket::bind(("0.0.0.0", DISCOVERY_PORT)) {
        Ok(socket) => socket,
        Err(error) => {
            eprintln!("Failed to bind UDP socket: {error}");
            return;
        }
    };

    if socket.set_broadcast(true).is_err() {
        eprintln!("Failed to set broadcast");
    }
    let _ = socket.set_read_timeout(Some(Duration::from_millis(500)));

    let mut buffer = [0_u8; 1024];
    let mut next_announce = Instant::now();

    loop {
        if Instant::now() >= next_announce {
            if let Ok(message) = serde_json::to_vec(&OutgoingMessage::Discover { id: &id }) {
                let _ = socket.send_to(&message, ("255.255.255.255", DISCOVERY_PORT));
            }
            next_announce = Instant::now() + ANNOUNCE_INTERVAL;
        }

        match socket.recv_from(&mut buffer) {
            Ok((length, sender)) => {
                let message = match serde_json::from_slice::<DiscoveryMessage>(&buffer[..length]) {
                    Ok(message) => message,
                    Err(_) => continue,
                };

                match message {
                    DiscoveryMessage::Discover { id: sender_id } if sender_id != id => {
                        if let Ok(message) = serde_json::to_vec(&OutgoingMessage::Announcement {
                            id: &id,
                            name: &name,
                        }) {
                            let _ = socket.send_to(&message, (sender.ip(), DISCOVERY_PORT));
                        }
                    }
                    DiscoveryMessage::Announcement {
                        id: sender_id,
                        name: sender_name,
                    } if sender_id != id => {
                        let mut peers = state.peers.lock().unwrap();
                        peers.insert(
                            sender_id.clone(),
                            PeerRecord {
                                device: DiscoveredDevice {
                                    id: sender_id,
                                    name: sender_name,
                                    address: sender.ip().to_string(),
                                },
                                last_seen: Instant::now(),
                            },
                        );
                    }
                    DiscoveryMessage::FileOffer {
                        request_id,
                        sender_id,
                        sender_name,
                        file_name,
                        file_size,
                    } => {
                        let _ = (request_id, sender_id, sender_name, file_name, file_size);
                    }
                    DiscoveryMessage::OfferResponse {
                        request_id,
                        file_name,
                        accepted,
                    } => {
                        let _ = (request_id, file_name, accepted);
                    }
                    _ => {}
                }
            }
            Err(error)
                if error.kind() == std::io::ErrorKind::WouldBlock
                    || error.kind() == std::io::ErrorKind::TimedOut => {}
            Err(_) => {}
        }
    }
}

fn main() -> eframe::Result {
    let viewport = egui::ViewportBuilder::default()
        .with_title("Dropzone")
        .with_inner_size([420.0, 580.0])
        .with_min_inner_size([360.0, 480.0])
        .with_resizable(true)
        .with_decorations(false)
        .with_transparent(true);

    let options = eframe::NativeOptions {
        viewport,
        ..Default::default()
    };

    eframe::run_native(
        "Dropzone",
        options,
        Box::new(|_cc| Ok(Box::new(ui::DropzoneApp::default()))),
    )
}
