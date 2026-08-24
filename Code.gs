const CONFIG = {
  section: "STE9A Canada",
  startDate: "2026-08-24",
  endDate: "2027-03-31",
  spreadsheetName: "STE9A Canada Attendance",
  lateCutoffHour: 7,
  lateCutoffMinute: 30
};

function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) || "checkin";
  const template = HtmlService.createTemplateFromFile(page === "admin" ? "Admin" : "Index");
  template.section = CONFIG.section;
  template.startDate = CONFIG.startDate;
  template.endDate = CONFIG.endDate;
  template.qrToken = (e && e.parameter && e.parameter.qr) || "";
  return template.evaluate().setTitle(CONFIG.section + " Attendance")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename(CONFIG.spreadsheetName);

  let students = ss.getSheetByName("Students");
  if (!students) students = ss.insertSheet("Students");
  students.clear();
  students.getRange(1,1,1,3).setValues([["Student ID","Student Name","Active"]]);
  students.setFrozenRows(1);

  let attendance = ss.getSheetByName("Attendance");
  if (!attendance) attendance = ss.insertSheet("Attendance");
  attendance.clear();
  attendance.getRange(1,1,1,8).setValues([[
    "Timestamp","Date","Student ID","Student Name","Status","QR Date Token","Device/Browser","Notes"
  ]]);
  attendance.setFrozenRows(1);

  let qr = ss.getSheetByName("Daily QR");
  if (!qr) qr = ss.insertSheet("Daily QR");
  qr.clear();
  qr.getRange(1,1,1,3).setValues([["Date","Daily Token","Generated"]]);
  qr.setFrozenRows(1);
  return "Setup complete.";
}

function getStudents() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Students");
  if (!sheet) return [];
  return sheet.getDataRange().getValues().slice(1)
    .filter(r => r[0] && r[1])
    .map(r => ({id:String(r[0]), name:String(r[1]), active:r[2] !== false && String(r[2]).toLowerCase() !== "false"}));
}

function getDailyToken(date) {
  const target = date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Daily QR");
  if (!sheet) throw new Error("Run setup() first.");
  const values = sheet.getDataRange().getValues();
  for (let i=1;i<values.length;i++) {
    if (String(values[i][0]) === target) return String(values[i][1]);
  }
  const token = Utilities.getUuid().replace(/-/g,"");
  sheet.appendRow([target, token, new Date()]);
  return token;
}

function getTodayQR() {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const token = getDailyToken(today);
  const base = ScriptApp.getService().getUrl();
  return {date:today, url:base + "?qr=" + encodeURIComponent(token)};
}

function checkIn(qrToken, studentId) {
  if (!qrToken || !studentId) return {ok:false, message:"Please scan today's QR code and enter your Student ID."};

  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const today = Utilities.formatDate(now, tz, "yyyy-MM-dd");

  if (today < CONFIG.startDate || today > CONFIG.endDate)
    return {ok:false, message:"Attendance is outside the school attendance period."};

  const validToken = getDailyToken(today);
  if (qrToken !== validToken)
    return {ok:false, message:"This QR code is not today's attendance QR code."};

  const student = getStudents().find(s => s.id.toLowerCase() === String(studentId).trim().toLowerCase() && s.active);
  if (!student) return {ok:false, message:"Student ID not found or inactive."};

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Attendance");
  const rows = sheet.getDataRange().getValues();
  const duplicate = rows.slice(1).some(r => String(r[1]) === today && String(r[2]).toLowerCase() === student.id.toLowerCase());
  if (duplicate) return {ok:false, duplicate:true, name:student.name, message:"Attendance has already been recorded for today."};

  const currentHour = Number(Utilities.formatDate(now, tz, "H"));
  const currentMinute = Number(Utilities.formatDate(now, tz, "m"));
  const cutoff = CONFIG.lateCutoffHour * 60 + CONFIG.lateCutoffMinute;
  const status = (currentHour * 60 + currentMinute) <= cutoff ? "Present" : "Late";

  sheet.appendRow([now,today,student.id,student.name,status,validToken,"Web",""]);
  return {
    ok:true, name:student.name, date:today,
    time:Utilities.formatDate(now,tz,"hh:mm a"), status:status
  };
}

function getAttendance(date) {
  const requested = date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Attendance");
  if (!sheet) return [];
  return sheet.getDataRange().getValues().slice(1).filter(r => String(r[1]) === requested).map(r => ({
    timestamp:r[0], date:r[1], id:String(r[2]), name:String(r[3]), status:String(r[4])
  }));
}

function getAttendanceSummary() {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const students = getStudents().filter(s=>s.active);
  const rows = getAttendance(today);
  const byId = {};
  rows.forEach(r => byId[r.id] = r.status);
  const present = rows.filter(r=>r.status==="Present").length;
  const late = rows.filter(r=>r.status==="Late").length;
  const absent = students.filter(s=>!byId[s.id]).map(s=>({id:s.id,name:s.name}));
  return {date:today,total:students.length,present,late,absent};
}
