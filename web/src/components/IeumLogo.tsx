import './ieum-logo.css'

const CURVE_A = 'M328 359 L380 282 Q396 260 414 284 L455 344'
const CURVE_B = 'M413 359 L459 300 Q476 278 493 304 L518 345'
const FONT = "Pretendard, 'Noto Sans KR', 'Noto Sans CJK KR', 'Apple SD Gothic Neo', sans-serif"
// '이음' wordmark as outlines, so it renders identically without installed Korean fonts.
// Source: Noto Sans KR Bold (SIL Open Font License 1.1), glyph outlines converted with fontTools.
// Font size 91, ink left edge at x=555, baseline y=369, tracking -3 (SVG units).
const WORD_PATH = 'M610.5 292.7H622.6V377.2H610.5ZM577.2 298.6Q583.7 298.6 588.7 302.3Q593.7 305.9 596.5 312.7Q599.4 319.5 599.4 328.7Q599.4 338 596.5 344.7Q593.7 351.5 588.7 355.2Q583.7 358.9 577.2 358.9Q570.8 358.9 565.8 355.2Q560.8 351.5 558 344.7Q555.1 338 555.1 328.7Q555.1 319.5 558 312.7Q560.8 305.9 565.8 302.3Q570.8 298.6 577.2 298.6ZM577.2 309.6Q574.1 309.6 571.8 311.8Q569.4 313.9 568.1 318.2Q566.7 322.4 566.7 328.7Q566.7 334.9 568.1 339.2Q569.4 343.5 571.8 345.7Q574.1 347.9 577.2 347.9Q580.4 347.9 582.8 345.7Q585.1 343.5 586.4 339.2Q587.8 334.9 587.8 328.7Q587.8 322.4 586.4 318.2Q585.1 313.9 582.8 311.8Q580.4 309.6 577.2 309.6Z M671.5 294.4Q680.9 294.4 687.7 296.3Q694.5 298.3 698.3 302Q702.1 305.7 702.1 310.8Q702.1 315.9 698.3 319.5Q694.5 323.2 687.7 325.2Q680.9 327.2 671.5 327.2Q662.3 327.2 655.4 325.2Q648.5 323.2 644.7 319.5Q641 315.9 641 310.8Q641 305.7 644.7 302Q648.5 298.3 655.4 296.3Q662.3 294.4 671.5 294.4ZM671.5 303.7Q665.8 303.7 661.8 304.4Q657.7 305.2 655.6 306.8Q653.6 308.3 653.6 310.8Q653.6 313.1 655.6 314.7Q657.7 316.3 661.8 317.1Q665.8 317.9 671.5 317.9Q677.3 317.9 681.3 317.1Q685.3 316.3 687.4 314.7Q689.5 313.1 689.5 310.8Q689.5 308.3 687.4 306.8Q685.3 305.2 681.3 304.4Q677.3 303.7 671.5 303.7ZM642.3 347.4H700.5V376.2H642.3ZM688.7 357H654.1V366.6H688.7ZM633.4 332.1H709.6V341.5H633.4Z'

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
      <path className="ieum-logo-word" d={WORD_PATH} fill="#172C54" />
      <text className="ieum-logo-slogan" x="560" y="429" textAnchor="middle" fontFamily={FONT} fontSize="26" fontWeight="500" fill="#64748B">
        모두의 이동을 잇다
      </text>
      <g className="ieum-logo-sparkle" aria-hidden="true">
        <path fill="#3387F7" d="M744 276 Q746 290 760 292 Q746 294 744 308 Q742 294 728 292 Q742 290 744 276 Z" />
      </g>
    </svg>
  )
}
