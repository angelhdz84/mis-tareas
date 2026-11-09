// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use tauri::{Manager, tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent}, menu::{Menu, MenuItem, PredefinedMenuItem}};
use tauri_plugin_notification::NotificationExt;

/// Devuelve la carpeta de datos de la app (Documents/MisTareas).
/// Si no existe, la crea.
fn carpeta_datos(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    // Intentar usar Documentos del usuario; si falla, usar directorio de datos de la app
    let base = dirs::document_dir()
        .or_else(|| app.path().app_data_dir().ok())
        .ok_or_else(|| "No se pudo determinar la carpeta de documentos".to_string())?;
    let carpeta = base.join("MisTareas");
    if !carpeta.exists() {
        fs::create_dir_all(&carpeta)
            .map_err(|e| format!("Error al crear carpeta de datos: {}", e))?;
    }
    // Subcarpeta para backups
    let backups = carpeta.join("backups");
    if !backups.exists() {
        let _ = fs::create_dir_all(&backups);
    }
    Ok(carpeta)
}

/// Devuelve la ruta del archivo principal de tareas.
fn ruta_tareas(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let carpeta = carpeta_datos(app)?;
    Ok(carpeta.join("mis-tareas.json"))
}

/// Lee el archivo de tareas y devuelve el contenido como String.
/// Si no existe, devuelve "[]".
#[tauri::command]
fn cargar_tareas(app: tauri::AppHandle) -> Result<String, String> {
    let ruta = ruta_tareas(&app)?;
    if !ruta.exists() {
        return Ok("[]".to_string());
    }
    fs::read_to_string(&ruta)
        .map_err(|e| format!("Error al leer tareas: {}", e))
}

/// Guarda el contenido (JSON) en el archivo de tareas.
/// Antes de sobrescribir, hace una copia de seguridad en /backups.
#[tauri::command]
fn guardar_tareas(app: tauri::AppHandle, contenido: String) -> Result<(), String> {
    let ruta = ruta_tareas(&app)?;

    // Si ya existe, hacer backup antes de sobrescribir
    if ruta.exists() {
        if let Ok(carpeta) = carpeta_datos(&app) {
            let backups_dir = carpeta.join("backups");
            let ts = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
            let backup_path = backups_dir.join(format!("mis-tareas_{}.json", ts));
            let _ = fs::copy(&ruta, &backup_path);

            // Limpiar backups antiguos: conservar los últimos 20
            if let Ok(entries) = fs::read_dir(&backups_dir) {
                let mut backups: Vec<_> = entries
                    .filter_map(|e| e.ok())
                    .filter(|e| e.path().extension().map_or(false, |ext| ext == "json"))
                    .collect();
                backups.sort_by_key(|e| {
                    e.metadata().and_then(|m| m.modified()).ok()
                });
                // Conservar los últimos 20
                let to_remove = backups.len().saturating_sub(20);
                for entry in backups.into_iter().take(to_remove) {
                    let _ = fs::remove_file(entry.path());
                }
            }
        }
    }

    fs::write(&ruta, contenido)
        .map_err(|e| format!("Error al guardar tareas: {}", e))
}

/// Crea un backup manual con un nombre descriptivo.
#[tauri::command]
fn crear_backup_manual(app: tauri::AppHandle, nombre: Option<String>) -> Result<String, String> {
    let ruta = ruta_tareas(&app)?;
    if !ruta.exists() {
        return Err("No hay tareas que respaldar todavía.".to_string());
    }
    let carpeta = carpeta_datos(&app)?;
    let backups_dir = carpeta.join("backups");
    let ts = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    let nombre_archivo = match nombre {
        Some(n) if !n.trim().is_empty() => {
            let n = n.trim().replace(|c: char| !c.is_alphanumeric() && c != '-' && c != '_', "_");
            format!("mis-tareas_{}_{}.json", n, ts)
        }
        _ => format!("mis-tareas_manual_{}.json", ts),
    };
    let backup_path = backups_dir.join(&nombre_archivo);
    fs::copy(&ruta, &backup_path)
        .map_err(|e| format!("Error al crear backup: {}", e))?;
    Ok(backup_path.to_string_lossy().to_string())
}

/// Devuelve la ruta de la carpeta de datos para mostrarla al usuario.
#[tauri::command]
fn obtener_carpeta_datos(app: tauri::AppHandle) -> Result<String, String> {
    let carpeta = carpeta_datos(&app)?;
    Ok(carpeta.to_string_lossy().to_string())
}

/// Lista los backups disponibles (nombre + tamaño + fecha).
#[tauri::command]
fn listar_backups(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let carpeta = carpeta_datos(&app)?;
    let backups_dir = carpeta.join("backups");
    if !backups_dir.exists() {
        return Ok(vec![]);
    }
    let mut lista = vec![];
    let entries = fs::read_dir(&backups_dir)
        .map_err(|e| format!("Error al leer backups: {}", e))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "json") {
            let nombre = path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
            let tam = entry.metadata().map(|m| m.len()).unwrap_or(0);
            let modificado = entry.metadata()
                .and_then(|m| m.modified())
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);
            lista.push(serde_json::json!({
                "nombre": nombre,
                "ruta": path.to_string_lossy(),
                "tamano": tam,
                "modificado": modificado,
            }));
        }
    }
    // Ordenar por fecha descendente
    lista.sort_by(|a, b| {
        let a = a["modificado"].as_i64().unwrap_or(0);
        let b = b["modificado"].as_i64().unwrap_or(0);
        b.cmp(&a)
    });
    Ok(lista)
}

