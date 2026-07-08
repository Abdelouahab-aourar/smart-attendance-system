use crate::db::connect;
use rusqlite::params;
use serde::Serialize;
use tauri::command;

#[derive(Serialize)]
pub struct StudentRecord {
    pub student_id: String,
    pub student_name: String,
    pub created_at: String,
    pub modified_at: String,
    pub images: Vec<String>,
}

#[command]
pub fn read_students() -> Result<Vec<StudentRecord>, String> {
    let conn = connect()?;
    let mut student_statement = conn
        .prepare(
            "SELECT student_id, student_name, created_at, modified_at
             FROM STUDENT
             ORDER BY student_id ASC",
        )
        .map_err(|error| format!("Failed to prepare student query: {}", error))?;

    let student_rows = student_statement
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|error| format!("Failed to read students: {}", error))?;

    let mut students = Vec::new();

    for student_row in student_rows {
        let (student_id, student_name, created_at, modified_at) = student_row
            .map_err(|error| format!("Failed to parse student row: {}", error))?;

        let mut image_statement = conn
            .prepare(
                "SELECT image_url
                 FROM PHOTO
                 WHERE student_id = ?1
                 ORDER BY photo_id ASC",
            )
            .map_err(|error| format!("Failed to prepare image query: {}", error))?;

        let image_rows = image_statement
            .query_map(params![student_id], |row| row.get::<_, String>(0))
            .map_err(|error| format!("Failed to read student images: {}", error))?;

        let mut images = Vec::new();

        for image_row in image_rows {
            images.push(
                image_row.map_err(|error| format!("Failed to parse image row: {}", error))?,
            );
        }

        students.push(StudentRecord {
            student_id: student_id.to_string(),
            student_name,
            created_at,
            modified_at,
            images,
        });
    }

    Ok(students)
}