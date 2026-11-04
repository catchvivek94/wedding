/** Separate Apps Script project for the private wedding RSVP Sheet. */
const RSVP_SHEET_ID = PropertiesService.getScriptProperties().getProperty('RSVP_SHEET_ID');
const RSVP_ADMIN_EMAILS = JSON.parse(PropertiesService.getScriptProperties().getProperty('RSVP_ADMIN_EMAILS') || '[]');

function setupRsvp() {
  const props=PropertiesService.getScriptProperties();
  if(!props.getProperty('RSVP_SECRET'))props.setProperty('RSVP_SECRET',Utilities.getUuid()+Utilities.getUuid());
  const id=props.getProperty('RSVP_SHEET_ID') || SpreadsheetApp.getActiveSpreadsheet()?.getId();
  if(!id)throw new Error('Set RSVP_SHEET_ID in Script Properties before setup.');
  props.setProperty('RSVP_SHEET_ID',id);
  if(!props.getProperty('RSVP_ADMIN_EMAILS'))throw new Error('Set RSVP_ADMIN_EMAILS in Script Properties before setup.');
  const sheet=SpreadsheetApp.openById(id);
  ['Households','Guests','RSVPs'].forEach(name=>{if(!sheet.getSheetByName(name))throw new Error('Missing tab: '+name);});
  console.log('RSVP connection ready. Sheet: '+sheet.getName());
}

