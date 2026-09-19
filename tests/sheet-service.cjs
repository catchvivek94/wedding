const vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../apps-script/Code.gs','utf8');
function fixture(){
 const rows=[['#','Member','Size','Finalized Link','Ordered?','',''],['1','Member One','M','https://www.myntra.com/123/buy','No','keep','']];
 let writes=0, formula='',email='owner@example.com';
 const sheet={getLastRow:()=>rows.length,getRange:(r,c,n,m)=>({getDisplayValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+m)),getFormulas:()=>[[formula,'']],setValues:values=>{writes++;values.forEach((row,i)=>row.forEach((v,j)=>rows[r-1+i][c-1+j]=v));}})};
 const context=vm.createContext({ContentService:{MimeType:{JSON:'json'},createTextOutput:value=>({value,setMimeType(){return this;}})},SpreadsheetApp:{openById:()=>({getSheetByName:name=>name==='Finalized Picks'?sheet:{getLastRow:()=>5,getRange:()=>({getDisplayValues:()=>[['Brand','Kurta / Style','Product Link','',''],['Brand','Real sample','https://www.myntra.com/1/buy','','']]})}}),flush(){}},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(alg,data)=>crypto.createHash(alg).update(data).digest(),base64EncodeWebSafe:b=>b.toString('base64url')},});
 vm.runInContext(source,context);
 return {rows,read:()=>JSON.parse(context.doGet().value),save:overrides=>JSON.parse(context.doPost({postData:{contents:JSON.stringify({action:'save',id:'1',token:'valid',revision:context.revision_(rows[1]),url:'https://www.ajio.com/product/123',ordered:true,...overrides})}}).value),writes:()=>writes};
}
let f=fixture();assert.equal(f.read().members.length,1);f.rows.push(['2','TBD extra','','','','','']);assert.equal(f.read().members.length,1);
f=fixture();f.rows[1][3]='https://www.myntra.com/123/buy https://www.myntra.com/123/buy';assert.equal(f.read().members[0].urls.length,1);
f=fixture();f.rows[1][6]='https://www.myntra.com/456/buy';assert.equal(f.read().members[0].urls.length,2);
f=fixture();f.rows[0][3]='Renamed';assert.equal(f.read().code,'SCHEMA');
f=fixture();f.rows.push([...f.rows[1]]);assert.equal(f.read().code,'SCHEMA');
f=fixture();const before=JSON.stringify(f.rows);assert.equal(f.save().code,'READ_ONLY');assert.equal(f.writes(),0);assert.equal(JSON.stringify(f.rows),before);
console.log('PASS: current roster, TBD filtering, URL deduplication, alternatives, schema validation, and all writes rejected.');
