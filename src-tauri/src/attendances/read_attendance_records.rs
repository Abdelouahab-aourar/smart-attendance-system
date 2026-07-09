use crate::db::connect;
use serde::Serialize;
use tauri::command;

#[derive(Serialize)]
pub struct AttendanceRecordDto {
    pub id: String,
    pub student_name: String,
    pub timestamp: String,
    pub confidence: i32,
    pub status: String,
}

#[command]
pub fn read_attendance_records() -> Result<Vec<AttendanceRecordDto>, String> {
    let conn = connect()?;

    let mut stmt = conn
        .prepare(
            "
            SELECT
                ar.attendance_id,
                s.student_name,
                ar.mark_time,
                ar.confidence,
                ar.status
            FROM ATTENDANCE_RECORD ar
            INNER JOIN STUDENT s
                ON ar.student_id = s.student_id
            ORDER BY ar.mark_time DESC
            ",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(AttendanceRecordDto {
                id: row.get::<_, i64>(0)?.to_string(),
                student_name: row.get(1)?,
                timestamp: row.get(2)?,
                confidence: row.get::<_, Option<i32>>(3)?.unwrap_or(0),
                status: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to query attendance: {}", e))?;

    let mut records = Vec::new();

    for row in rows {
        records.push(
            row.map_err(|e| format!("Failed to read attendance record: {}", e))?,
        );
    }

    Ok(records)
}