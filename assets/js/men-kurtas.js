/* Men kurta shopping page */
const KURTA_SAMPLES = [
 {brand:'Fabindia',name:'Men Striped Daily Cotton Straight Kurta',url:'https://www.myntra.com/Kurtas/Fabindia/Fabindia-Men-Striped-Daily-Cotton-Straight-Kurta/36194059/buy'},
 {brand:'Fabindia',name:'Men Dobby Kurta',url:'https://www.myntra.com/Kurtas/Fabindia/Fabindia-Men-Dobby-Kurta/45940223/buy'},
 {brand:'Fabindia',name:'Kurta',url:'https://www.myntra.com/Kurtas/Fabindia/FabindiaKurta/31015497/buy'},
 {brand:'SOJANYA',name:'Orange & White Geometric Printed Cotton Linen Kurta',url:'https://www.myntra.com/mailers/kurtas/sojanya/sojanya-men-orange-&-white-geometric-printed--cotton-linen-kurta/18110786/buy'},
 {brand:'House of Pataudi',name:'Embroidered Mandarin Collar Calf Length Straight Kurta',url:'https://www.myntra.com/mailers/kurtas/house-of-pataudi/house-of-pataudi-embroidered-mandarin-collar-calf-length-straight-kurta/42082668/buy'},
 {brand:'Ethnic Bay',name:'Men Pink Cotton Embroidered Straight Kurta',url:'https://www.nykaafashion.com/ethnic-bay-men-pink-cotton-embroidered-straight-kurta/p/24091359'}
];
const KURTA_MEMBERS=[['Sudhakarrao','L'],['Pradeep','XL'],['Praveen','L'],['Prashant','L'],['Sagar','XL'],['Pranav','XXL'],['Pradush','L'],['Raghav','L'],['Name TBD','L'],['Anil','L'],['Chinmay','XL'],['Ravindra','XL'],['Raju Kaka','XL'],['Harish','L'],['Atharva','XL'],['Anirudha','XL'],['Appa','XL'],['Krish','XL'],['Ishan','XL'],['Pankaj / N.B. Bhavi','XL']];
function kurtaState(){return Store.list('kurtaSelections')}
function selectionFor(name){return kurtaState().find(x=>x.name===name)||{}}
function saveKurta(name,size,url){let x=selectionFor(name);if(x.id)Store.update('kurtaSelections',x.id,{size,url});else Store.add('kurtaSelections',{name,size,url});renderKurtas();toast('Kurta selection saved');}
function renderKurtas(){
 const samples=$('#kurtaSamples'), people=$('#kurtaPeople');
 samples.innerHTML=KURTA_SAMPLES.map((k,i)=>`<article class="card"><span class="pill gold">${esc(k.brand)}</span><h3>${esc(k.name)}</h3><p><a class="btn" href="${esc(k.url)}" target="_blank" rel="noopener">View product ↗</a></p></article>`).join('');
 people.innerHTML=KURTA_MEMBERS.map(([name,size])=>{const s=selectionFor(name);return `<div class="card"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h3 style="margin:0">${esc(name)}</h3><span class="pill">${size}</span></div><span class="pill ${s.url?'gold':''}">${s.url?'Finalized':'Pending'}</span></div><label style="margin-top:14px">Finalized link<input type="url" data-kurta-name="${esc(name)}" data-size="${size}" value="${esc(s.url||'')}" placeholder="Paste Myntra / Nykaa link"></label>${s.url?`<p><a href="${esc(s.url)}" target="_blank" rel="noopener">Open finalized kurta ↗</a></p>`:''}</div>`}).join('');
 $$('[data-kurta-name]',people).forEach(el=>el.addEventListener('change',()=>saveKurta(el.dataset.kurtaName,el.dataset.size,el.value.trim())));
 const done=KURTA_MEMBERS.filter(([n])=>selectionFor(n).url).length; $('#kurtaProgress').textContent=`${done} / ${KURTA_MEMBERS.length} finalized`;
}
renderKurtas();