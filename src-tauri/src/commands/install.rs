use tauri::AppHandle;
use tauri::State;
use crate::state::AppState;
use crate::npm;

fn validate_package_name(name: &str) -> Result<(), String> {
    if name.is_empty() { return Err("Package name cannot be empty".into()); }
    if name.len() > 214 { return Err("Package name too long (max 214 chars)".into()); }
    let valid = name.chars().all(|c| {
        c.is_ascii_lowercase() || c.is_ascii_digit()
        || matches!(c, '-' | '.' | '_' | '~' | '@' | '/')
    });
    if !valid { return Err(format!("Package name contains invalid characters: {:?}", name)); }
    if name.starts_with('.') || name.starts_with('_') {
        return Err("Package name cannot start with . or _".into());
    }
    if name.starts_with('@') {
        if !name.contains('/') { return Err("Scoped package format should be @scope/name".into()); }
        let parts: Vec<&str> = name.splitn(2, '/').collect();
        if parts.len() < 2 || parts[1].is_empty() {
            return Err("Scoped package format should be @scope/name".into());
        }
    }
    Ok(())
}

fn validate_version(version: &str) -> Result<(), String> {
    if version.is_empty() { return Ok(()); }
    let valid = version.chars().all(|c| {
        c.is_ascii_digit() || matches!(c, '.' | '-' | '+' | '^' | '~' | '>' | '=' | '<' | ' ' | 'x' | '*' | 'v')
    });
    if !valid { return Err(format!("Version contains invalid characters: {:?}", version)); }
    if version.len() > 100 { return Err("Version too long".into()); }
    Ok(())
}

#[tauri::command]
pub async fn npm_install_pkg(
    app: AppHandle,
    state: State<'_, AppState>,
    pkg_name: String,
    version: Option<String>,
    save_target: Option<String>,
    exact: Option<bool>,
) -> Result<(), String> {
    validate_package_name(&pkg_name)?;
    if let Some(ref v) = version { validate_version(v)?; }

    let spec = match &version {
        Some(v) if !v.is_empty() => format!("{}@{}", pkg_name, v),
        _ => pkg_name.clone(),
    };

    let cwd = state.get_cwd();
    let mode = state.mode.lock().unwrap().clone();
    let npm = state.npm_cmd.lock().unwrap().clone();

    let mut args: Vec<String> = vec!["install".into(), spec];
    if mode == "global" {
        args.push("-g".into());
    } else if let Some(target) = save_target {
        match target.as_str() {
            "devDependencies" => args.push("--save-dev".into()),
            "no-save" => args.push("--no-save".into()),
            _ => args.push("--save".into()),
        }
        if exact.unwrap_or(false) {
            args.push("--save-exact".into());
        }
    }

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    npm::run_npm_streamed(&app, &npm, &cwd, &arg_refs).await
}

#[tauri::command]
pub async fn npm_install_batch(
    app: AppHandle,
    state: State<'_, AppState>,
    specs: Vec<String>,
) -> Result<(), String> {
    if specs.is_empty() { return Ok(()); }

    let cwd = state.get_cwd();
    let mode = state.mode.lock().unwrap().clone();
    let npm = state.npm_cmd.lock().unwrap().clone();

    let mut args: Vec<String> = vec!["install".into()];
    args.extend(specs);
    if mode == "global" { args.push("-g".into()); }

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    npm::run_npm_streamed(&app, &npm, &cwd, &arg_refs).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_simple_name() {
        assert!(validate_package_name("react").is_ok());
    }

    #[test]
    fn test_valid_scoped_name() {
        assert!(validate_package_name("@types/react").is_ok());
    }

    #[test]
    fn test_rejects_empty_name() {
        let result = validate_package_name("");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("empty"));
    }

    #[test]
    fn test_rejects_name_starting_with_dot() {
        assert!(validate_package_name(".hidden-pkg").is_err());
    }

    #[test]
    fn test_rejects_name_starting_with_underscore() {
        assert!(validate_package_name("_internal-pkg").is_err());
    }

    #[test]
    fn test_rejects_uppercase() {
        assert!(validate_package_name("React").is_err());
    }

    #[test]
    fn test_rejects_special_chars() {
        assert!(validate_package_name("react; rm -rf /").is_err());
    }

    #[test]
    fn test_rejects_spaces() {
        assert!(validate_package_name("my package").is_err());
    }

    #[test]
    fn test_rejects_scoped_without_name() {
        assert!(validate_package_name("@scope/").is_err());
    }

    #[test]
    fn test_rejects_scoped_without_slash() {
        assert!(validate_package_name("@scope").is_err());
    }

    #[test]
    fn test_rejects_too_long() {
        let long = "a".repeat(215);
        assert!(validate_package_name(&long).is_err());
    }

    #[test]
    fn test_valid_exact_version() {
        assert!(validate_version("1.0.0").is_ok());
    }

    #[test]
    fn test_valid_range_caret() {
        assert!(validate_version("^1.0.0").is_ok());
    }

    #[test]
    fn test_valid_range_tilde() {
        assert!(validate_version("~1.0.0").is_ok());
    }

    #[test]
    fn test_valid_empty_version() {
        assert!(validate_version("").is_ok());
    }

    #[test]
    fn test_valid_wildcard() {
        assert!(validate_version("1.x").is_ok());
    }

    #[test]
    fn test_valid_comparison() {
        assert!(validate_version(">=1.0.0 <2.0.0").is_ok());
    }

    #[test]
    fn test_rejects_version_with_semicolon() {
        assert!(validate_version("1.0.0; rm -rf").is_err());
    }

    #[test]
    fn test_rejects_version_with_pipes() {
        assert!(validate_version("1.0.0 || echo hacked").is_err());
    }

    #[test]
    fn test_rejects_too_long_version() {
        let long = "1.0.0".to_string() + &"a".repeat(100);
        assert!(validate_version(&long).is_err());
    }
}
