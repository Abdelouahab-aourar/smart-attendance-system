use crate::db::connect;
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use rusqlite::params;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::command;

#[command]
pub fn add_student(student_name: String, images: Vec<String>) -> Result<String, String> {
    let student_name = student_name.trim();

    if student_name.is_empty() {
        return Err("Please enter the student name".into());
    }

    if student_name.chars().count() < 6 || student_name.chars().count() > 40 {
        return Err("Please enter the real student name".into());
    }

    if images.is_empty() {
        return Err("Please upload at least one image".into());
    }

    if images.len() > 5 {
        return Err("Too many uploaded images for this student".into());
    }

    let student_images_dir = create_student_images_dir(student_name)?;
    let normalized_images: Vec<String> = images
        .into_iter()
        .enumerate()
        .map(|(index, image)| persist_image(&student_images_dir, index, image.trim()))
        .collect::<Result<_, _>>()?;

    let mut conn = connect()?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| format!("Failed to enable foreign keys: {}", error))?;

    let transaction = conn
        .transaction()
        .map_err(|error| format!("Failed to start database transaction: {}", error))?;

    transaction
        .execute(
            "INSERT INTO STUDENT (student_name) VALUES (?1)",
            params![student_name],
        )
        .map_err(|error| format!("Failed to save student: {}", error))?;

    let student_id = transaction.last_insert_rowid();

    for image_url in normalized_images {
        transaction
            .execute(
                "INSERT INTO PHOTO (student_id, image_url) VALUES (?1, ?2)",
                params![student_id, image_url],
            )
            .map_err(|error| format!("Failed to save student photo: {}", error))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("Failed to finalize student creation: {}", error))?;

    Ok(student_id.to_string())
}

fn create_student_images_dir(student_name: &str) -> Result<PathBuf, String> {
    let app_data_dir = dirs_next::data_dir()
        .ok_or_else(|| "Could not find data directory".to_string())?
        .join("smart-attendance-system")
        .join("students");

    fs::create_dir_all(&app_data_dir)
        .map_err(|error| format!("Failed to create student image root directory: {}", error))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("System clock error: {}", error))?
        .as_millis();

    let folder_name = format!(
        "{}_{}",
        sanitize_folder_name(student_name),
        timestamp
    );
    let student_dir = app_data_dir.join(folder_name);

    fs::create_dir_all(&student_dir)
        .map_err(|error| format!("Failed to create student image directory: {}", error))?;

    Ok(student_dir)
}

fn persist_image(student_dir: &Path, index: usize, image_source: &str) -> Result<String, String> {
    if image_source.is_empty() {
        return Err("Image data cannot be empty".into());
    }

    if let Some((bytes, extension)) = decode_data_url(image_source)? {
        let file_name = format!("image_{}.{}", index + 1, extension);
        let file_path = student_dir.join(file_name);

        let mut file = fs::File::create(&file_path)
            .map_err(|error| format!("Failed to create student image file: {}", error))?;
        file.write_all(&bytes)
            .map_err(|error| format!("Failed to write student image file: {}", error))?;

        return Ok(file_path.to_string_lossy().to_string());
    }

    let source_path = Path::new(image_source);
    if !source_path.exists() {
        return Err("Image source is not a valid data URL or file path".into());
    }

    let extension = source_path
        .extension()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .unwrap_or("bin");
    let file_name = format!("image_{}.{}", index + 1, extension);
    let file_path = student_dir.join(file_name);

    fs::copy(source_path, &file_path)
        .map_err(|error| format!("Failed to copy student image file: {}", error))?;

    Ok(file_path.to_string_lossy().to_string())
}

fn decode_data_url(image_source: &str) -> Result<Option<(Vec<u8>, String)>, String> {
    if !image_source.starts_with("data:") {
        return Ok(None);
    }

    let (metadata, encoded_data) = image_source
        .split_once(',')
        .ok_or_else(|| "Invalid data URL format".to_string())?;

    if !metadata.ends_with(";base64") {
        return Err("Only base64-encoded image data URLs are supported".into());
    }

    let mime_type = metadata
        .strip_prefix("data:")
        .and_then(|value| value.strip_suffix(";base64"))
        .ok_or_else(|| "Invalid data URL metadata".to_string())?;

    let extension = mime_type_to_extension(mime_type)?;
    let bytes = STANDARD
        .decode(encoded_data)
        .map_err(|error| format!("Failed to decode image data: {}", error))?;

    Ok(Some((bytes, extension.to_string())))
}

fn mime_type_to_extension(mime_type: &str) -> Result<&'static str, String> {
    match mime_type {
        "image/jpeg" | "image/jpg" => Ok("jpg"),
        "image/png" => Ok("png"),
        "image/webp" => Ok("webp"),
        "image/gif" => Ok("gif"),
        "image/bmp" => Ok("bmp"),
        "image/tiff" => Ok("tiff"),
        _ => Err(format!("Unsupported image mime type: {}", mime_type)),
    }
}

fn sanitize_folder_name(value: &str) -> String {
    let mut sanitized = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '-' || character == '_' {
                character
            } else if character.is_whitespace() {
                '_'
            } else {
                '_'
            }
        })
        .collect::<String>();

    while sanitized.contains("__") {
        sanitized = sanitized.replace("__", "_");
    }

    sanitized.trim_matches('_').to_string()
}