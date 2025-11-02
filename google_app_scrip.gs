// --- CONFIGURATION ---
const ALLOWED_SHEETS = ["Hospitals", "Schemes", "Appointments"];
const SPREADSHEET_ID = "1dK87IDzDelUkH_OWRQG6txV5LDXAYijxSJR4DJc7HhM";  

// --- API ENTRY POINT ---
function doGet(e) {
  try {
    const sheetName = e.parameter.sheet;
    if (!sheetName) return output({ error: "Missing 'sheet' parameter" }, 400);
    if (!ALLOWED_SHEETS.includes(sheetName)) return output({ error: "Sheet not allowed" }, 403);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return output({ error: "Sheet not found" }, 404);

    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const data = values.slice(1).map(r => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    });

    // Filtering
    if (sheetName === "Hospitals") {
      if (e.parameter.state) {
        const st = e.parameter.state.toLowerCase();
        return output(data.filter(d => (d.State || '').toLowerCase() === st));
      }
      if (e.parameter.district) {
        const dis = e.parameter.district.toLowerCase();
        return output(data.filter(d => (d.District || '').toLowerCase() === dis));
      }
    }

    return output(data);
  } catch (err) {
    return output({ error: err.message }, 500);
  }
}

// --- Write to Appointments Sheet ---
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("Appointments");
    sheet.appendRow([
      new Date(),
      body.name,
      body.gender,
      body.phone,
      body.dob,
      body.state,
      body.district,
      body.hospital,
      body.department,
      body.appointmentType,
      body.appointmentDate,
      body.slot
    ]);
    return output({ message: "Appointment booked successfully" });
  } catch (err) {
    return output({ error: err.message }, 500);
  }
}

function output(obj, code = 200) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
