use std::process::{Command, Child};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use tauri::{Manager, Emitter};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri_plugin_updater::UpdaterExt;
#[tauri::command]
async fn check_for_updates(app_handle: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    if let Ok(updater) = app_handle.updater() {
        match updater.check().await {
            Ok(Some(update)) => {
                Ok(Some(serde_json::json!({
                    "version": update.version,
                    "notes": update.body.clone().unwrap_or_default(),
                    "date": update.date.map(|d| d.to_string()).unwrap_or_default()
                })))
            }
            Ok(None) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    } else {
        Err("Updater not initialized".to_string())
    }
}

#[tauri::command]
async fn install_update(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Ok(updater) = app_handle.updater() {
        match updater.check().await {
            Ok(Some(update)) => {
                update.download_and_install(|_chunk_len, _total_len| {}, || {}).await.map_err(|e| e.to_string())?;
                app_handle.restart()
            }
            Ok(None) => Err("No update available".to_string()),
            Err(e) => Err(e.to_string()),
        }
    } else {
        Err("Updater not initialized".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sidecar_child: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
    let sidecar_child_clone = sidecar_child.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![check_for_updates, install_update])
        .setup(move |app| {
            // 1. Resolve sidecar executable path based on architecture and OS
            #[cfg(target_arch = "aarch64")]
            const TARGET_ARCH: &str = "aarch64";
            #[cfg(target_arch = "x86_64")]
            const TARGET_ARCH: &str = "x86_64";

            #[cfg(target_os = "macos")]
            const TARGET_OS: &str = "apple-darwin";
            #[cfg(target_os = "windows")]
            const TARGET_OS: &str = "pc-windows-msvc";
            #[cfg(target_os = "linux")]
            const TARGET_OS: &str = "unknown-linux-gnu";

            let sidecar_name = format!("vexctx-daemon-{}-{}", TARGET_ARCH, TARGET_OS);
            
            // Try to resolve the sidecar path
            let mut final_sidecar_path = PathBuf::new();
            
            // 1. Dev mode check (looks in src-tauri/binaries/)
            if let Ok(current_dir) = std::env::current_dir() {
                let dev_path = current_dir.join("src-tauri").join("binaries").join(&sidecar_name);
                if dev_path.exists() {
                    final_sidecar_path = dev_path;
                }
            }
            
            // 2. Production mode check (looks next to the executable)
            if final_sidecar_path.as_os_str().is_empty() {
                if let Ok(exe_path) = std::env::current_exe() {
                    if let Some(exe_dir) = exe_path.parent() {
                        let prod_path = exe_dir.join("vexctx-daemon");
                        if prod_path.exists() {
                            final_sidecar_path = prod_path;
                        }
                    }
                }
            }

            println!("Using sidecar path: {:?}", final_sidecar_path);

            // Resolve log file path: ~/VEX CTX/daemon.log
            let mut log_dir = PathBuf::new();
            if let Some(home_dir) = std::env::var_os("HOME") {
                log_dir = PathBuf::from(home_dir).join("VEX CTX");
            } else if let Some(user_profile) = std::env::var_os("USERPROFILE") {
                log_dir = PathBuf::from(user_profile).join("VEX CTX");
            }
            
            let _ = std::fs::create_dir_all(&log_dir);
            let log_file_path = log_dir.join("daemon.log");
            
            let log_file = std::fs::OpenOptions::new()
                .create(true)
                .write(true)
                .append(true)
                .open(&log_file_path);

            // 2. Spawn the daemon process
            if !final_sidecar_path.as_os_str().is_empty() && final_sidecar_path.exists() {
                let mut cmd = Command::new(&final_sidecar_path);
                
                if let Ok(file) = log_file {
                    if let Ok(file_clone) = file.try_clone() {
                        cmd.stdout(std::process::Stdio::from(file));
                        cmd.stderr(std::process::Stdio::from(file_clone));
                    }
                }
                
                match cmd.spawn() {
                    Ok(child) => {
                        println!("Successfully spawned daemon sidecar. Logging to {:?}", log_file_path);
                        *sidecar_child.lock().unwrap() = Some(child);
                    }
                    Err(e) => {
                        eprintln!("Failed to spawn daemon sidecar: {}", e);
                    }
                }
            } else {
                eprintln!("Daemon sidecar binary not found!");
            }

            // 3. Configure Tray Icon and Menu
            let open_vault = MenuItem::with_id(app, "open_vault", "Open Vault", true, None::<&str>)?;
            let check_updates = MenuItem::with_id(app, "check_updates", "Check for Updates", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit VexCTX", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[
                &open_vault,
                &PredefinedMenuItem::separator(app)?,
                &check_updates,
                &PredefinedMenuItem::separator(app)?,
                &quit,
            ])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "open_vault" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "check_updates" => {
                            // Show window and tell frontend to trigger update check
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                            let _ = app.emit("manual-update-check", ());
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // 4. Background auto-update check (runs silently 3s after startup)
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(3));
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async {
                    if let Ok(updater) = app_handle.updater() {
                        match updater.check().await {
                            Ok(Some(update)) => {
                                println!("Update available: {}", update.version);
                                let payload = serde_json::json!({
                                    "version": update.version,
                                    "notes": update.body.clone().unwrap_or_default(),
                                    "date": update.date.map(|d| d.to_string()).unwrap_or_default()
                                });
                                let _ = app_handle.emit("update-available", payload);
                            }
                            Ok(None) => {
                                println!("VexCTX is up to date.");
                                let _ = app_handle.emit("update-not-available", ());
                            }
                            Err(e) => {
                                eprintln!("Update check failed (no network or not configured): {}", e);
                            }
                        }
                    }
                });
            });

            // 5. Configure Startup on Boot
            #[cfg(target_os = "macos")]
            {
                if let Ok(exe_path) = std::env::current_exe() {
                    let plist_content = format!(
                        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.velodev.vexctx</string>
    <key>ProgramArguments</key>
    <array>
        <string>{}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>"#,
                        exe_path.to_string_lossy()
                    );
                    if let Some(home_dir) = std::env::var_os("HOME") {
                        let plist_path = PathBuf::from(home_dir)
                            .join("Library")
                            .join("LaunchAgents")
                            .join("com.velodev.vexctx.plist");
                        
                        // Only write LaunchAgent in release mode to avoid dev clutter
                        if !cfg!(debug_assertions) {
                            if let Err(err) = std::fs::write(&plist_path, plist_content) {
                                eprintln!("Failed to write LaunchAgent: {:?}", err);
                            } else {
                                println!("LaunchAgent registered at: {:?}", plist_path);
                            }
                        }
                    }
                }
            }

            #[cfg(target_os = "windows")]
            {
                if let Ok(exe_path) = std::env::current_exe() {
                    // Only write run key in release mode
                    if !cfg!(debug_assertions) {
                        let cmd_str = format!(
                            "reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v VexCTX /t REG_SZ /d \"{}\" /f",
                            exe_path.to_string_lossy()
                        );
                        let _ = Command::new("cmd").args(&["/C", &cmd_str]).status();
                    }
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Prevent close, hide window instead
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |app_handle, event| {
            // Reopen main window when clicking on dock icon (macOS only)
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = event {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            // Clean up sidecar process on app exit
            if let tauri::RunEvent::Exit = event {
                if let Some(mut child) = sidecar_child_clone.lock().unwrap().take() {
                    println!("Terminating sidecar daemon...");
                    let _ = child.kill();
                }
            }
        });
}
