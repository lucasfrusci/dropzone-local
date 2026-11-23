// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{Manager, WebviewWindow, include_image, Emitter};
//use std::process;
use tauri_plugin_positioner::{WindowExt, Position};

use serde::{Deserialize, Serialize};

use window_vibrancy::{apply_mica, apply_acrylic, apply_blur};

mod theme;
mod network_discovery;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Appinfo {
    version: String,
    name: String,
}

#[tauri::command]
fn get_appinfo() -> Appinfo {
    Appinfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        name: env!("CARGO_PKG_NAME").to_string(),
    }
}

#[tauri::command]
fn close(window: WebviewWindow) {
    //process::exit(0);
    window.hide().unwrap();
}

#[tauri::command]
fn close_window(name: &str, app_handle: tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window(name) {
        let _ = window.hide().unwrap();
    }
}

#[tauri::command]
fn open_link_wrapper(link: &str) {
    let _ = open_link(link);
}

fn open_link(link: &str) -> Result<(), Box<dyn std::error::Error>> {
    open::that(link)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(network_discovery::DiscoveryState::default())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            network_discovery::start(
                app.handle().clone(),
                &app.state::<network_discovery::DiscoveryState>(),
            );

            let show = tauri::menu::MenuItem::with_id(app, "show", "Abrir", true, None::<&str>)?;
            let quit = tauri::menu::MenuItem::with_id(app, "quit", "Fechar", true, None::<&str>)?;

            let _icon = include_image!("./../public/tray-png/tray-icon.png");

            #[cfg(target_os = "windows")]
            {
                let main_window = app.get_webview_window("main").unwrap();
                let version = windows_version::OsVersion::current();
                // ONLY FOR WINDOWS 11, I COMMENTED FOR WINDOWS 10 AND LOWER.
                if version.major > 10 || (version.major == 10 && version.build >= 22000) {
                    apply_mica(&main_window, None).expect("Failed to apply mica effect");
                } else if version.major == 10 {
                    //apply_acrylic(&main_window, None).expect("Failed to apply blur effect");
                } else {
                    //apply_blur(&main_window, None).expect("Failed to apply blur effect");
                }
            }

            let menu = tauri::menu::Menu::with_items(
                app,
                &[
                    &show,
                    //&tauri::menu::PredefinedMenuItem::separator(app)?,
                    &quit,
                ],
            )?;

            let _tray = tauri::tray::TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .icon_as_template(true)
                .icon(_icon.clone())
                .tooltip("Datasoft Dropzone")
                .on_tray_icon_event(|tray, event| match event {
                    tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } => {
                        let app = tray.app_handle();
                        //tauri_plugin_positioner::on_tray_event(app, &event);
                        //let window = app.get_webview_window("main").unwrap();
                        //VERIFY IS MINIMIZED IF IS UNMINIMIZE, IF IS HIDE APP SHOW
                        if let Some(window) = app.get_webview_window("main") {
                            let is_min: Result<bool, _> = window.is_minimized();

                            match is_min {
                                Ok(true) => window.unminimize().unwrap(),
                                _ => {
                                    let _ = window.show().unwrap();
                                    let _ = window.set_focus().unwrap();
                                },
                            };
                        }

                        //let _ = window.move_window(Position::TrayCenter);
                        // LINE ABOVE COMMENTED CAUSE I USING OTHER WAY TO HANDLE WINDOW POSITION  THROUGH REACT.
                        // EMIT "open_window" TO EXECUTE REACT FUNCTION THAT HANDLE THE WINDOW POSITION.
                        let _ = app.emit("open_window", "Tray clicked!").unwrap();
                        
                    }
                    _ => {}
                })
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => {
                        let window = app.get_webview_window("main").unwrap();
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested {api, ..} => {
                    if window.label() == "main" {
                        let _ = api.prevent_close();
                        let _ = window.hide().unwrap();
                    }
                    
                }
                _ => {}
            }
                    
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            close,
            get_appinfo,
            close_window,
            open_link_wrapper,
            theme::get_theme,
            network_discovery::get_discovered_devices,
            network_discovery::send_file_offer,
            network_discovery::respond_to_file_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
