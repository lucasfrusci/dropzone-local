use tauri;
use serde::{Deserialize, Serialize};

use registry::{Hive, Security, Data};

const PERSREGPATH: &str = r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize";
const ACCENTPATH: &str = r"Software\Microsoft\Windows\CurrentVersion\Themes\Accent";

#[derive(Serialize, Deserialize, Debug)]
// #[serde(untagged)] PASS THE VALUE DIRECTLY WITHOUT OBJECT, I WILL DISABLE THIS FOR NOW.
pub enum ThemeValue {
    HexValue(String),
    Mode(bool),
}

//IMPL NOT USED ANYMORE
impl ThemeValue {
    pub fn to_bool(self) -> Option<bool> {
        match self {
            ThemeValue::Mode(val) => Some(val),
            _ => None,
        }
    }

    pub fn to_string(self) -> Option<String> {
        match self {
            ThemeValue::HexValue(val) => Some(val),
            _ => None,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ThemeData {
    transparency: bool,
    app_uses_light: bool,
    accent_color: String,
}

impl ThemeData {
    // FN fetch_system COMMENTED CAUSE OTMIZED IN GET SYSTEM THEME FN.
    // pub fn fetch_system() -> Self {
    //     //OLD MODE WHEN THEMEDATA VALUES WAS RETURNED BOOLEAN AND STRING
    //     //NOW I PASSED VALUE OF THE ENUM THEMEVALUE ON THE VALUES
    //     // ThemeData {
    //     //     transparency: Self::get_system_theme("EnableTransparency", SYSREGPATH).ok().and_then(|t| t.to_bool()).unwrap_or(false),
    //     //     app_uses_light: Self::get_system_theme("AppsUseLightTheme", SYSREGPATH).ok().and_then(|t| t.to_bool()).unwrap_or(false),
    //     //     accent_color: Self::get_system_theme("AccentColor", ACCENTPATH).ok().and_then(|t| t.to_string()).unwrap_or(String::from("0078d4")),
    //     // }

    //     ThemeData {
    //         transparency: Self::get_system_theme("EnableTransparency", PERSREGPATH).unwrap_or(ThemeValue::Mode(false)),
    //         app_uses_light: Self::get_system_theme("AppsUseLightTheme", PERSREGPATH).unwrap_or(ThemeValue::Mode(false)),
    //         accent_color: Self::get_system_theme("AccentColor", ACCENTPATH).unwrap_or(ThemeValue::HexValue("0078d4".to_string())),
    //     }

    // I CHOSE RESULT WITH FALLBACK INSTEAD ONLY THEMEDATA, 
    // BECAUSE I CAN HANDLE IT WHEN CALL IT.
    fn get_system_theme() -> Result<Self, ()> {
        let (transparency_u32, light_u32) = match Hive::CurrentUser.open(PERSREGPATH, Security::Read) {
            Ok(reg) => {
                let t = match reg.value("EnableTransparency") {
                    Ok(Data::U32(val)) => val == 1,
                    _ => false,
                };

                let l = match reg.value("AppsUseLightTheme") {
                    Ok(Data::U32(val)) => val == 1,
                    _ => false,
                };
                (t, l)
            },
            Err(_) => (false, false)
        };

        let accent_string = match Hive::CurrentUser.open(ACCENTPATH, Security::Read) {
            Ok(reg) => match reg.value("AccentColor") {
                Ok(Data::U32(val)) => format!("{:06x}", val & 0xFFFFFF),
                _ => String::from("0076d4"),
            }
            Err(_) => String::from("0076d4"),
        };


        Ok(ThemeData {
            transparency: transparency_u32,
            app_uses_light: light_u32,
            accent_color: accent_string,
        })
    }

    // OLD VERSION NOT USED.
    fn get_system_theme_old(key: &str, path: &str) -> Result<ThemeValue, ()> {
        let reg = Hive::CurrentUser.open(path, Security::Read).map_err(|_| ())?;
    
        let value = reg.value(key).map_err(|_| ())?;
    
        match value {
            Data::U32(1) => Ok(ThemeValue::Mode(true)),
            Data::String(_) => Ok(ThemeValue::HexValue(value.to_string())),
            _ => Err(())
        }
    }
}

// OLD VERSION OF THE FUNCTION USED BEFORE TO GET ACCENT COLOR.
fn fetch_accent() -> Result<String, ()> {
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
    match ThemeData::get_system_theme() {
        Ok(theme) => {
            theme
        }

        Err(_) => {
            ThemeData {
                transparency: false,
                app_uses_light: false,
                accent_color: "0078d4".to_string(),
            }
        }
    }
}