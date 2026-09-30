import { useId, type ReactNode } from 'react';
import { useI18n } from '@/shared/i18n';
import styles from './LaneArt.module.css';

/*
 * Minh họa tuyến gửi: máy bay Việt An bay từ Việt Nam tới công trình biểu tượng của nước đến.
 * Tự vẽ bằng SVG (không dùng ảnh bản quyền), màu lấy từ token nên tự đổi theo sáng/tối.
 * Khung vẽ 280×160, mặt đất ở y = 140, công trình đặt quanh x = 200.
 */

const L = styles.landmark;
const LIGHT = styles.landmarkLight;

/** Công trình biểu tượng theo mã quốc gia. */
const LANDMARKS: Record<string, ReactNode> = {
  // Tượng Nữ thần Tự do
  US: (
    <g className={L}>
      <rect x="182" y="108" width="36" height="6" />
      <rect x="186" y="114" width="28" height="26" />
      <polygon points="192,108 208,108 205,70 195,70" />
      <circle cx="200" cy="64" r="5" />
      <path d="M193 62 190 55M197 59 196 52M200 59v-8M203 59 204 52M207 62 210 55" className={styles.stroke} />
      <polygon points="204,74 208,72 212,44 209,43" />
      <polygon points="207,43 214,43 212,38 209,38" />
      <circle cx="210.5" cy="34.5" r="3.5" className={styles.flame} />
      <rect x="190" y="78" width="5" height="9" />
    </g>
  ),
  // Nhà hát Opera Sydney
  AU: (
    <g>
      <rect x="148" y="128" width="104" height="12" className={L} />
      {[
        [158, 28, 30],
        [178, 32, 44],
        [202, 28, 34],
        [222, 26, 24]
      ].map(([x, w, h]) => (
        <path
          key={x}
          d={`M${x} 128C${x} ${128 - h! * 0.6} ${x! + w! * 0.4} ${128 - h!} ${x! + w!} ${128 - h!}L${x! + w! * 0.72} 128Z`}
          className={LIGHT}
        />
      ))}
    </g>
  ),
  // Tháp CN (Toronto)
  CA: (
    <g className={L}>
      <polygon points="186,140 214,140 204,118 196,118" />
      <polygon points="196,120 204,120 202,40 198,40" />
      <ellipse cx="200" cy="84" rx="11" ry="6" />
      <ellipse cx="200" cy="70" rx="5" ry="3" />
      <path d="M200 40V12" className={styles.stroke} />
    </g>
  ),
  // Marina Bay Sands
  SG: (
    <g className={L}>
      <polygon points="164,140 184,140 184,80 170,80" />
      <polygon points="190,140 210,140 210,78 196,78" />
      <polygon points="216,140 236,140 236,76 222,76" />
      <path d="M154 78 242 72 244 78 156 82Z" />
    </g>
  ),
  // Tháp đôi Petronas
  MY: (
    <g className={L}>
      {[184, 216].map(cx => (
        <g key={cx}>
          <rect x={cx - 8} y="72" width="16" height="68" />
          <rect x={cx - 6} y="60" width="12" height="12" />
          <rect x={cx - 4} y="51" width="8" height="9" />
          <path d={`M${cx} 51V24`} className={styles.stroke} />
        </g>
      ))}
      <rect x="192" y="94" width="16" height="4" />
    </g>
  ),
  // Taipei 101
  TW: (
    <g className={L}>
      <rect x="189" y="112" width="22" height="28" />
      {Array.from({ length: 8 }, (_, i) => {
        const yb = 112 - i * 9;
        return <polygon key={i} points={`191,${yb} 209,${yb} 212,${yb - 8} 188,${yb - 8}`} />;
      })}
      <rect x="194" y="32" width="12" height="9" />
      <path d="M200 32V8" className={styles.stroke} />
    </g>
  ),
  // Burj Khalifa (Dubai)
  AE: (
    <g className={L}>
      <rect x="185" y="110" width="30" height="30" />
      <rect x="188" y="88" width="24" height="22" />
      <rect x="191" y="68" width="18" height="20" />
      <rect x="193.5" y="52" width="13" height="16" />
      <rect x="195.5" y="38" width="9" height="14" />
      <rect x="197" y="28" width="6" height="10" />
      <path d="M200 28V4" className={styles.stroke} />
    </g>
  )
};

/** Nhà phố mờ phía sau cho có chiều sâu. */
const SKYLINE: ReadonlyArray<[x: number, w: number, h: number]> = [
  [128, 14, 26],
  [144, 10, 40],
  [236, 12, 34],
  [250, 16, 22],
  [268, 10, 30]
];

export function LaneArt({ code, landmark }: { code: string; landmark: string }) {
  const { t } = useI18n();
  const id = useId();
  const sky = `${id}-sky`;

  return (
    <svg className={styles.art} viewBox="0 0 280 160" role="img" aria-label={t('Máy bay chở hàng Việt An tới {place}', { place: landmark })}>
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={styles.skyTop} />
          <stop offset="1" className={styles.skyBottom} />
        </linearGradient>
      </defs>
      <rect width="280" height="160" fill={`url(#${sky})`} />
      <circle cx="248" cy="30" r="14" className={styles.sun} />

      {SKYLINE.map(([x, w, h]) => (
        <rect key={x} x={x} y={140 - h} width={w} height={h} className={styles.skyline} />
      ))}

      {LANDMARKS[code]}

      {/* Mặt đất + kiện hàng Việt An */}
      <rect y="140" width="280" height="20" className={styles.ground} />
      <g className={styles.box}>
        <rect x="30" y="122" width="20" height="18" rx="1.5" />
        <rect x="46" y="128" width="14" height="12" rx="1.5" />
        <path d="M40 122v18M53 128v12" />
      </g>

      {/* Đường bay từ Việt Nam */}
      <circle cx="16" cy="112" r="4" className={styles.origin} />
      <text x="16" y="102" className={styles.originLabel} textAnchor="middle">
        VN
      </text>
      <path d="M16 112Q60 26 140 38" className={styles.route} />
      <g transform="translate(146 38) rotate(8)" className={styles.plane}>
        <path d="M-14-1.6 8-2.4 14 0 8 2.4-14 1.6ZM-2-2-9-13h4.5L5-2ZM-2 2-9 13h4.5L5 2ZM-12-1.5-16-7h3L-8-1.5Z" />
      </g>
    </svg>
  );
}
