use std::collections::HashMap;
use tauri::State;
use crate::state::AppState;
use crate::types::OutdatedInfo;
use crate::npm::hide_console;
fn parse_outdated(stdout: &str) -> HashMap<String, OutdatedInfo> {
    let mut result = HashMap::new();
    if stdout.trim().is_empty() {
        return result;
    }
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(stdout) {
        if let Some(obj) = parsed.as_object() {
            for (name, info) in obj {
                result.insert(name.clone(), OutdatedInfo {
                    current: info["current"].as_str().unwrap_or("?").to_string(),
                    wanted: info["wanted"].as_str().unwrap_or("?").to_string(),
                    latest: info["latest"].as_str().unwrap_or("?").to_string(),
                    dep_type: info["type"].as_str().unwrap_or("dependencies").to_string(),
                });
            }
        }
    }
    result
}

fn parse_ls(stdout: &str) -> HashMap<String, String> {
    let mut result = HashMap::new();
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(stdout) {
        if let Some(deps) = parsed.get("dependencies").and_then(|d| d.as_object()) {
            for (name, info) in deps {
                if let Some(ver) = info.get("version").and_then(|v| v.as_str()) {
                    result.insert(name.clone(), ver.to_string());
                }
            }
        }
    }
    result
}

#[tauri::command]
pub async fn npm_outdated(
    state: State<'_, AppState>,
) -> Result<HashMap<String, OutdatedInfo>, String> {
    let project_path = state.project_path.lock().unwrap().clone()
        .ok_or_else(|| "No project open".to_string())?;
    let npm = state.npm_cmd.lock().unwrap().clone();

    let mut cmd = tokio::process::Command::new("cmd");
    cmd.args(["/C", &npm, "outdated", "--json"]);
    cmd.current_dir(&project_path);
    hide_console(&mut cmd);
    let output = cmd.output().await
        .map_err(|e| format!("Failed to execute npm outdated: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    match serde_json::from_str::<serde_json::Value>(&stdout) {
        Ok(_) => Ok(parse_outdated(&stdout)),
        Err(_) => {
            let code = output.status.code().unwrap_or(-1);
            Err(format!("npm outdated failed (exit {}): {}", code,
                if stderr.is_empty() { &stdout } else { &stderr }))
        }
    }
}

#[tauri::command]
pub async fn npm_ls_depth0(
    state: State<'_, AppState>,
) -> Result<HashMap<String, String>, String> {
    let project_path = state.project_path.lock().unwrap().clone()
        .ok_or_else(|| "No project open".to_string())?;
    let npm = state.npm_cmd.lock().unwrap().clone();

    let mut cmd = tokio::process::Command::new("cmd");
    cmd.args(["/C", &npm, "ls", "--json", "--depth=0"]);
    cmd.current_dir(&project_path);
    hide_console(&mut cmd);
    let output = cmd.output().await
        .map_err(|e| format!("Failed to execute npm ls: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_ls(&stdout))
}

#[tauri::command]
pub async fn npm_ls_global(
    state: State<'_, AppState>,
) -> Result<HashMap<String, String>, String> {
    let npm = state.npm_cmd.lock().unwrap().clone();

    let mut cmd = tokio::process::Command::new("cmd");
    cmd.args(["/C", &npm, "ls", "-g", "--json", "--depth=0"]);
    hide_console(&mut cmd);
    let output = cmd.output().await
        .map_err(|e| format!("Failed to execute npm ls -g: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_ls(&stdout))
}

#[tauri::command]
pub async fn npm_outdated_global(
    state: State<'_, AppState>,
) -> Result<HashMap<String, OutdatedInfo>, String> {
    let npm = state.npm_cmd.lock().unwrap().clone();

    let mut cmd = tokio::process::Command::new("cmd");
    cmd.args(["/C", &npm, "outdated", "-g", "--json"]);
    hide_console(&mut cmd);
    let output = cmd.output().await
        .map_err(|e| format!("Failed to execute npm outdated -g: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    match serde_json::from_str::<serde_json::Value>(&stdout) {
        Ok(_) => Ok(parse_outdated(&stdout)),
        Err(_) => Ok(HashMap::new()),
    }
}
