/* Public endpoint configuration contains no Google credentials. */
window.WEDDING_RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyD3yh-CuI-Vy1NEDMkQ3x5_SpvWWQtBJK7NtExvYy1k6bz29S1NBg-fFVz5DLNHMietA/exec';
window.RsvpApi = {
  async call(action,payload={},signal){
    const local=['localhost','127.0.0.1'].includes(location.hostname);
    let response;
    if(local&&!window.WEDDING_RSVP_ENDPOINT){
      response=await fetch('/api/rsvp/gateway',{method:'POST',cache:'no-store',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});
    }else{
      if(!window.WEDDING_RSVP_ENDPOINT)throw new Error('RSVP is not available yet. Please try again shortly.');
      response=await fetch(window.WEDDING_RSVP_ENDPOINT,{method:'POST',cache:'no-store',signal,redirect:'follow',credentials:'omit',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action,...payload})});
    }
    if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('The RSVP service is not available. Please try again shortly.');
    const data=await response.json();
    if(!response.ok||data.ok===false)throw new Error(data.error||'The request could not be completed.');
    return data;
  }
};
