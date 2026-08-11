use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PersistedConfig {
    pub last_project_path: Option<String>,
    pub last_mode: Option<String>,
    #[serde(default)]
    pub recent_projects: Vec<String>,
}

impl PersistedConfig {
    pub fn config_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
        let dir = app.path()
            .app_config_dir()
            .map_err(|e| format!("Cannot get config dir: {}", e))?;
        std::fs::create_dir_all(&dir)
            .map_err(|e| format!("Cannot create config dir: {}", e))?;
        Ok(dir.join("config.json"))
    }

    pub fn load(app: &tauri::AppHandle) -> Self {
        let path = match Self::config_path(app) {
            Ok(p) => p,
            Err(_) => return Self::default(),
        };
        match std::fs::read_to_string(&path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => Self::default(),
        }
    }

    pub fn save(&self, app: &tauri::AppHandle) -> Result<(), String> {
        let path = Self::config_path(app)?;
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Serialize failed: {}", e))?;
        std::fs::write(&path, content)
            .map_err(|e| format!("Write config failed: {}", e))?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NpmEnv {
    pub node_version: String,
    pub npm_version: String,
    pub npm_source: String,
    pub node_path: String,
    pub npm_path: String,
    pub global_prefix: String,
    pub global_prefix_writable: bool,
    pub version_manager: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub name: String,
    pub version: String,
    pub path: String,
    pub dep_count: usize,
    pub dev_dep_count: usize,
    pub has_lock_file: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutdatedInfo {
    pub current: String,
    pub wanted: String,
    pub latest: String,
    pub dep_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptCheck {
    pub has_scripts: bool,
    pub allowed: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct LogPayload {
    pub stream: String,
    pub text: String,
}
