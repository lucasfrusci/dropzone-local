// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{Manager, WebviewWindow, include_image};
//use std::process;
use tauri_plugin_positioner::{WindowExt, Position};

use serde::{Deserialize, Serialize};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Serialize, Deserialize, Clone)]
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
        let _ = window.hide();
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
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let show = tauri::menu::MenuItem::with_id(app, "show", "Abrir", true, None::<&str>)?;
            let quit = tauri::menu::MenuItem::with_id(app, "quit", "Fechar", true, None::<&str>)?;

            let _icon = include_image!("./../public/tray-png/tray-icon.png");

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
                .icon(_icon)
                .tooltip("Datasoft Dropzone")
                .on_tray_icon_event(|tray, event| match event {
                    tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } => {
                        let app = tray.app_handle();
                        //tauri_plugin_positioner::on_tray_event(app, &event);
                        let window = app.get_webview_window("main").unwrap();
                        //let _ = window.move_window(Position::TrayCenter);
                        let _ = window.show();
                        let _ = window.set_focus();
                        
                        //DESATIVEI ESSE ABAIXO, POR ENQUANTO VAMOS USAR O MODO ANTIGO.
                        //let _ = app.emit("open_window", "Tray clicked!");
                        
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
        .invoke_handler(tauri::generate_handler![
            greet,
            close,
            get_appinfo,
            close_window,
            open_link_wrapper
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
