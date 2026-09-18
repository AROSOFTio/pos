type LogoProps={compact?:boolean;light?:boolean;className?:string}

export function MauzoMark({className=''}:{light?:boolean;className?:string}){
  return <img
    src="/brand/mauzopos-icon.png"
    alt="MauzoPOS"
    className={'object-contain rounded-xl '+className}
  />
}

export function MauzoLogo({compact=false,light=false,className=''}:LogoProps){
  return <img
    src={light?'/brand/mauzopos-logo-dark.png':'/brand/mauzopos-logo-light.png'}
    alt="MauzoPOS"
    className={(compact?'h-9 max-w-[175px]':'h-12 max-w-[240px]')+' w-auto object-contain '+className}
  />
}
