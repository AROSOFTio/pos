import { useEffect, useRef, useState } from 'react'
import { Camera, ScanLine } from 'lucide-react'
import { Modal } from '../components'

export default function BarcodeScanner({open,onClose,onDetected,title='Scan barcode / QR'}:{open:boolean;onClose:()=>void;onDetected:(code:string)=>void;title?:string}){
 const videoRef=useRef<HTMLVideoElement|null>(null),streamRef=useRef<MediaStream|null>(null),timerRef=useRef<number|undefined>(undefined)
 const [manual,setManual]=useState(''),[message,setMessage]=useState('')

 useEffect(()=>{
  if(!open)return
  let stopped=false
  async function start(){
   setMessage('')
   const Detector=(window as any).BarcodeDetector
   if(!navigator.mediaDevices?.getUserMedia){setMessage('Camera scanning is unavailable here. Use the scanner field below.');return}
   if(!Detector){setMessage('Camera barcode detection is not supported by this browser. USB/Bluetooth scanners still work below.');return}
   try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false})
    if(stopped){stream.getTracks().forEach(t=>t.stop());return}
    streamRef.current=stream
    if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play()}
    const detector=new Detector({formats:['qr_code','ean_13','ean_8','code_128','code_39','upc_a','upc_e','itf']})
    const tick=async()=>{
      if(stopped||!videoRef.current)return
      try{
       const hits=await detector.detect(videoRef.current)
       const code=String(hits?.[0]?.rawValue||'').trim()
       if(code){onDetected(code);onClose();return}
      }catch{}
      timerRef.current=window.setTimeout(tick,220)
    }
    tick()
   }catch(e:any){setMessage(e?.message||'Camera could not be opened. Use the scanner field below.')}
  }
  start()
  return()=>{stopped=true;if(timerRef.current)window.clearTimeout(timerRef.current);streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null}
 },[open,onClose,onDetected])

 if(!open)return null
 function submit(){const code=manual.trim();if(!code)return;onDetected(code);setManual('');onClose()}
 return <Modal title={title} onClose={onClose} size="md">
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
   <video ref={videoRef} playsInline muted className="aspect-video w-full object-cover"/>
  </div>
  {message&&<div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[10.5px] text-slate-500">{message}</div>}
  <div className="mt-4">
   <label className="text-[11px] font-medium text-slate-600">Scanner / code input</label>
   <div className="mt-1 flex gap-2">
    <div className="flex-1"><input autoFocus className="control mt-0" value={manual} onChange={e=>setManual(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submit()}} placeholder="Scan or enter code"/></div>
    <button onClick={submit} disabled={!manual.trim()} className="rounded-lg bg-[var(--brand-primary)] px-4 text-[11px] font-semibold text-white disabled:opacity-40"><Camera size={14} className="mr-1 inline"/>Use</button>
   </div>
  </div>
 </Modal>
}


export function useHardwareScanner(onScan:(code:string)=>void,enabled=true){
 const handlerRef=useRef(onScan)
 const bufferRef=useRef('')
 const lastRef=useRef(0)
 const firstRef=useRef(0)
 useEffect(()=>{handlerRef.current=onScan},[onScan])
 useEffect(()=>{
  if(!enabled)return
  const reset=()=>{bufferRef.current='';lastRef.current=0;firstRef.current=0}
  const key=(e:KeyboardEvent)=>{
    if(e.ctrlKey||e.metaKey||e.altKey)return
    const target=e.target as HTMLElement|null
    const tag=target?.tagName?.toLowerCase()
    if(tag==='input'||tag==='textarea'||tag==='select'||target?.isContentEditable)return
    const now=performance.now()
    if(e.key==='Enter'||e.key==='Tab'){
      const code=bufferRef.current.trim(),duration=firstRef.current?now-firstRef.current:9999
      if(code.length>=3&&duration<=Math.max(900,code.length*90)){e.preventDefault();handlerRef.current(code)}
      reset();return
    }
    if(e.key.length!==1)return
    if(lastRef.current&&now-lastRef.current>120)reset()
    if(!firstRef.current)firstRef.current=now
    bufferRef.current+=e.key
    lastRef.current=now
    if(bufferRef.current.length>128)reset()
  }
  window.addEventListener('keydown',key,true)
  return()=>window.removeEventListener('keydown',key,true)
 },[enabled])
}
