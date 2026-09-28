import { ART, INK } from './palette';
import { DandelionLogo } from './Furniture';

const S = { stroke: INK, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** Tranh SVG riêng cho từng nâng cấp, dùng ở cả thẻ và chi tiết sau này. */
export function UpgradeArt({ id }: { id: string }) {
  let drawing: React.ReactNode;
  switch (id) {
    case 'scanner':
      drawing = <g>
        <path d="M17,51 H79 L74,61 H21Z" fill={ART.woodLight} {...S} />
        <path d="M24,21 H56 L61,50 H20Z" fill={ART.leafLight} {...S} />
        <rect x={29} y={27} width={22} height={12} rx={3} fill={ART.paper} {...S} />
        <path d="M33,31 H47 M34,35 H42" stroke={ART.leaf} strokeWidth={2} strokeLinecap="round" />
        <path d="M68,22 L80,28 L70,43 L60,38Z" fill={INK} {...S} />
        <path d="M68,27 L75,30" stroke={ART.honey} strokeWidth={3} strokeLinecap="round" />
        <path d="M67,42 L57,52" fill="none" {...S} />
        <path d="M55,32 L47,44 M53,30 L43,42" stroke={ART.honey} strokeOpacity={.7} strokeWidth={2} strokeLinecap="round" />
      </g>;
      break;
    case 'sorted-shelf':
      drawing = <g>
        <path d="M14,17 H82 V58 H14Z" fill={ART.wood} {...S} />
        <path d="M19,22 H77 V36 H19Z M19,40 H77 V53 H19Z" fill={ART.woodInner} {...S} />
        <path d="M17,37 H79 M17,54 H79" stroke={ART.woodLight} strokeWidth={4} />
        <path d="M27,27 H38 V35 H27Z" fill={ART.sky} {...S} /><path d="M43,25 H54 V35 H43Z" fill={ART.honey} {...S} /><path d="M60,28 H70 V35 H60Z" fill={ART.coral} {...S} />
        <path d="M27,44 H38 V52 H27Z" fill={ART.sky} {...S} /><path d="M43,43 H54 V52 H43Z" fill={ART.honey} {...S} /><path d="M60,44 H70 V52 H60Z" fill={ART.coral} {...S} />
      </g>;
      break;
    case 'wide-shelf':
      drawing = <g>
        <path d="M9,15 H87 V61 H9Z" fill={ART.wood} {...S} />
        <path d="M15,21 H81 V35 H15Z M15,40 H81 V55 H15Z" fill={ART.woodInner} {...S} />
        <path d="M12,37 H84 M12,57 H84" stroke={ART.woodLight} strokeWidth={4} />
        {[22, 36, 50, 64].map((x) => <g key={x}><path d={`M${x},25 h9 v10 h-9z`} fill={ART.mint} {...S} /><path d={`M${x+2},29 h5`} stroke={ART.leaf} strokeWidth={1.2} /></g>)}
        {[22, 36, 50, 64].map((x) => <g key={x}><rect x={x} y={44} width={9} height={11} rx={2} fill={ART.honey} {...S} /><path d={`M${x+2},48 h5`} stroke={ART.paper} strokeWidth={1.2} /></g>)}
      </g>;
      break;
    case 'bench':
      drawing = <g>
        <path d="M17,56 H79" stroke={INK} strokeOpacity={.25} strokeWidth={3} strokeLinecap="round" />
        <path d="M24,27 Q24,23 28,23 H68 Q72,23 72,27 V42 H24Z" fill={ART.leafLight} {...S} />
        <path d="M20,41 H76 V48 H20Z" fill={ART.woodLight} {...S} />
        <path d="M27,48 L25,57 M69,48 L71,57" {...S} fill="none" />
        <path d="M29,31 H66 M35,36 H61" stroke={ART.leaf} strokeOpacity={.55} strokeWidth={1.6} strokeLinecap="round" />
        <path d="M10,51 L8,38 M12,45 Q3,39 8,32 Q15,36 12,45Z M10,42 Q13,32 20,31 Q20,39 10,42Z" fill={ART.leaf} {...S} />
        <path d="M5,51 H16 L14,59 H7Z" fill={ART.coral} {...S} />
      </g>;
      break;
    case 'signboard':
      drawing = <g>
        <path d="M19,52 H77 L73,60 H23Z" fill={ART.woodLight} {...S} />
        <path d="M27,24 H69 V52 H27Z" fill={ART.woodInner} {...S} />
        <path d="M20,23 L26,15 H70 L76,23Z" fill={ART.leaf} {...S} />
        <path d="M24,23 V35 Q30,41 36,35 Q42,41 48,35 Q54,41 60,35 Q66,41 72,35 V23Z" fill={ART.leafLight} {...S} />
        <path d="M40,52 V40 H56 V52" fill={ART.paper} {...S} />
        <DandelionLogo x={48} y={21} r={6} />
        <path d="M17,14 L14,11 M79,14 L82,11 M48,9 V5" stroke={ART.honey} strokeWidth={2.4} strokeLinecap="round" />
      </g>;
      break;
    default:
      drawing = <g opacity={.65}>
        <path d="M16,51 H80 L76,59 H20Z" fill={ART.woodLight} {...S} />
        <path d="M21,30 H75 V51 H21Z" fill={ART.leafLight} {...S} />
        <path d="M18,27 H78 V32 H18Z" fill={ART.paper} {...S} />
        <path d="M35,40 H60" stroke={INK} strokeWidth={2} strokeDasharray="4 3" />
      </g>;
  }
  return <svg className="upgrade-art" viewBox="0 0 96 72" aria-hidden focusable="false">
    <rect x={1} y={1} width={94} height={70} rx={11} fill={ART.wall} />
    <path d="M8,61 H88" stroke={ART.floorLine} strokeWidth={1.5} />
    {drawing}
  </svg>;
}
