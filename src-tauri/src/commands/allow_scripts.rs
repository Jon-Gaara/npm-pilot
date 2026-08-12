use tauri::State;
use tauri::Manager;
use crate::state::AppState;
use crate::types::ScriptCheck;
use crate::npm::{hide_console, hide_console_std};

/// 从 npm warn install-scripts 行中提取被拦截的包名。
/// 行格式: "npm warn install-scripts   <name>@<version> (postinstall: <cmd>)"
/// 支持 scoped 包（@scope/name@version）。
#[allow(dead_code)]
pub fn extract_blocked_package(line: &str) -> Option<String> {
    // 只匹配真实包行（含 "(postinstall:" / "(install:" / "(preinstall:" 脚本标记），
    // 忽略 summary 行与建议行（它们没有脚本标记，会被误判为包名）。
    if !line.contains("(postinstall:") && !line.contains("(preinstall:") && !line.contains("(install:") {
        return None;
    }
    let marker = "install-scripts";
    let idx = line.find(marker)?;
    let after = &line[idx + marker.len()..];
    let spec = after.trim().split(" (").next()?;
    let vidx = spec.rfind('@')?;
    let name = &spec[..vidx];
    if name.is_empty() {
        return None;
    }
    Some(name.to_string())
}

fn get_allow_scripts_value(npm_cmd: &str) -> Result<String, String> {
    let mut cmd = std::process::Command::new(npm_cmd);
    cmd.args(["config", "get", "allow-scripts", "--location=user"]);
    hide_console_std(&mut cmd);
    let output = cmd.output()
        .map_err(|e| format!("Failed to read npm config: {}", e))?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
pub fn get_allow_scripts(state: State<'_, AppState>) -> Result<String, String> {
    let npm = state.npm_cmd.lock().unwrap().clone();
    get_allow_scripts_value(&npm)
}

fn is_allowed(pkg: &str, npm_cmd: &str) -> bool {
    let value = match get_allow_scripts_value(npm_cmd) {
        Ok(v) => v,
        Err(_) => return false,
    };
    value
        .split(',')
        .map(|s| s.trim())
        .any(|s| s == pkg)
}

async fn query_has_scripts(spec: &str) -> Result<bool, String> {
    let mut cmd = tokio::process::Command::new("cmd");
    cmd.args(["/C", "npm", "view", spec, "scripts", "--json"]);
    hide_console(&mut cmd);
    let output = cmd.output().await
        .map_err(|e| format!("Failed to query scripts: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_scripts_has_scripts(&stdout))
}

fn parse_scripts_has_scripts(stdout: &str) -> bool {
    let parsed: serde_json::Value = match serde_json::from_str(stdout) {
        Ok(v) => v,
        Err(_) => return false,
    };

    parsed
        .as_object()
        .map(|obj| {
            ["postinstall", "preinstall", "install"]
                .iter()
                .any(|k| obj.get(*k).and_then(|v| v.as_str()).map(|s| !s.is_empty()).unwrap_or(false))
        })
        .unwrap_or(false)
}

#[tauri::command]
pub async fn check_install_scripts(
    app: tauri::AppHandle,
    pkg: String,
    version: Option<String>,
) -> Result<ScriptCheck, String> {
    let state = app.state::<AppState>();
    let npm = state.npm_cmd.lock().unwrap().clone();
    let spec = match &version {
        Some(v) if !v.is_empty() => format!("{}@{}", pkg, v),
        _ => pkg.clone(),
    };

    if is_allowed(&pkg, &npm) {
        return Ok(ScriptCheck { has_scripts: true, allowed: true });
    }

    let has_scripts = {
        let cached = state.script_check_cache.lock().unwrap().get(&spec).copied();
        match cached {
            Some(v) => v,
            None => {
                let v = query_has_scripts(&spec).await.unwrap_or(false);
                state.script_check_cache.lock().unwrap().insert(spec, v);
                v
            }
        }
    };

    Ok(ScriptCheck { has_scripts, allowed: false })
}

#[tauri::command]
pub fn add_allow_scripts(state: State<'_, AppState>, pkg: String) -> Result<(), String> {
    if pkg.trim().is_empty() {
        return Err("Package name cannot be empty".into());
    }
    // 防御：只接受合法 npm 包名，拒绝建议行/畸形输入（含空格、反引号、分号等）
    let valid = pkg.chars().all(|c| {
        c.is_ascii_lowercase() || c.is_ascii_digit()
        || matches!(c, '-' | '.' | '_' | '~' | '@' | '/')
    });
    if !valid || pkg.len() > 214 {
        return Err(format!("Invalid package name: {:?}", pkg));
    }
    let npm = state.npm_cmd.lock().unwrap().clone();

    let mut get = std::process::Command::new(&npm);
    get.args(["config", "get", "allow-scripts", "--location=user"]);
    crate::npm::hide_console_std(&mut get);
    let current = get.output()
        .map_err(|e| format!("Failed to read npm config: {}", e))?;
    let current_value = String::from_utf8_lossy(&current.stdout).trim().to_string();

    let mut items: Vec<String> = current_value
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    if !items.iter().any(|i| i == &pkg) {
        items.push(pkg);
    }

    let new_value = items.join(",");

    let mut set = std::process::Command::new(&npm);
    set.args(["config", "set", &format!("allow-scripts={}", new_value), "--location=user"]);
    crate::npm::hide_console_std(&mut set);
    let set = set.output()
        .map_err(|e| format!("Failed to set npm config: {}", e))?;

    if !set.status.success() {
        let stderr = String::from_utf8_lossy(&set.stderr);
        return Err(format!("npm config set failed: {}", stderr));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_scoped_package() {
        let line = "npm warn install-scripts   @alibaba-group/open-code-review@1.9.0 (postinstall: node scripts/install.js)";
        assert_eq!(
            extract_blocked_package(line),
            Some("@alibaba-group/open-code-review".to_string())
        );
    }

    #[test]
    fn test_extract_plain_package() {
        let line = "npm warn install-scripts   opencode-ai@1.18.15 (postinstall: node ./postinstall.mjs)";
        assert_eq!(extract_blocked_package(line), Some("opencode-ai".to_string()));
    }

    #[test]
    fn test_extract_install_script() {
        let line = "npm warn install-scripts   esbuild@0.28.1 (postinstall: node install.js)";
        assert_eq!(extract_blocked_package(line), Some("esbuild".to_string()));
    }

    #[test]
    fn test_ignores_summary_line() {
        let line = "npm warn install-scripts 1 package had install scripts blocked because they are not covered by allowScripts:";
        assert_eq!(extract_blocked_package(line), None);
    }

    #[test]
    fn test_ignores_suggestion_line() {
        let line = "npm warn install-scripts Run `npm config set allow-scripts=opencode-ai --location=user` to allow them for all global installs.";
        assert_eq!(extract_blocked_package(line), None);
    }

    #[test]
    fn test_ignores_scoped_suggestion_line() {
        let line = "npm warn install-scripts Run `npm install -g --allow-scripts=@alibaba-group/open-code-review` to allow these scripts once, or `npm config set allow-scripts=@alibaba-group/open-code-review --location=user` to allow them for all global installs.";
        assert_eq!(extract_blocked_package(line), None);
    }

    #[test]
    fn test_ignores_unrelated_line() {
        let line = "added 57 packages in 3s";
        assert_eq!(extract_blocked_package(line), None);
    }

    // ─── parse_scripts_has_scripts ───

    #[test]
    fn test_scripts_with_postinstall() {
        let json = r#"{"postinstall":"node scripts/install.js"}"#;
        assert!(parse_scripts_has_scripts(json));
    }

    #[test]
    fn test_scripts_with_preinstall() {
        let json = r#"{"preinstall":"node build.js"}"#;
        assert!(parse_scripts_has_scripts(json));
    }

    #[test]
    fn test_scripts_with_install() {
        let json = r#"{"install":"node install.js"}"#;
        assert!(parse_scripts_has_scripts(json));
    }

    #[test]
    fn test_scripts_empty() {
        let json = r#"{}"#;
        assert!(!parse_scripts_has_scripts(json));
    }

    #[test]
    fn test_scripts_only_other_hooks() {
        let json = r#"{"test":"node test.js","build":"vite build"}"#;
        assert!(!parse_scripts_has_scripts(json));
    }

    #[test]
    fn test_scripts_empty_value() {
        let json = r#"{"postinstall":""}"#;
        assert!(!parse_scripts_has_scripts(json));
    }

    #[test]
    fn test_scripts_invalid_json() {
        assert!(!parse_scripts_has_scripts("not json"));
    }
}
