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
