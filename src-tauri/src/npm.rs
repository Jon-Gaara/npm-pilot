use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tauri::{AppHandle, Emitter};
use crate::types::LogPayload;

pub fn find_npm_executable() -> Result<String, String> {
    for candidate in &["npm.cmd", "npm"] {
        if let Ok(path) = which::which(candidate) {
            return Ok(path.to_string_lossy().to_string());
        }
    }
    if let Ok(nvm_home) = std::env::var("NVM_HOME") {
        let p = format!(r"{}\npm.cmd", nvm_home);
        if std::path::Path::new(&p).exists() {
            return Ok(p);
        }
    }
    Err("npm not found. Please install Node.js and add it to PATH.".to_string())
}

fn should_emit(line: &str) -> bool {
    if line.trim().is_empty() { return false; }
    if line.starts_with('\r') { return false; }
    true
}

pub async fn run_npm_streamed(
    app: &AppHandle,
    npm_cmd: &str,
    cwd: &str,
    args: &[&str],
) -> Result<(), String> {
    let mut child = Command::new("cmd")
        .args(["/C", npm_cmd])
        .args(args)
        .current_dir(cwd)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .env("NO_COLOR", "1")
        .spawn()
        .map_err(|e| format!("Cannot start npm: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let app1 = app.clone();
    let out_task = tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            if should_emit(&line) {
                let _ = app1.emit("npm-log", LogPayload {
                    stream: "stdout".into(),
                    text: line,
                });
            }
        }
    });

    let app2 = app.clone();
    let err_task = tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            if should_emit(&line) {
                let _ = app2.emit("npm-log", LogPayload {
                    stream: "stderr".into(),
                    text: line,
                });
            }
        }
    });

    let _ = tokio::join!(out_task, err_task);
    let status = child.wait().await
        .map_err(|e| format!("npm process wait failed: {}", e))?;

    let _ = app.emit("npm-log", LogPayload {
        stream: "status".into(),
        text: if status.success() { "exit:0".into() } else { "exit:1".into() },
    });

    if status.success() { Ok(()) }
    else { Err("npm command failed".into()) }
}

#[allow(dead_code)]
pub async fn run_npm_json(
    npm_cmd: &str,
    cwd: &str,
    args: &[&str],
) -> Result<serde_json::Value, String> {
    let output = Command::new("cmd")
        .args(["/C", npm_cmd])
        .args(args)
        .current_dir(cwd)
        .env("NO_COLOR", "1")
        .output()
        .await
        .map_err(|e| format!("Cannot execute npm: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout)
        .map_err(|_| {
            let stderr = String::from_utf8_lossy(&output.stderr);
            format!("npm output is not valid JSON: {}", stderr)
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_emit_normal_output() {
        assert!(should_emit("added 57 packages in 3s"));
    }

    #[test]
    fn test_should_emit_error_output() {
        assert!(should_emit("npm ERR! code ERESOLVE"));
    }

    #[test]
    fn test_should_not_emit_empty_line() {
        assert!(!should_emit(""));
    }

    #[test]
    fn test_should_not_emit_whitespace() {
        assert!(!should_emit("   "));
    }

    #[test]
    fn test_should_not_emit_carriage_return() {
        assert!(!should_emit("\rProgress: 50%"));
    }
}
