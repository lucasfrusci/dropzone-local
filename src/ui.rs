use crate::{DEVICE_TIMEOUT, DiscoveredDevice, DiscoveryState, run_discovery};
use eframe::egui;
use std::path::PathBuf;
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

#[derive(Clone, Copy, PartialEq, Eq)]
enum Page {
    Home,
    RecentFiles,
    Settings,
    About,
    Updates,
}

struct RecentFile {
    name: String,
    path: Option<PathBuf>,
    size: u64,
}

pub(crate) struct DropzoneApp {
    available_devices: Vec<DiscoveredDevice>,
    discovery_state: Arc<DiscoveryState>,
    selected_device: Option<String>,
    send_message: String,
    is_light_mode: bool,
    page: Page,
    recent_files: Vec<RecentFile>,
    receive_folder: Option<PathBuf>,
}

impl Default for DropzoneApp {
    fn default() -> Self {
        let discovery_state = Arc::new(DiscoveryState::default());
        let state = Arc::clone(&discovery_state);
        thread::spawn(move || run_discovery(state));

        Self {
            available_devices: Vec::new(),
            discovery_state,
            selected_device: None,
            send_message: String::new(),
            is_light_mode: true,
            page: Page::Home,
            recent_files: Vec::new(),
            receive_folder: None,
        }
    }
}

impl eframe::App for DropzoneApp {
    fn ui(&mut self, root_ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        let ctx = root_ui.ctx().clone();
        self.refresh_devices();
        self.capture_dropped_files(&ctx);
        ctx.request_repaint_after(Duration::from_secs(1));

        ctx.set_visuals(if self.is_light_mode {
            egui::Visuals::light()
        } else {
            egui::Visuals::dark()
        });

        egui::Frame::central_panel(root_ui.style()).show(root_ui, |ui| {
            self.show_window_frame(ui, &ctx);
            ui.separator();
            egui::ScrollArea::vertical()
                .auto_shrink([false, false])
                .show(ui, |ui| match self.page {
                    Page::Home => self.show_home(ui, &ctx),
                    Page::RecentFiles => self.show_recent_files(ui),
                    Page::Settings => self.show_settings(ui),
                    Page::About => self.show_about(ui),
                    Page::Updates => self.show_updates(ui),
                });
        });

        self.handle_shortcuts(&ctx);
    }
}

impl DropzoneApp {
    fn show_window_frame(&mut self, ui: &mut egui::Ui, ctx: &egui::Context) {
        let titlebar_size = egui::vec2(ui.available_width(), 34.0);
        ui.allocate_ui(titlebar_size, |ui| {
            ui.horizontal(|ui| {
                ui.add_space(8.0);
                ui.label(egui::RichText::new("Dropzone").strong());

                let drag_width = (ui.available_width() - 92.0).max(8.0);
                let (_, drag_response) = ui.allocate_exact_size(
                    egui::vec2(drag_width, 30.0),
                    egui::Sense::click_and_drag(),
                );
                if drag_response.drag_started() {
                    ctx.send_viewport_cmd(egui::ViewportCommand::StartDrag);
                }

                if ui.small_button("—").clicked() {
                    ctx.send_viewport_cmd(egui::ViewportCommand::Minimized(true));
                }

                let maximized = ctx.input(|input| input.viewport().maximized.unwrap_or(false));
                if ui.small_button(if maximized { "❐" } else { "□" }).clicked() {
                    ctx.send_viewport_cmd(egui::ViewportCommand::Maximized(!maximized));
                }

                if ui.small_button("×").clicked() {
                    ctx.send_viewport_cmd(egui::ViewportCommand::Close);
                }
                ui.add_space(4.0);
            });
        });
    }

