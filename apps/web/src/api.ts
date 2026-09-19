export type User = { id:number; name:string; email:string; role:string; businessId?:number|null }

export async function api(path:string, options:RequestInit = {}) {
  const token = localStorage.getItem('pos_token') || ''
  const response = await fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type':'application/json',
      Authorization:'Bearer ' + token,
      ...(options.headers || {}),
    },
  })
  const type = response.headers.get('content-type') || ''
  const body = type.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) throw new Error(body?.error || body || 'Request failed')
  return body
}

export const money = (value:any, currency='UGX') => currency + ' ' + Number(value || 0).toLocaleString()
export const nice = (value:any) => String(value ?? '').replaceAll('_',' ').replace(/\b\w/g, s => s.toUpperCase())

export async function openPdf(path:string) {
  const token = localStorage.getItem('pos_token') || ''
  const response = await fetch('/api' + path, { headers: { Authorization:'Bearer ' + token } })
  if (!response.ok) {
    const type=response.headers.get('content-type')||''
    const body=type.includes('application/json')?await response.json():await response.text()
    throw new Error(body?.error || body || 'Unable to open PDF')
  }
  const blob=await response.blob()
  const url=URL.createObjectURL(blob)
  window.open(url,'_blank','noopener,noreferrer')
  window.setTimeout(()=>URL.revokeObjectURL(url),120000)
}


export async function downloadFile(path:string, filename?:string) {
  const token=localStorage.getItem('pos_token')||''
  const response=await fetch('/api'+path,{headers:{Authorization:'Bearer '+token}})
  if(!response.ok){
    const type=response.headers.get('content-type')||''
    const body=type.includes('application/json')?await response.json():await response.text()
    throw new Error(body?.error||body||'Download failed')
  }
  const blob=await response.blob()
  const disp=response.headers.get('content-disposition')||''
  const match=/filename="?([^"]+)"?/i.exec(disp)
  const name=filename||match?.[1]||'download'
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove()
  setTimeout(()=>URL.revokeObjectURL(url),120000)
}


export async function sharePdf(path:string, filename='MauzoPOS-document.pdf') {
  const token=localStorage.getItem('pos_token')||''
  const response=await fetch('/api'+path,{headers:{Authorization:'Bearer '+token}})
  if(!response.ok){
    const type=response.headers.get('content-type')||''
    const body=type.includes('application/json')?await response.json():await response.text()
    throw new Error(body?.error||body||'Unable to prepare document')
  }
  const blob=await response.blob()
  const file=new File([blob],filename,{type:'application/pdf'})
  if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
    await navigator.share({title:'MauzoPOS document',files:[file]})
    return
  }
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove()
  setTimeout(()=>URL.revokeObjectURL(url),120000)
}


export async function printPdf(path:string) {
  const token=localStorage.getItem('pos_token')||''
  const response=await fetch('/api'+path,{headers:{Authorization:'Bearer '+token}})
  if(!response.ok){
    const type=response.headers.get('content-type')||''
    const body=type.includes('application/json')?await response.json():await response.text()
    throw new Error(body?.error||body||'Unable to print document')
  }
  const blob=await response.blob()
  const url=URL.createObjectURL(blob)
  const frame=document.createElement('iframe')
  frame.style.position='fixed';frame.style.right='0';frame.style.bottom='0';frame.style.width='0';frame.style.height='0';frame.style.border='0';frame.src=url
  document.body.appendChild(frame)
  frame.onload=()=>setTimeout(()=>{try{frame.contentWindow?.focus();frame.contentWindow?.print()}catch{window.open(url,'_blank','noopener,noreferrer')}setTimeout(()=>{frame.remove();URL.revokeObjectURL(url)},60000)},250)
}
