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
