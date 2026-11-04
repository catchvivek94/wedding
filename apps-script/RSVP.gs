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
  ['Households','Guests','RSVPs','Companions'].forEach(name=>{if(!sheet.getSheetByName(name))throw new Error('Missing tab: '+name);});
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
    if(action==='select')return output_({ok:true,...select_(input.guestId,input.side)});
    if(action==='profile')return output_({ok:true,...profile_(session_(input.token))});
    if(action==='save')return output_({ok:true,...save_(input)});
    if(action==='attendees'){
      admin_(input.adminToken);
      const data=data_();
      const rows=data.guests.map(g=>({id:g.id,name:g.name,householdId:g.householdId,household:data.households[g.householdId].label,days:g.days,side:g.side,response:data.responses[g.id]||null,isCompanion:false,invitedBy:''}));
      data.companions.forEach(c=>{const host=data.guests.find(g=>g.id===c.hostId);rows.push({id:c.id,name:c.name,householdId:host.householdId,household:data.households[host.householdId].label,days:host.days,side:host.side,response:{attendance:c.attendance,updatedAt:c.updatedAt},isCompanion:true,invitedBy:host.name});});
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
  const companionRows=sheet.getSheetByName('Companions')?rows_(sheet,'Companions',7):[];
  const companions=companionRows.filter(r=>r[0]&&(r[5]===true||String(r[5]).toLowerCase()==='true')&&guests.some(g=>g.id===String(r[1]))).map(r=>({id:String(r[0]),hostId:String(r[1]),name:String(r[2]),attendance:{...(valid.includes(r[3])?{day1:r[3]}:{}),...(valid.includes(r[4])?{day2:r[4]}:{})},updatedAt:r[6] instanceof Date?r[6].toISOString():String(r[6]||'')}));
  return {sheet,households,guests,responses,companions};
}
function search_(query){
  query=normal_(query);if(query.length<3)return {matches:[]};if(query.length>70)throw new Error('Please enter a shorter name.');
  const data=data_(),words=query.split(' ');
  return {matches:data.guests.filter(g=>[g.name,...g.aliases].some(name=>words.every(w=>normal_(name).includes(w)))).slice(0,6).map(g=>({id:g.id,name:g.name,household:data.households[g.householdId].label}))};
}
function signature_(value){const secret=PropertiesService.getScriptProperties().getProperty('RSVP_SECRET');if(!secret)throw new Error('Please run setupRsvp before accepting responses.');return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(value,secret)).replace(/=+$/,'');}
function select_(id,side){
  if(side!==undefined&&!['Team Vidhi','Team Vivek','Team Both'].includes(side))throw new Error('Please choose one of the three teams.');
  const lock=side!==undefined?LockService.getScriptLock():null;
  if(lock)lock.waitLock(20000);
  try{
    const data=data_(),guest=data.guests.find(g=>g.id===id);if(!guest)throw new Error('Please choose a name from the invitation list.');
    if(side!==undefined){
      const tab=data.sheet.getSheetByName('Guests');
      const matches=tab.getRange(2,1,tab.getLastRow()-1,1).getValues().map((r,index)=>({id:String(r[0]),row:index+2})).filter(r=>r.id===id);
      if(matches.length!==1)throw new Error('Please contact the hosts to check your invitation.');
      tab.getRange(matches[0].row,7,1,1).setValues([[side]]);SpreadsheetApp.flush();guest.side=side;
    }
    const session={guestId:guest.id,householdId:guest.householdId,expires:Date.now()+12*3600*1000};
    const payload=Utilities.base64EncodeWebSafe(JSON.stringify(session)).replace(/=+$/,'');
    return {token:payload+'.'+signature_(payload),...profile_(session,data)};
  }finally{if(lock)lock.releaseLock();}
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
  return {household:data.households[session.householdId].label,selectedGuest:guest.name,guests:data.guests.filter(g=>g.householdId===session.householdId).map(g=>({id:g.id,name:g.name,days:g.days,side:g.side,response:data.responses[g.id]||null,companion:data.companions.find(c=>c.hostId===g.id)||null}))};
}
function writeRows_(tab,rows,columns){
  const previous=tab.getLastRow()-1;
  if(rows.length)tab.getRange(2,1,rows.length,columns).setValues(rows);
  if(previous>rows.length)tab.getRange(rows.length+2,1,previous-rows.length,columns).clearContent();
}
function textCell_(value){return /^[=+@'-]/.test(value)?"'"+value:value;}
function save_(input){
  const session=session_(input.token),lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const data=data_(),profile=profile_(session,data),allowed=profile.guests;
    if(!Array.isArray(input.responses)||input.responses.length!==allowed.length)throw new Error('Please respond for every invited household member.');
    const seen={},changes={},companionChanges={},updatedAt=new Date().toISOString();
    input.responses.forEach(row=>{
      const guest=row&&allowed.find(g=>g.id===row.guestId);if(!guest||seen[row.guestId])throw new Error('Only your invited household members can be included.');seen[row.guestId]=true;
      const validAttendance=value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===guest.days.length&&guest.days.every(day=>['attending','not_attending','undecided'].includes(value[day]))&&Object.keys(value).every(day=>guest.days.includes(day));
      if(!validAttendance(row.attendance))throw new Error('Please select attendance for each invited day.');
      changes[row.guestId]=[row.guestId,row.attendance.day1||'',row.attendance.day2||'',updatedAt];
      // Older clients omit companion: preserve that guest's saved +1.
      if(Object.prototype.hasOwnProperty.call(row,'companion')){
        const companion=row.companion,id='p1-'+guest.id;
        if(companion===null){companionChanges[guest.id]=null;}
        else{
          if(!companion||typeof companion!=='object'||Array.isArray(companion)||typeof companion.name!=='string')throw new Error('Please enter your +1’s full name.');
          const name=companion.name.trim().replace(/\s+/g,' ');
          if(!name||name.length>120||/[\u0000-\u001f\u007f]/.test(name))throw new Error('Please enter a valid +1 name, up to 120 characters.');
          if(!validAttendance(companion.attendance))throw new Error('Please choose attendance for your +1 on each invited day.');
          companionChanges[guest.id]={id,hostId:guest.id,name,attendance:companion.attendance,updatedAt};
        }
      }
    });
    // Resolve removals and edits first, then check the final guest list for duplicates.
    const finalCompanions=data.companions.filter(c=>!Object.prototype.hasOwnProperty.call(companionChanges,c.hostId));
    Object.keys(companionChanges).forEach(id=>{if(companionChanges[id])finalCompanions.push(companionChanges[id]);});
    Object.keys(companionChanges).forEach(id=>{
      const companion=companionChanges[id];if(!companion)return;
      const name=normal_(companion.name);
      if(data.guests.some(g=>normal_(g.name)===name)||finalCompanions.some(c=>c.hostId!==id&&normal_(c.name)===name))throw new Error('That name is already on the guest list. Please use their existing invitation or check with the hosts.');
    });
    const tab=data.sheet.getSheetByName('RSVPs'),before=rows_(data.sheet,'RSVPs',4),written={};
    const rows=before.map(row=>{const id=String(row[0]);if(changes[id]){if(written[id])throw new Error('Duplicate guest IDs in the RSVP Sheet. Please contact the hosts.');written[id]=true;return changes[id];}return row;});
    Object.keys(changes).forEach(id=>{if(!written[id])rows.push(changes[id]);});
    const companionTab=data.sheet.getSheetByName('Companions');
    if(Object.keys(companionChanges).length&&!companionTab)throw new Error('The +1 guest list is not ready. Please contact the hosts.');
    const companionBefore=companionTab?rows_(data.sheet,'Companions',7).map(row=>{row[2]=textCell_(String(row[2]||''));return row;}):[],companionWritten={};
    const companionRows=companionBefore.filter(r=>r[0]).map(row=>{
      const hostId=String(row[1]);if(!Object.prototype.hasOwnProperty.call(companionChanges,hostId))return row;
      if(companionWritten[hostId])throw new Error('Duplicate +1 entries in the Sheet. Please contact the hosts.');
      companionWritten[hostId]=true;const c=companionChanges[hostId];
      return c?[c.id,c.hostId,textCell_(c.name),c.attendance.day1||'',c.attendance.day2||'',true,updatedAt]:[row[0],hostId,row[2],row[3],row[4],false,updatedAt];
    });
    Object.keys(companionChanges).forEach(hostId=>{const c=companionChanges[hostId];if(c&&!companionWritten[hostId])companionRows.push([c.id,c.hostId,textCell_(c.name),c.attendance.day1||'',c.attendance.day2||'',true,updatedAt]);});
    try{
      writeRows_(tab,rows,4);
      if(Object.keys(companionChanges).length)writeRows_(companionTab,companionRows,7);
      SpreadsheetApp.flush();
    }catch(error){
      // Best-effort restoration if one of the two Sheet writes fails.
      try{writeRows_(tab,before,4);if(companionTab&&Object.keys(companionChanges).length)writeRows_(companionTab,companionBefore,7);SpreadsheetApp.flush();}catch(_){}
      throw new Error('Your response could not be saved. Please try again.');
    }
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