    fn show_home(&mut self, ui: &mut egui::Ui, ctx: &egui::Context) {
        ui.add_space(8.0);
        ui.heading("Dropzone");
        ui.label("Compartilhe arquivos na sua rede local");
        ui.add_space(10.0);

        ui.horizontal(|ui| {
            ui.label("Enviar para");
            let selected_text = self
                .selected_device
                .as_ref()
                .and_then(|id| {
                    self.available_devices
                        .iter()
                        .find(|device| &device.id == id)
                })
                .map(|device| device.name.clone())
                .unwrap_or_else(|| {
                    if self.available_devices.is_empty() {
                        "Nenhum computador conectado".to_owned()
                    } else {
                        "Selecione um computador".to_owned()
                    }
                });

            egui::ComboBox::from_id_salt("device-picker")
                .selected_text(selected_text)
                .show_ui(ui, |ui| {
                    for device in &self.available_devices {
                        let selected = self.selected_device.as_ref() == Some(&device.id);
                        if ui
                            .selectable_label(
                                selected,
                                format!("{} ({})", device.name, device.address),
                            )
                            .clicked()
                        {
                            self.selected_device = Some(device.id.clone());
                        }
                    }
                });
        });

        ui.add_space(10.0);
        self.show_drop_zone(ui, ctx);
        if !self.send_message.is_empty() {
            ui.add_space(6.0);
            ui.label(egui::RichText::new(&self.send_message).small());
        }

        ui.add_space(8.0);
        ui.separator();
        ui.add_space(4.0);

        let button_width = ((ui.available_width() - 8.0) / 2.0).max(80.0);
        egui::Grid::new("main-menu")
            .num_columns(2)
            .spacing(egui::vec2(8.0, 5.0))
            .show(ui, |ui| {
                if ui
                    .add_sized(
                        [button_width, 30.0],
                        egui::Button::new("Select file  ·  Ctrl+O"),
                    )
                    .clicked()
                {
                    self.select_files();
                }
                if ui
                    .add_sized(
                        [button_width, 30.0],
                        egui::Button::new("Upload from clipboard"),
                    )
                    .clicked()
                {
                    self.send_message =
                        "Envio de arquivos da área de transferência ainda não está disponível."
                            .to_owned();
                }
                ui.end_row();

                if ui
                    .add_sized(
                        [button_width, 30.0],
                        egui::Button::new("Recent uploads  ·  Ctrl+U"),
                    )
                    .clicked()
                {
                    self.page = Page::RecentFiles;
                }
                if ui
                    .add_sized(
                        [button_width, 30.0],
                        egui::Button::new("Settings  ·  Ctrl+;"),
                    )
                    .clicked()
                {
                    self.page = Page::Settings;
                }
                ui.end_row();

                if ui
                    .add_sized([button_width, 30.0], egui::Button::new("Check for updates"))
                    .clicked()
                {
                    self.page = Page::Updates;
                }
                if ui
                    .add_sized([button_width, 30.0], egui::Button::new("About Dropzone"))
                    .clicked()
                {
                    self.page = Page::About;
                }
                ui.end_row();
            });

        ui.add_space(5.0);
        if ui.button("Quit  ·  Ctrl+Q").clicked() {
            ctx.send_viewport_cmd(egui::ViewportCommand::Close);
        }
    }

    fn show_drop_zone(&mut self, ui: &mut egui::Ui, ctx: &egui::Context) {
        let width = ui.available_width().max(200.0);
        let (rect, response) =
            ui.allocate_exact_size(egui::vec2(width, 112.0), egui::Sense::hover());
        let is_dragging_file = ctx.input(|input| !input.raw.hovered_files.is_empty());
        let fill = if is_dragging_file {
            egui::Color32::from_rgba_unmultiplied(0, 120, 212, 24)
        } else if response.hovered() {
            egui::Color32::from_gray(236)
        } else if self.is_light_mode {
            egui::Color32::from_gray(244)
        } else {
            egui::Color32::from_gray(48)
        };
        let stroke = if is_dragging_file {
            egui::Color32::from_rgb(0, 120, 212)
        } else if self.is_light_mode {
            egui::Color32::from_gray(170)
        } else {
            egui::Color32::from_gray(100)
        };

        ui.painter().rect_filled(rect, 12.0, fill);
        ui.painter().rect_stroke(
            rect,
            12.0,
            egui::Stroke::new(1.5, stroke),
            egui::StrokeKind::Inside,
        );
        ui.painter().text(
            rect.center(),
            egui::Align2::CENTER_CENTER,
            if is_dragging_file {
                "Solte os arquivos aqui"
            } else {
                "Arraste arquivos aqui"
            },
            egui::FontId::proportional(14.0),
            ui.visuals().text_color(),
        );
    }

    fn show_recent_files(&mut self, ui: &mut egui::Ui) {
        self.show_back_button(ui);
        ui.add_space(8.0);
        ui.heading("Recent uploads");
        ui.label("Arquivos selecionados nesta sessão");
        ui.separator();

        if self.recent_files.is_empty() {
            ui.add_space(18.0);
            ui.label("Nenhum arquivo recente.");
            return;
        }

        egui::ScrollArea::vertical().show(ui, |ui| {
            for file in &self.recent_files {
                ui.horizontal(|ui| {
                    ui.label("▤");
                    ui.vertical(|ui| {
                        let name = ui.label(egui::RichText::new(&file.name).strong());
                        if let Some(path) = &file.path {
                            name.on_hover_text(path.display().to_string());
                        }
                        ui.label(egui::RichText::new(format_size(file.size)).small());
                    });
                });
                ui.separator();
            }
        });

        if ui.button("Clear history").clicked() {
            self.recent_files.clear();
        }
    }

    fn show_settings(&mut self, ui: &mut egui::Ui) {
        self.show_back_button(ui);
        ui.add_space(8.0);
        ui.heading("Settings");
        ui.separator();

        ui.label(egui::RichText::new("Appearance").strong());
        ui.horizontal(|ui| {
            ui.radio_value(&mut self.is_light_mode, true, "Light");
            ui.radio_value(&mut self.is_light_mode, false, "Dark");
        });

        ui.add_space(12.0);
        ui.label(egui::RichText::new("Receive folder").strong());
        ui.label(
            self.receive_folder
                .as_ref()
                .map(|path| path.display().to_string())
                .unwrap_or_else(|| "System default".to_owned()),
        );
        if ui.button("Choose folder...").clicked() {
            if let Some(folder) = rfd::FileDialog::new().pick_folder() {
                self.receive_folder = Some(folder);
            }
        }
        ui.add_space(8.0);
        ui.label(
            egui::RichText::new(
                "The receive folder will be used when file transfers are implemented.",
            )
            .small(),
        );
    }

