use tauri;
use serde::{Deserialize, Serialize};

use registry::{Hive, Security, Data};

const SYSREGPATH: &str = r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize";
const ACCENTPATH: &str = r"Software\Microsoft\Windows\CurrentVersion\Themes\Accent";

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ThemeData {
    transparency: bool,
    app_uses_light: bool,
    accent_color: String,
}

fn get_system_theme(regkey: &str) -> Result<bool, ()> {
    let regpath = Hive::CurrentUser.open(SYSREGPATH, Security::Read);

    if let Ok(key) = regpath {
        if let Ok(value) = key.value(regkey) {
            return match value {
                Data::U32(1) => Ok(true),
                _ => Err(())
            };
        }
    }
    Err(())
}

fn get_accent() -> Result<String, ()> {
    let regpath = Hive::CurrentUser.open(ACCENTPATH, Security::Read);

    if let Ok(key) = regpath {
        if let Ok(value) = key.value("AccentColor") {
            return match value {
                Data::String(_) => Ok(value.to_string()),
                _ => Err(())
            };
        }
    }
    Err(())
}

#[tauri::command]
pub fn get_theme() -> ThemeData {
    let get_transparent = get_system_theme("EnableTransparency").unwrap_or(false);
    let get_app_light = get_system_theme("AppsUseLightTheme").unwrap_or(false);
    let get_accent = get_accent().unwrap_or("0078d4".to_string());

    let data = ThemeData {
        transparency: get_transparent,
        app_uses_light: get_app_light,
        accent_color: get_accent.to_string(),
    };
    data
}