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
    if(action==='emailCalendar')return output_({ok:true,...emailCalendar_(input)});
    if(action==='save')return output_({ok:true,...save_(input)});
    if(action==='saveHostRsvp')return output_({ok:true,...saveHostRsvp_(input)});
    if(action==='saveAccommodation')return output_({ok:true,...saveAccommodation_(input)});
    if(action==='saveInvitee')return output_({ok:true,...saveInvitee_(input)});
    if(action==='attendees'){
      admin_(input.adminToken);
      const data=data_();
      const rows=data.guests.map(g=>({id:g.id,name:g.name,householdId:g.householdId,household:data.households[g.householdId].label,days:g.days,side:g.side,response:data.responses[g.id]||null,isCompanion:false,invitedBy:'',editVersion:inviteeVersion_(g),rsvpVersion:rsvpVersion_(g.id,data.responses[g.id]),accommodation:g.accommodation,accommodationVersion:accommodationVersion_(g.id,g.accommodation)}));
      data.companions.forEach(c=>{const host=data.guests.find(g=>g.id===c.hostId);rows.push({id:c.id,name:c.name,householdId:host.householdId,household:data.households[host.householdId].label,days:host.days,side:host.side,response:{attendance:c.attendance,updatedAt:c.updatedAt},isCompanion:true,invitedBy:host.name,rsvpVersion:rsvpVersion_(c.id,{attendance:c.attendance,updatedAt:c.updatedAt}),accommodation:data.companionNotes[c.id]||'',accommodationVersion:accommodationVersion_(c.id,data.companionNotes[c.id]||'')});});
      rows.sort((a,b)=>a.household.localeCompare(b.household,'en',{sensitivity:'base'})||a.householdId.localeCompare(b.householdId)||a.name.localeCompare(b.name,'en',{sensitivity:'base'})||a.id.localeCompare(b.id));
      return output_({ok:true,guests:rows,households:Object.values(data.households),householdCount:Object.keys(data.households).length,source:'Google Sheets',sheetUrl:'https://docs.google.com/spreadsheets/d/'+RSVP_SHEET_ID+'/edit',updatedAt:new Date().toISOString()});
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
  const guests=rows_(sheet,'Guests',8).filter(r=>r[0]&&households[String(r[2])]).map(r=>({id:String(r[0]),name:String(r[1]),householdId:String(r[2]),days:[...(r[3]===true||String(r[3]).toLowerCase()==='true'?['day1']:[]),...(r[4]===true||String(r[4]).toLowerCase()==='true'?['day2']:[])],accommodation:String(r[7]||''),aliasesRaw:String(r[5]||''),side:['Team Vidhi','Team Vivek','Team Both'].includes(String(r[6]||''))?String(r[6]):'',aliases:String(r[5]||'').split(',').map(normal_).filter(Boolean)}));
  const valid=['attending','not_attending','undecided'];
  rows_(sheet,'RSVPs',4).forEach(r=>{if(r[0]&&(valid.includes(r[1])||valid.includes(r[2])))responses[String(r[0])]={attendance:{...(valid.includes(r[1])?{day1:r[1]}:{}),...(valid.includes(r[2])?{day2:r[2]}:{})},updatedAt:r[3] instanceof Date?r[3].toISOString():String(r[3]||'')};});
  const companionRows=sheet.getSheetByName('Companions')?rows_(sheet,'Companions',8):[];
  const companions=companionRows.filter(r=>r[0]&&(r[5]===true||String(r[5]).toLowerCase()==='true')&&guests.some(g=>g.id===String(r[1]))).map(r=>({id:String(r[0]),hostId:String(r[1]),name:String(r[2]),attendance:{...(valid.includes(r[3])?{day1:r[3]}:{}),...(valid.includes(r[4])?{day2:r[4]}:{})},updatedAt:r[6] instanceof Date?r[6].toISOString():String(r[6]||'')}));
  const companionNotes=Object.fromEntries(companionRows.filter(r=>r[0]).map(r=>[String(r[0]),String(r[7]||'')]));
  return {sheet,households,guests,responses,companions,companionNotes};
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
    const companionBefore=companionTab?rows_(data.sheet,'Companions',8).map(row=>{row[2]=textCell_(String(row[2]||''));row[7]=textCell_(String(row[7]||''));return row;}):[],companionWritten={};
    const companionRows=companionBefore.filter(r=>r[0]).map(row=>{
      const hostId=String(row[1]);if(!Object.prototype.hasOwnProperty.call(companionChanges,hostId))return row;
      if(companionWritten[hostId])throw new Error('Duplicate +1 entries in the Sheet. Please contact the hosts.');
      companionWritten[hostId]=true;const c=companionChanges[hostId];
      return c?[c.id,c.hostId,textCell_(c.name),c.attendance.day1||'',c.attendance.day2||'',true,updatedAt,row[7]||'']:[row[0],hostId,row[2],row[3],row[4],false,updatedAt,row[7]||''];
    });
    Object.keys(companionChanges).forEach(hostId=>{const c=companionChanges[hostId];if(c&&!companionWritten[hostId])companionRows.push([c.id,c.hostId,textCell_(c.name),c.attendance.day1||'',c.attendance.day2||'',true,updatedAt,'']);});
    try{
      writeRows_(tab,rows,4);
      if(Object.keys(companionChanges).length)writeRows_(companionTab,companionRows,8);
      SpreadsheetApp.flush();
    }catch(error){
      // Best-effort restoration if one of the two Sheet writes fails.
      try{writeRows_(tab,before,4);if(companionTab&&Object.keys(companionChanges).length)writeRows_(companionTab,companionBefore,8);SpreadsheetApp.flush();}catch(_){}
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

const WEDDING_CALENDAR_DAYS = [{"id": "day1", "title": "Vidhi & Vivek · Day One", "date": "20270126", "end": "20270127", "label": "26 January 2027", "schedule": "12 noon–3 PM IST · Carnival, Haldi & Mehendi\n6 PM IST · Phere & Varmala"}, {"id": "day2", "title": "Vidhi & Vivek · Day Two", "date": "20270127", "end": "20270128", "label": "27 January 2027", "schedule": "10 AM IST · Maharashtrian Wedding\n7 PM IST · Sangeet & Party"}];
const WEDDING_CALENDAR_VENUE = 'Ikshana Resort and Spa, Khandala';
const WEDDING_CALENDAR_MAP = 'https://maps.app.goo.gl/1yEEkUati3wdLUSb9';
function weddingCalendarDescription(day){return day.schedule+'\n'+WEDDING_CALENDAR_VENUE+'\nMap: '+WEDDING_CALENDAR_MAP+'\nInvitation: https://catchvivek94.github.io/wedding/invite/';}
function weddingGoogleCalendar(day){return 'https://calendar.google.com/calendar/render?'+Object.entries({action:'TEMPLATE',text:day.title,dates:day.date+'/'+day.end,ctz:'Asia/Kolkata',details:weddingCalendarDescription(day),location:WEDDING_CALENDAR_VENUE}).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');}
function weddingCombinedCalendar(){return {title:'Vidhi & Vivek · Wedding Celebrations',date:WEDDING_CALENDAR_DAYS[0].date,end:WEDDING_CALENDAR_DAYS[1].end,schedule:WEDDING_CALENDAR_DAYS.map(day=>day.label+'\n'+day.schedule).join('\n\n')};}
function weddingIcs(days){
 const escape=value=>value.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Vidhi and Vivek//Wedding//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 days.forEach(day=>lines.push('BEGIN:VEVENT','UID:wedding-2027-'+day.id+'@catchvivek94.github.io','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+day.date,'DTEND;VALUE=DATE:'+day.end,'SUMMARY:'+escape(day.title),'LOCATION:'+escape(WEDDING_CALENDAR_VENUE),'DESCRIPTION:'+escape(weddingCalendarDescription(day)),'URL:https://catchvivek94.github.io/wedding/invite/','END:VEVENT'));
 lines.push('END:VCALENDAR');
 // Fold by UTF-8 octets for calendar clients (RFC 5545).
 return lines.map(line=>{let result='',size=0;for(const ch of line){const bytes=unescape(encodeURIComponent(ch)).length;if(size+bytes>73){result+='\r\n ';size=1;}result+=ch;size+=bytes;}return result;}).join('\r\n')+'\r\n';
}

function authorizeCalendarEmail(){MailApp.getRemainingDailyQuota();}
function emailCalendar_(input){
 const session=session_(input.token),profile=profile_(session);
 if(!profile.guests.some(g=>g.response))throw new Error('Please save your RSVP first.');
 const email=String(input.email||'').trim();
 if(email.length>254||!/^([^\s@<>]+)@([^\s@<>]+)\.([^\s@<>]+)$/.test(email))throw new Error('Please enter a valid email address.');
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const props=PropertiesService.getScriptProperties(),key='CALENDAR_EMAIL_'+session.householdId,last=Number(props.getProperty(key)||0);
  if(Date.now()-last<60000)throw new Error('Please wait a minute before sending another email.');
  if(MailApp.getRemainingDailyQuota()<1)throw new Error('Email is unavailable for today. Please use the calendar buttons below.');
  const calendarUrl=weddingGoogleCalendar(weddingCombinedCalendar());
  const body="We can't wait to see you. Let's have loads of fun!\n\n"+WEDDING_CALENDAR_DAYS.map(day=>day.label+'\n'+day.schedule).join('\n\n')+'\n\nVenue: '+WEDDING_CALENDAR_VENUE+'\nMap: '+WEDDING_CALENDAR_MAP+'\n\nAdd both days to Google Calendar: '+calendarUrl+'\n\nAll times are India Standard Time (IST). Open the attached .ics file for Apple Calendar or other calendar apps.\n\nInvitation: https://catchvivek94.github.io/wedding/invite/\n\nWith love, Vidhi & Vivek';
  const htmlEscape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const htmlBody='<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efeee5;padding:24px 12px"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" background="https://catchvivek94.github.io/wedding/assets/invitation-royal-garden/garden-watercolor.png" style="width:100%;max-width:600px;background:#fcf8ef url(https://catchvivek94.github.io/wedding/assets/invitation-royal-garden/garden-watercolor.png) center/100% 100% no-repeat;border:1px solid #cfb991;border-radius:20px;overflow:hidden;font-family:Georgia,serif;color:#654b34;line-height:1.6"><tr><td background="https://catchvivek94.github.io/wedding/assets/invitation-royal-garden/garden-watercolor.png" bgcolor="#fcf8ef" align="center" style="background-image:url(https://catchvivek94.github.io/wedding/assets/invitation-royal-garden/garden-watercolor.png);background-size:100% auto;background-position:center top;background-repeat:no-repeat;padding:150px 24px 28px"><p style="margin:0 0 10px;font-size:11px;letter-spacing:3px;color:#917346">TOGETHER IS OUR FAVOURITE PLACE TO BE</p><h1 style="margin:0;font-size:42px;line-height:1.2;font-weight:normal;color:#675638">Vidhi <span style="color:#b18d53;font-style:italic">&amp;</span> Vivek</h1><p style="margin:15px 0 0;font-size:13px;letter-spacing:2px">26 &amp; 27 JANUARY 2027 · KHANDALA</p></td></tr><tr><td style="padding:0 34px 38px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fcf8ef" style="background:#fcf8ef"><tr><td align="center" style="padding:8px 0 26px;border-bottom:1px solid #d9c7a7"><p style="color:#a4834c;margin:0 0 12px;font-size:22px">❧</p><h2 style="font-size:25px;line-height:1.3;font-weight:normal;margin:0 0 14px">Let the celebrations begin!</h2><p style="font-size:16px;margin:0">We can’t wait to see you.<br>Let’s have loads of fun!</p></td></tr>{{DAYS}}<tr><td align="center" style="padding:24px 18px;background:#f0eadb;border:1px solid #d9c7a7;border-radius:12px"><p style="margin:0 0 4px;color:#947249;font-size:10px;letter-spacing:2px">THE VENUE</p><h3 style="font-size:21px;font-weight:normal;margin:0 0 3px">Ikshana Resort and Spa</h3><p style="margin:0 0 12px;font-size:14px">Khandala</p><a href="{{MAP}}" style="font-size:14px;color:#886333;text-underline-offset:3px">View venue on Google Maps</a></td></tr><tr><td align="center" style="padding:28px 0 0"><a href="{{CALENDAR}}" style="display:inline-block;border:1px solid #a98755;background:#e9d8b8;color:#654b34;border-radius:25px;padding:12px 20px;text-decoration:none;font-size:15px">Add both days to Google Calendar</a><p style="font-size:12px;color:#85745e;margin:14px 10px 20px">For Apple Calendar or iCal, open the attached calendar file.<br>Both days’ schedules are included. All times are in IST.</p><a href="https://catchvivek94.github.io/wedding/invite/" style="font-size:14px;color:#886333">Open your wedding invitation</a><p style="margin:24px 0 5px;font-style:italic;font-size:17px">With love, Vidhi &amp; Vivek</p><p style="color:#a4834c;margin:0;font-size:24px">❧</p></td></tr></table></td></tr></table></td></tr></table>'.replace('{{DAYS}}',WEDDING_CALENDAR_DAYS.map(weddingEmailDay_).join('')).replace('{{MAP}}',htmlEscape(WEDDING_CALENDAR_MAP)).replace('{{CALENDAR}}',htmlEscape(calendarUrl));
  MailApp.sendEmail({to:email,subject:'Vidhi & Vivek · Your wedding celebration details',body:body,htmlBody:htmlBody,name:'Vidhi & Vivek',attachments:[Utilities.newBlob(weddingIcs(WEDDING_CALENDAR_DAYS),'text/calendar','vidhi-vivek-wedding.ics')]});
  props.setProperty(key,String(Date.now()));return {sent:true};
 }finally{lock.releaseLock();}
}

function weddingEmailDay_(day,index){
 const events=index===0?[
 ['12 noon–3 PM IST','Carnival, Haldi & Mehendi','Fuchsia & tangerine · Light, festive Indian wear'],
 ['6 PM IST','Phere & Varmala','Royal Indian pastels · Ladies, please avoid white and ivory']
 ]:[
 ['10 AM IST','Maharashtrian Wedding','Traditional Indian or Maharashtrian attire'],
 ['7 PM IST','Sangeet & Party','Indo-Western in rich, dark shades']
 ];
 return '<tr><td style="padding:26px 0"><p style="font-size:10px;letter-spacing:2px;color:#947249;margin:0 0 7px">'+(index===0?'DAY ONE · A SPLASH OF SUNSHINE':'DAY TWO · OUR FOREVERS BEGIN')+'</p><h3 style="font-size:23px;font-weight:normal;margin:0 0 17px;color:#675638">'+day.label+'</h3>'+events.map(event=>'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border-left:2px solid #c4a26b"><tr><td style="padding:4px 0 4px 16px"><p style="font-size:12px;color:#9a7544;margin:0 0 2px">'+event[0]+'</p><p style="font-size:18px;margin:0 0 5px">'+event[1]+'</p><p style="font-size:12px;color:#85745e;margin:0;line-height:1.5">'+event[2]+'</p></td></tr></table>').join('')+'</td></tr>';
}

function inviteeVersion_(guest){return signature_(JSON.stringify([guest.id,guest.name,guest.householdId,guest.side,guest.days,guest.aliasesRaw||'',guest.accommodation||'']));}
function saveInvitee_(input){
  admin_(input.adminToken);
  const clean=value=>typeof value==='string'?value.trim().replace(/\s+/g,' '):'';
  const name=clean(input.name),side=input.side,accommodation=accommodationText_(input.accommodation);
  if(!name||name.length>120||/[\u0000-\u001f\u007f]/.test(name))throw new Error('Enter a full name, up to 120 characters.');
  if(!['Team Vidhi','Team Vivek','Team Both'].includes(side))throw new Error('Choose Vidhi’s side, Vivek’s side, or both.');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const data=data_(),editing=!!input.guestId;
    const id=editing?input.guestId:'g-portal-'+String(input.requestId||'');
    if(!editing&&!/^[a-f0-9-]{36}$/i.test(input.requestId||''))throw new Error('Please reopen Add invitee and try again.');
    const existing=data.guests.find(g=>g.id===id);
    if(editing&&(!existing||input.editVersion!==inviteeVersion_(existing)))throw new Error('This entry changed. Close this form, refresh, and try again.');
    if(!editing&&existing){if(existing.name!==name||existing.side!==side)throw new Error('This invitee was already added. Close this form and edit their existing entry.');return {saved:true,guestId:existing.id,name:existing.name};}
    let householdId=clean(input.householdId),householdName=clean(input.householdName)||name,newHousehold=false;
    if(householdId){if(!data.households[householdId])throw new Error('That household is no longer active. Please choose another.');}
    else{
      if(householdName.length>120||/[\u0000-\u001f\u007f]/.test(householdName))throw new Error('Enter a household name, up to 120 characters.');
      const matches=Object.values(data.households).filter(h=>normal_(h.label)===normal_(householdName));
      if(matches.length>1)throw new Error('Choose the existing household from the list.');
      householdId=matches[0]?.id||'hh-portal-'+Utilities.getUuid();newHousehold=!matches.length;
    }
    if(data.guests.some(g=>g.id!==id&&g.householdId===householdId&&normal_(g.name)===normal_(name)))throw new Error('That name is already in this household. Please edit their existing entry.');
    if(data.companions.some(c=>normal_(c.name)===normal_(name)))throw new Error('This person is already listed as a +1. Remove their +1 entry before adding a separate invitation.');
    const tab=data.sheet.getSheetByName('Guests'),all=rows_(data.sheet,'Guests',8),matches=all.map((r,i)=>({row:i+2,id:String(r[0])})).filter(r=>r.id===id);
    if(editing&&matches.length!==1)throw new Error('Duplicate or missing guest ID. Please check the Sheet.');
    if(all.length>=4998)throw new Error('The guest list is full. Please contact the hosts.');
    const lastGuestRow=all.reduce((last,r,i)=>(r[0]||r[1]||r[2])?i+2:last,1);
    const row=editing?matches[0].row:lastGuestRow+1,householdTab=data.sheet.getSheetByName('Households'),householdRow=householdTab.getLastRow()+1;
    let householdWritten=false;
    try{
      if(newHousehold){householdTab.getRange(2,1,1,3).copyTo(householdTab.getRange(householdRow,1,1,3),SpreadsheetApp.CopyPasteType.PASTE_FORMAT,false);householdTab.getRange(householdRow,3,1,1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(false).build());householdTab.getRange(householdRow,1,1,3).setValues([[householdId,textCell_(householdName),true]]);householdWritten=true;}
      tab.getRange(row,1,1,8).setValues([[id,textCell_(name),householdId,true,true,existing?textCell_(existing.aliasesRaw||''):'',side,textCell_(input.accommodation===undefined&&existing?existing.accommodation:accommodation)]]);
      SpreadsheetApp.flush();
    }catch(error){
      // Only restore the rows this request touched. Existing RSVP rows never change.
      try{if(editing)tab.getRange(row,1,1,8).setValues([all[row-2].map((v,i)=>i===1||i===5||i===7?textCell_(String(v||'')):v)]);else tab.getRange(row,1,1,8).clearContent();if(householdWritten)householdTab.getRange(householdRow,1,1,3).clearContent();SpreadsheetApp.flush();}catch(_){}
      throw new Error('The invitee could not be saved. Please try again.');
    }
    return {saved:true,guestId:id,name};
  }finally{lock.releaseLock();}
}

function accommodationText_(value){
  if(value===undefined)return '';
  if(typeof value!=='string'||value.trim().length>500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw new Error('Use up to 500 characters for the accommodation note.');
  return value.trim();
}
function accommodationVersion_(id,note){return signature_(JSON.stringify([id,note||'']));}
function saveAccommodation_(input){
  admin_(input.adminToken);const note=accommodationText_(input.accommodation),lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const data=data_(),guest=data.guests.find(g=>g.id===input.guestId),companion=data.companions.find(c=>c.id===input.guestId);
    if(!guest&&!companion)throw new Error('This guest is no longer on the active list. Please refresh.');
    const current=guest?guest.accommodation:data.companionNotes[companion.id]||'';
    if(input.accommodationVersion!==accommodationVersion_(input.guestId,current))throw new Error('This note changed in the Sheet or another window. Copy your note, refresh, then try again.');
    const tab=data.sheet.getSheetByName(guest?'Guests':'Companions'),rows=rows_(data.sheet,guest?'Guests':'Companions',8),matches=rows.map((r,i)=>({id:String(r[0]),row:i+2})).filter(r=>r.id===input.guestId);
    if(matches.length!==1)throw new Error('Please check this guest’s ID in the Sheet.');
    tab.getRange(matches[0].row,8,1,1).setValues([[textCell_(note)]]);SpreadsheetApp.flush();
    if(guest)guest.accommodation=note;
    return {saved:true,accommodation:note,accommodationVersion:accommodationVersion_(input.guestId,note),...(guest?{editVersion:inviteeVersion_(guest)}:{})};
  }finally{lock.releaseLock();}
}

function rsvpVersion_(id,response){return signature_(JSON.stringify([id,response?.attendance?.day1||'pending',response?.attendance?.day2||'pending',response?.updatedAt||'']));}
function saveHostRsvp_(input){
  admin_(input.adminToken);
  const values=input.attendance,valid=['attending','not_attending','undecided','pending'];
  if(!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).length!==2||!['day1','day2'].every(day=>valid.includes(values[day])))throw new Error('Choose an RSVP response for both days.');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const data=data_(),guest=data.guests.find(g=>g.id===input.guestId),companion=data.companions.find(c=>c.id===input.guestId);
    if(!guest&&!companion)throw new Error('This guest is no longer on the active list. Please refresh.');
    const current=guest?data.responses[guest.id]:{attendance:companion.attendance,updatedAt:companion.updatedAt};
    if(input.rsvpVersion!==rsvpVersion_(input.guestId,current))throw new Error('This RSVP changed. Close this form, refresh, and open it again.');
    const updatedAt=new Date().toISOString(),attendance=['day1','day2'].map(day=>values[day]==='pending'?'':values[day]);
    const tab=data.sheet.getSheetByName(guest?'RSVPs':'Companions'),rows=rows_(data.sheet,guest?'RSVPs':'Companions',guest?4:8),matches=rows.map((r,i)=>({id:String(r[0]),row:i+2})).filter(r=>r.id===input.guestId);
    if(matches.length>1||(!guest&&matches.length!==1))throw new Error('Please check this guest’s ID in the Sheet.');
    if(guest){
      const row=matches[0]?.row||tab.getLastRow()+1;
      tab.getRange(row,1,1,4).setValues([[guest.id,...attendance,updatedAt]]);SpreadsheetApp.flush();
    }else{
      const row=matches[0].row,before=rows[row-2];
      try{tab.getRange(row,4,1,2).setValues([attendance]);tab.getRange(row,7,1,1).setValues([[updatedAt]]);SpreadsheetApp.flush();}
      catch(error){try{tab.getRange(row,4,1,2).setValues([[before[3],before[4]]]);tab.getRange(row,7,1,1).setValues([[before[6]]]);SpreadsheetApp.flush();}catch(_){}throw new Error('The RSVP could not be saved. Please try again.');}
    }
    return {saved:true};
  }finally{lock.releaseLock();}
}