    fn show_about(&mut self, ui: &mut egui::Ui) {
        self.show_back_button(ui);
        ui.add_space(32.0);
        ui.vertical_centered(|ui| {
            ui.heading("Dropzone");
            ui.label(format!("Version {}", env!("CARGO_PKG_VERSION")));
            ui.add_space(8.0);
            ui.label("Local network file sharing");
        });
    }

    fn show_updates(&mut self, ui: &mut egui::Ui) {
        self.show_back_button(ui);
        ui.add_space(8.0);
        ui.heading("Check for updates");
        ui.separator();
        ui.label(format!("Current version: {}", env!("CARGO_PKG_VERSION")));
        ui.add_space(8.0);
        ui.label("Automatic update checking is not configured yet.");
    }

    fn show_back_button(&mut self, ui: &mut egui::Ui) {
        if ui.button("← Back").clicked() {
            self.page = Page::Home;
        }
    }

    fn select_files(&mut self) {
        if let Some(paths) = rfd::FileDialog::new().pick_files() {
            self.add_recent_paths(paths);
        }
    }

    fn add_recent_paths(&mut self, paths: Vec<PathBuf>) {
        let count = paths.len();
        for path in paths {
            let name = path
                .file_name()
                .map(|name| name.to_string_lossy().into_owned())
                .unwrap_or_else(|| path.display().to_string());
            let size = path.metadata().map(|metadata| metadata.len()).unwrap_or(0);
            self.recent_files.insert(
                0,
                RecentFile {
                    name,
                    path: Some(path),
                    size,
                },
            );
        }
        self.recent_files.truncate(30);
        self.send_message = if self.selected_device.is_some() {
            format!("{count} arquivo(s) selecionado(s). A transferência ainda não está disponível.")
        } else {
            "Selecione um computador antes de enviar os arquivos.".to_owned()
        };
        self.page = Page::Home;
    }

    fn capture_dropped_files(&mut self, ctx: &egui::Context) {
        let dropped_files = ctx.input(|input| input.raw.dropped_files.clone());
        if dropped_files.is_empty() {
            return;
        }

        let count = dropped_files.len();
        for dropped in dropped_files {
            let path = dropped.path().to_path_buf();
            let name = path
                .file_name()
                .map(|name| name.to_string_lossy().into_owned())
                .unwrap_or_else(|| path.display().to_string());
            let size = path.metadata().map(|metadata| metadata.len()).unwrap_or(0);
            self.recent_files.insert(
                0,
                RecentFile {
                    name,
                    path: Some(path),
                    size,
                },
            );
        }
        self.recent_files.truncate(30);
        self.send_message = if self.selected_device.is_some() {
            format!("{count} arquivo(s) selecionado(s). A transferência ainda não está disponível.")
        } else {
            "Selecione um computador antes de enviar os arquivos.".to_owned()
        };
        self.page = Page::Home;
    }

    fn handle_shortcuts(&mut self, ctx: &egui::Context) {
        let (open, recent, settings, quit) = ctx.input_mut(|input| {
            let ctrl = input.modifiers.ctrl || input.modifiers.command;
            (
                ctrl && input.consume_key(egui::Modifiers::CTRL, egui::Key::O),
                ctrl && input.consume_key(egui::Modifiers::CTRL, egui::Key::U),
                ctrl && input.consume_key(egui::Modifiers::CTRL, egui::Key::Semicolon),
                ctrl && input.consume_key(egui::Modifiers::CTRL, egui::Key::Q),
            )
        });

        if open {
            self.select_files();
        }
        if recent {
            self.page = Page::RecentFiles;
        }
        if settings {
            self.page = Page::Settings;
        }
        if quit {
            ctx.send_viewport_cmd(egui::ViewportCommand::Close);
        }
    }

    fn refresh_devices(&mut self) {
        let Ok(peers) = self.discovery_state.peers.lock() else {
            return;
        };
        let now = Instant::now();
        self.available_devices = peers
            .values()
            .filter(|record| now.duration_since(record.last_seen) < DEVICE_TIMEOUT)
            .map(|record| record.device.clone())
            .collect();
        self.available_devices
            .sort_by(|left, right| left.name.cmp(&right.name));
        if self
            .selected_device
            .as_ref()
            .is_some_and(|id| !self.available_devices.iter().any(|device| &device.id == id))
        {
            self.selected_device = None;
        }
    }
}

fn format_size(size: u64) -> String {
    const KB: f64 = 1024.0;
    if size < 1024 {
        format!("{size} B")
    } else if (size as f64) < KB * KB {
        format!("{:.1} KB", size as f64 / KB)
    } else if (size as f64) < KB * KB * KB {
        format!("{:.1} MB", size as f64 / (KB * KB))
    } else {
        format!("{:.1} GB", size as f64 / (KB * KB * KB))
    }
}
