use tauri::State;
use crate::state::AppState;
use crate::types::NpmEnv;
use crate::npm;

#[tauri::command]
pub async fn detect_environment(state: State<'_, AppState>) -> Result<NpmEnv, String> {
    let node_version = run_cmd("node", &["--version"]).unwrap_or_default();
    let npm_path = npm::find_npm_executable().unwrap_or_default();
    let npm_version = if !npm_path.is_empty() {
        run_cmd(&npm_path, &["--version"]).unwrap_or_default()
    } else {
        String::new()
    };
    let global_prefix = if !npm_path.is_empty() {
        run_cmd(&npm_path, &["prefix", "-g"]).unwrap_or_default()
    } else {
        String::new()
    };
    let version_manager = detect_version_manager();

    if !npm_path.is_empty() {
        *state.npm_cmd.lock().unwrap() = npm_path.clone();
    }

    let node_ok = node_version.starts_with('v');
    let npm_ok = !npm_version.is_empty();
    let global_prefix_writable = if !global_prefix.is_empty() {
        test_dir_writable(&global_prefix)
    } else {
        false
    };

    Ok(NpmEnv {
        node_version: if node_ok { node_version.trim_start_matches('v').to_string() } else { String::new() },
        npm_version: if npm_ok { npm_version.trim().to_string() } else { String::new() },
        npm_source: if version_manager != "none" { version_manager.clone() } else { "PATH".into() },
        node_path: find_in_path("node").unwrap_or_default(),
        npm_path,
        global_prefix: global_prefix.trim().to_string(),
        global_prefix_writable,
        version_manager,
    })
}

fn run_cmd(cmd: &str, args: &[&str]) -> Result<String, String> {
    let output = std::process::Command::new(cmd)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to execute {}: {}", cmd, e))?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn find_in_path(name: &str) -> Option<String> {
    let paths = std::env::var("PATH").unwrap_or_default();
    for dir in paths.split(';') {
        let candidate = format!(r"{}\{}.exe", dir, name);
        if std::path::Path::new(&candidate).exists() {
            return Some(candidate);
        }
        let candidate2 = format!(r"{}\{}.cmd", dir, name);
        if std::path::Path::new(&candidate2).exists() {
            return Some(candidate2);
        }
    }
    None
}

fn detect_version_manager() -> String {
    if std::env::var("NVM_HOME").is_ok() { return "nvm-windows".into(); }
    if std::env::var("FNM_DIR").is_ok() { return "fnm".into(); }
    if std::env::var("VOLTA_HOME").is_ok() { return "volta".into(); }
    "none".into()
}

fn test_dir_writable(path: &str) -> bool {
    let test_file = std::path::Path::new(path).join(".npm-pilot-write-test");
    match std::fs::write(&test_file, b"test") {
        Ok(_) => { let _ = std::fs::remove_file(&test_file); true }
        Err(_) => false,
    }
}
