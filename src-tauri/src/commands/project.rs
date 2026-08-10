use std::path::Path;
use tauri::AppHandle;
use tauri::State;
use crate::state::AppState;
use crate::types::{ProjectInfo, PersistedConfig};

#[tauri::command]
pub async fn open_project(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<ProjectInfo, String> {
    let pkg_json_path = Path::new(&path).join("package.json");

    if !Path::new(&path).is_dir() {
        return Err("Path is not a directory".into());
    }
    if !pkg_json_path.exists() {
        return Err("NO_PACKAGE_JSON".into());
    }

    let content = std::fs::read_to_string(&pkg_json_path)
        .map_err(|e| format!("Cannot read package.json: {}", e))?;
    let pkg: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Invalid package.json: {}", e))?;

    let name = pkg["name"].as_str().unwrap_or("unnamed").to_string();
    let version = pkg["version"].as_str().unwrap_or("0.0.0").to_string();
    let dep_count = pkg["dependencies"].as_object().map_or(0, |o| o.len());
    let dev_dep_count = pkg["devDependencies"].as_object().map_or(0, |o| o.len());
    let has_lock = Path::new(&path).join("package-lock.json").exists();

    let mut config = PersistedConfig::load(&app);
    config.last_project_path = Some(path.clone());
    config.recent_projects.retain(|p| p != &path);
    config.recent_projects.insert(0, path.clone());
    config.recent_projects.truncate(10);
    config.save(&app)?;

    *state.project_path.lock().unwrap() = Some(path.clone());
    *state.config.lock().unwrap() = config;

    Ok(ProjectInfo { name, version, path, dep_count, dev_dep_count, has_lock_file: has_lock })
}

#[tauri::command]
pub async fn npm_init(
    path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let npm = state.npm_cmd.lock().unwrap().clone();
    let output = tokio::process::Command::new("cmd")
        .args(["/C", &npm, "init", "-y"])
        .current_dir(&path)
        .output()
        .await
        .map_err(|e| format!("npm init failed: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("npm init failed: {}", stderr));
    }
    Ok(())
}

#[tauri::command]
pub fn get_persisted_config(state: State<'_, AppState>) -> PersistedConfig {
    state.config.lock().unwrap().clone()
}
