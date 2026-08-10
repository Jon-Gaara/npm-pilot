use std::sync::Mutex;
use crate::types::PersistedConfig;

pub struct AppState {
    pub project_path: Mutex<Option<String>>,
    pub mode: Mutex<String>,
    pub npm_cmd: Mutex<String>,
    pub config: Mutex<PersistedConfig>,
}

impl AppState {
    pub fn new(config: PersistedConfig) -> Self {
        Self {
            project_path: Mutex::new(None),
            mode: Mutex::new("local".to_string()),
            npm_cmd: Mutex::new("npm".to_string()),
            config: Mutex::new(config),
        }
    }

    pub fn get_cwd(&self) -> String {
        let mode = self.mode.lock().unwrap().clone();
        if mode == "global" {
            std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string())
        } else {
            self.project_path.lock().unwrap().clone()
                .unwrap_or_else(|| {
                    std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string())
                })
        }
    }
}
