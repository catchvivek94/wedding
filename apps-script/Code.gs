/* Deploy as a web app executing as the sheet owner. See SETUP-GSHEET.md. */
const SHEET_ID = '1hmqgzqWfTX95TDVx_oNQt0JDQs217eEfZZem3b1UWdM';
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function fail_(code, message) { const error = new Error(message); error.code = code; throw error; }
function links_(text) {
  return [...new Set((String(text || '').match(/https?:\/\/[^\s]+/g) || []).map(url => url.replace(/[?].*$/, '')))];
}
function revision_(row) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(row)));
}
function member_(row) {
  const urls = [...new Set(links_(row[3]).concat(links_(row[6])))];
  return {id:String(row[0]), name:String(row[1]), size:String(row[2] || ''), urls,
    ordered:String(row[4]).toLowerCase()==='yes', revision:revision_(row)};
}
function table_() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Finalized Picks');
  if (!sheet) fail_('SCHEMA', 'Finalized Picks tab was not found.');
  const rows = sheet.getRange(1,1,Math.max(sheet.getLastRow(),1),7).getDisplayValues();
  const expected = ['#','Member','Size','Finalized Link','Ordered?'];
  if (expected.some((value,i)=>rows[0][i] !== value)) fail_('SCHEMA','Sheet columns changed. No updates were made.');
  const ids = new Set();
  rows.slice(1).filter(row=>row[0] && row[1]).forEach(row=>{
    if (ids.has(row[0])) fail_('SCHEMA','Duplicate member IDs in the Sheet.');
    ids.add(row[0]);
  });
  return {sheet,rows};
}
function doGet() {
  try {
    const {rows} = table_();
    const samples = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Sample Options');
    if (!samples) fail_('SCHEMA','Sample Options tab was not found.');
    const values = samples.getRange(4,1,Math.max(samples.getLastRow()-3,1),5).getDisplayValues();
    if (values[0][1] !== 'Kurta / Style' || values[0][2] !== 'Product Link') fail_('SCHEMA','Sample columns changed.');
    return json_({ok:true, fetchedAt:new Date().toISOString(), members:rows.slice(1)
      .filter(row=>row[0] && row[1] && !/^TBD\b/i.test(row[1])).map(member_),
      samples:values.slice(1).filter(row=>row[1] && links_(row[2]).length)
        .map(row=>({brand:row[0],name:row[1],url:links_(row[2])[0]}))});
  } catch (error) { return json_({ok:false,code:error.code || 'SERVER',message:error.code ? error.message : 'Could not read the Sheet. Try again.'}); }
}
// Selections are edited in Google Sheets; the public site is read-only.
function doPost() { return json_({ok:false,code:'READ_ONLY',message:'Edit selections in the Google Sheet.'}); }
