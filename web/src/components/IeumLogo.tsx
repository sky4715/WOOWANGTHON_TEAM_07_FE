import './ieum-logo.css'

const CURVE_A = 'M328 359 L380 282 Q396 260 414 284 L455 344'
const CURVE_B = 'M413 359 L459 300 Q476 278 493 304 L518 345'
const FONT = "Pretendard, 'Noto Sans KR', 'Noto Sans CJK KR', 'Apple SD Gothic Neo', sans-serif"

export function IeumLogo({ animated = true, className }: { animated?: boolean; className?: string }) {
  const classes = ['ieum-logo', className].filter(Boolean).join(' ')
  return (
    <svg
      className={classes}
      role="img"
      aria-label="이음 — 모두의 이동을 잇다"
      viewBox="296 244 480 206"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>이음 — 모두의 이동을 잇다</title>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="17">
        <path className="ieum-logo-curve ieum-logo-curve-a" stroke="#3387F7" d={CURVE_A} />
        <path className="ieum-logo-curve ieum-logo-curve-b" stroke="#1759BB" d={CURVE_B} />
        {animated && (
          <>
            <path className="ieum-logo-flow ieum-logo-flow-a" d={CURVE_A} pathLength={100} />
            <path className="ieum-logo-flow ieum-logo-flow-b" d={CURVE_B} pathLength={100} />
          </>
        )}
      </g>
      <circle className="ieum-logo-dot ieum-logo-dot-a" cx="328" cy="359" r="10" stroke="#3387F7" strokeWidth="6" />
      <circle className="ieum-logo-dot ieum-logo-dot-b" cx="518" cy="345" r="10" stroke="#1759BB" strokeWidth="6" />
      <text className="ieum-logo-word" x="555" y="369" fontFamily={FONT} fontSize="91" fontWeight="800" fill="#172C54" letterSpacing="-3">
        이음
      </text>
      <text className="ieum-logo-slogan" x="560" y="429" textAnchor="middle" fontFamily={FONT} fontSize="26" fontWeight="500" fill="#64748B">
        모두의 이동을 잇다
      </text>
      <g className="ieum-logo-sparkle" aria-hidden="true">
        <path fill="#3387F7" d="M744 276 Q746 290 760 292 Q746 294 744 308 Q742 294 728 292 Q742 290 744 276 Z" />
      </g>
    </svg>
  )
}
