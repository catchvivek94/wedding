/* Men kurta shopping page */
let KURTA_SAMPLES = [
 {brand:'Fabindia',name:'Men Striped Daily Cotton Straight Kurta',url:'https://www.myntra.com/Kurtas/Fabindia/Fabindia-Men-Striped-Daily-Cotton-Straight-Kurta/36194059/buy'},
 {brand:'Fabindia',name:'Men Dobby Kurta',url:'https://www.myntra.com/Kurtas/Fabindia/Fabindia-Men-Dobby-Kurta/45940223/buy'},
 {brand:'Fabindia',name:'Kurta',url:'https://www.myntra.com/Kurtas/Fabindia/FabindiaKurta/31015497/buy'},
 {brand:'SOJANYA',name:'Orange & White Geometric Printed Cotton Linen Kurta',url:'https://www.myntra.com/mailers/kurtas/sojanya/sojanya-men-orange-&-white-geometric-printed--cotton-linen-kurta/18110786/buy'},
 {brand:'House of Pataudi',name:'Embroidered Mandarin Collar Calf Length Straight Kurta',url:'https://www.myntra.com/mailers/kurtas/house-of-pataudi/house-of-pataudi-embroidered-mandarin-collar-calf-length-straight-kurta/42082668/buy'},
 {brand:'Ethnic Bay',name:'Men Pink Cotton Embroidered Straight Kurta',url:'https://www.nykaafashion.com/ethnic-bay-men-pink-cotton-embroidered-straight-kurta/p/24091359'}
];
let KURTA_MEMBERS = KURTA_SHEET_MEMBERS.filter(row => !/^TBD\b/i.test(row.name)).map(row => [row.name, row.size, row.id]);