function doGet() {return output_({ok:true,service:'Wedding RSVP',version:1});}
function doPost(e) {
  try {
    if(!e.postData||e.postData.contents.length>20000)throw new Error('Invalid request.');
    const input=JSON.parse(e.postData.contents);
    const action=input.action;
    if(action==='adminLogin')return output_({ok:true,...adminLogin_(input.username,input.password)});
    if(action==='search')return output_({ok:true,...search_(input.q)});
    if(action==='select')return output_({ok:true,...select_(input.guestId)});
    if(action==='profile')return output_({ok:true,...profile_(session_(input.token))});
    if(action==='save')return output_({ok:true,...save_(input)});
    if(action==='attendees'){
      admin_(input.adminToken);
      const data=data_();
      const rows=data.guests.map(g=>({id:g.id,name:g.name,householdId:g.householdId,household:data.households[g.householdId].label,days:g.days,side:g.side,response:data.responses[g.id]||null}));
      return output_({ok:true,guests:rows,householdCount:Object.keys(data.households).length,source:'Google Sheets',sheetUrl:'https://docs.google.com/spreadsheets/d/'+RSVP_SHEET_ID+'/edit',updatedAt:new Date().toISOString()});
    }
    throw new Error('Unknown request.');
  }catch(error){return output_({ok:false,error:error.message||'Please try again.'});}
}
function output_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function normal_(v){return String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');}
function rows_(sheet,name,columns){const tab=sheet.getSheetByName(name);if(!tab)throw new Error('The guest list is not ready.');const count=tab.getLastRow();if(count>5000)throw new Error('Guest list exceeds the configured limit.');return count>1?tab.getRange(2,1,count-1,columns).getValues():[];}
function data_(){
  const sheet=SpreadsheetApp.openById(RSVP_SHEET_ID),households={},responses={};
  rows_(sheet,'Households',3).forEach(r=>{if(r[0]&&(r[2]===true||String(r[2]).toLowerCase()==='true'))households[String(r[0])]={id:String(r[0]),label:String(r[1])};});
  const guests=rows_(sheet,'Guests',7).filter(r=>r[0]&&households[String(r[2])]).map(r=>({id:String(r[0]),name:String(r[1]),householdId:String(r[2]),days:[...(r[3]===true||String(r[3]).toLowerCase()==='true'?['day1']:[]),...(r[4]===true||String(r[4]).toLowerCase()==='true'?['day2']:[])],side:['Team Vidhi','Team Vivek','Team Both'].includes(String(r[6]||''))?String(r[6]):'',aliases:String(r[5]||'').split(',').map(normal_).filter(Boolean)}));
  const valid=['attending','not_attending','undecided'];
  rows_(sheet,'RSVPs',4).forEach(r=>{if(r[0]&&(valid.includes(r[1])||valid.includes(r[2])))responses[String(r[0])]={attendance:{...(valid.includes(r[1])?{day1:r[1]}:{}),...(valid.includes(r[2])?{day2:r[2]}:{})},updatedAt:r[3] instanceof Date?r[3].toISOString():String(r[3]||'')};});
  return {sheet,households,guests,responses};
}
function search_(query){
  query=normal_(query);if(query.length<3)return {matches:[]};if(query.length>70)throw new Error('Please enter a shorter name.');
  const data=data_(),words=query.split(' ');
  return {matches:data.guests.filter(g=>[g.name,...g.aliases].some(name=>words.every(w=>normal_(name).includes(w)))).slice(0,6).map(g=>({id:g.id,name:g.name,household:data.households[g.householdId].label}))};
}
function signature_(value){const secret=PropertiesService.getScriptProperties().getProperty('RSVP_SECRET');if(!secret)throw new Error('Please run setupRsvp before accepting responses.');return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(value,secret)).replace(/=+$/,'');}
function select_(id){
  const data=data_(),guest=data.guests.find(g=>g.id===id);if(!guest)throw new Error('Please choose a name from the invitation list.');
  const session={guestId:guest.id,householdId:guest.householdId,expires:Date.now()+12*3600*1000};
  const payload=Utilities.base64EncodeWebSafe(JSON.stringify(session)).replace(/=+$/,'');
  return {token:payload+'.'+signature_(payload),...profile_(session,data)};
}
function session_(token){
  if(typeof token!=='string'||token.length>2000)throw new Error('Please select your name again.');
  const parts=token.split('.');if(parts.length!==2||signature_(parts[0])!==parts[1])throw new Error('Please select your name again.');
  let session;try{session=JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());}catch(_){throw new Error('Please select your name again.');}
  if(!session.expires||session.expires<Date.now())throw new Error('Please select your name again.');return session;
}
function profile_(session,provided){
  const data=provided||data_(),guest=data.guests.find(g=>g.id===session.guestId&&g.householdId===session.householdId);
  if(!guest||!data.households[session.householdId])throw new Error('This invitation is no longer available. Please contact the hosts.');
  return {household:data.households[session.householdId].label,selectedGuest:guest.name,guests:data.guests.filter(g=>g.householdId===session.householdId).map(g=>({id:g.id,name:g.name,days:g.days,side:g.side,response:data.responses[g.id]||null}))};
}
function save_(input){
  const session=session_(input.token),lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const data=data_(),profile=profile_(session,data),allowed=profile.guests;
    if(!Array.isArray(input.responses)||input.responses.length!==allowed.length)throw new Error('Please respond for every invited household member.');
    const seen={},changes={};
    input.responses.forEach(row=>{
      const guest=row&&allowed.find(g=>g.id===row.guestId);if(!guest||seen[row.guestId])throw new Error('Only your invited household members can be included.');seen[row.guestId]=true;
      if(!row.attendance||typeof row.attendance!=='object'||Object.keys(row.attendance).length!==guest.days.length||guest.days.some(day=>!['attending','not_attending','undecided'].includes(row.attendance[day]))||Object.keys(row.attendance).some(day=>!guest.days.includes(day)))throw new Error('Please select attendance for each invited day.');
      changes[row.guestId]=[row.guestId,row.attendance.day1||'',row.attendance.day2||'',new Date().toISOString()];
    });
    const tab=data.sheet.getSheetByName('RSVPs'),existing=rows_(data.sheet,'RSVPs',4),written={};
    const rows=existing.map(row=>{const id=String(row[0]);if(changes[id]){if(written[id])throw new Error('Duplicate guest IDs in the RSVP Sheet. Please contact the hosts.');written[id]=true;return changes[id];}return row;});
    Object.keys(changes).forEach(id=>{if(!written[id])rows.push(changes[id]);});
    if(rows.length)tab.getRange(2,1,rows.length,4).setValues(rows);SpreadsheetApp.flush();
    return {saved:true,...profile_(session)};
  }finally{lock.releaseLock();}
}
function adminLogin_(username,password){
  username=String(username||'').trim().toLowerCase();
  const message='That username and password were not recognised.';
  if(typeof password!=='string'||password.length>200||username.length>254)throw new Error(message);
  const cache=CacheService.getScriptCache(),key='host-login-'+Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,username));
  const failures=Number(cache.get(key)||0);
  if(failures>=10)throw new Error('Please wait a minute before trying again.');
  const props=PropertiesService.getScriptProperties(),salt=props.getProperty('RSVP_ADMIN_PASSWORD_SALT'),expected=props.getProperty('RSVP_ADMIN_PASSWORD_HASH');
  if(!salt||!expected)throw new Error('Host login has not been configured yet.');
  const actual=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,salt+':'+password));
  let difference=actual.length^expected.length;
  for(let i=0;i<expected.length;i++)difference|=(actual.charCodeAt(i)||0)^expected.charCodeAt(i);
  if(!RSVP_ADMIN_EMAILS.includes(username)||difference!==0){cache.put(key,String(failures+1),60);throw new Error(message);}
  cache.remove(key);
  const payload=Utilities.base64EncodeWebSafe(JSON.stringify({role:'admin',username,expires:Date.now()+12*3600*1000})).replace(/=+$/,'');
  return {adminToken:payload+'.'+signature_(payload)};
}
function admin_(token){
  let session;
  try{session=session_(token);}catch(_){throw new Error('Please sign in to view attendees.');}
  if(session.role!=='admin'||!RSVP_ADMIN_EMAILS.includes(session.username))throw new Error('Please sign in to view attendees.');
}
