use tauri::State;
use crate::state::AppState;

/// 从 npm warn install-scripts 行中提取被拦截的包名。
/// 行格式: "npm warn install-scripts   <name>@<version> (postinstall: <cmd>)"
/// 支持 scoped 包（@scope/name@version）。
#[allow(dead_code)]
pub fn extract_blocked_package(line: &str) -> Option<String> {
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

#[tauri::command]
pub fn get_allow_scripts() -> Result<String, String> {
    let mut cmd = std::process::Command::new("npm");
    cmd.args(["config", "get", "allow-scripts", "--location=user"]);
    crate::npm::hide_console_std(&mut cmd);
    let output = cmd.output()
        .map_err(|e| format!("Failed to read npm config: {}", e))?;
    let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(value)
}

#[tauri::command]
pub fn add_allow_scripts(_state: State<'_, AppState>, pkg: String) -> Result<(), String> {
    if pkg.trim().is_empty() {
        return Err("Package name cannot be empty".into());
    }

    let mut get = std::process::Command::new("npm");
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

    let mut set = std::process::Command::new("npm");
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
    fn test_ignores_unrelated_line() {
        let line = "added 57 packages in 3s";
        assert_eq!(extract_blocked_package(line), None);
    }
}