/// Restaura un backup concreto (copia el backup al archivo principal).
#[tauri::command]
fn restaurar_backup(app: tauri::AppHandle, ruta_backup: String) -> Result<(), String> {
    let backup = PathBuf::from(&ruta_backup);
    if !backup.exists() {
        return Err("El archivo de backup no existe.".to_string());
    }
    let ruta = ruta_tareas(&app)?;
    // Antes de restaurar, backup del estado actual
    if ruta.exists() {
        if let Ok(carpeta) = carpeta_datos(&app) {
            let backups_dir = carpeta.join("backups");
            let ts = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
            let pre_restore = backups_dir.join(format!("mis-tareas_pre-restore_{}.json", ts));
            let _ = fs::copy(&ruta, &pre_restore);
        }
    }
    fs::copy(&backup, &ruta)
        .map_err(|e| format!("Error al restaurar backup: {}", e))?;
    Ok(())
}

/// Muestra una notificación nativa del sistema.
#[tauri::command]
fn mostrar_notificacion(app: tauri::AppHandle, titulo: String, cuerpo: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&titulo)
        .body(&cuerpo)
        .show()
        .map_err(|e| format!("Error al mostrar notificación: {}", e))
}

/// Verifica y crea el backup diario automático si no existe ya uno para hoy.
#[tauri::command]
fn backup_diario(app: tauri::AppHandle) -> Result<bool, String> {
    let ruta = ruta_tareas(&app)?;
    if !ruta.exists() {
        return Ok(false);
    }
    let carpeta = carpeta_datos(&app)?;
    let backups_dir = carpeta.join("backups");
    let hoy = chrono::Local::now().format("%Y-%m-%d").to_string();
    let patron = format!("mis-tareas_diario_{}.json", hoy);

    // Si ya existe un backup diario para hoy, no hacer nada
    let ya_existe = fs::read_dir(&backups_dir)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .any(|e| e.file_name() == patron.as_str())
        })
        .unwrap_or(false);
    if ya_existe {
        return Ok(false);
    }

    let backup_path = backups_dir.join(&patron);
    fs::copy(&ruta, &backup_path)
        .map_err(|e| format!("Error al crear backup diario: {}", e))?;

    // Limpiar backups diarios antiguos: conservar los últimos 7
    if let Ok(entries) = fs::read_dir(&backups_dir) {
        let mut diarios: Vec<_> = entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.file_name()
                    .to_string_lossy()
                    .starts_with("mis-tareas_diario_")
            })
            .collect();
        diarios.sort_by_key(|e| {
            e.metadata().and_then(|m| m.modified()).ok()
        });
        let to_remove = diarios.len().saturating_sub(7);
        for entry in diarios.into_iter().take(to_remove) {
            let _ = fs::remove_file(entry.path());
        }
    }

    Ok(true)
}

/// Abre una carpeta en el explorador de archivos del sistema.
#[tauri::command]
fn abrir_carpeta(app: tauri::AppHandle, ruta: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_path(ruta, None::<String>)
        .map_err(|e| format!("Error al abrir carpeta: {}", e))
}

fn main() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|app| {
            // Configurar icono de bandeja
            let mostrar = MenuItem::with_id(app, "mostrar", "Mostrar ventana", true, None::<&str>)?;
            let backup_item = MenuItem::with_id(app, "backup", "Crear backup ahora", true, None::<&str>)?;
            let separador = PredefinedMenuItem::separator(app)?;
            let salir = MenuItem::with_id(app, "salir", "Salir", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&mostrar, &backup_item, &separador, &salir])?;

            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Mis Tareas")
                .menu(&menu)
                .menu_on_left_click(false)
                .build(app)?;

            // Al iniciar, hacer backup diario si toca
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let _ = backup_diario(app_handle.clone());
            });

            Ok(())
        })
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "mostrar" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "backup" => {
                    let app_handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        match crear_backup_manual(app_handle.clone(), None) {
                            Ok(_) => {
                                let _ = mostrar_notificacion(
                                    app_handle,
                                    "Backup creado".to_string(),
                                    "Se ha creado un backup manual correctamente.".to_string(),
                                );
                            }
                            Err(e) => {
                                log::error!("Error al crear backup: {}", e);
                            }
                        }
                    });
                }
                "salir" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .on_window_event(|window, event| {
            // Cerrar al X minimiza a la bandeja en lugar de cerrar
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            cargar_tareas,
            guardar_tareas,
            crear_backup_manual,
            obtener_carpeta_datos,
            listar_backups,
            restaurar_backup,
            mostrar_notificacion,
            backup_diario,
            abrir_carpeta,
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación Mis Tareas");
}

#[derive(Default)]
struct AppState {}
