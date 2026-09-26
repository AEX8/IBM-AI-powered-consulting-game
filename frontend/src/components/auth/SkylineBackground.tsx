import type { CSSProperties } from 'react'

/**
 * Cloud positions from the current implementation.
 *
 * These retain the rounded, multi-part cloud design you already liked.
 */
const clouds = [
  { left: '7%', top: '9%', width: 150 },
  { left: '28%', top: '19%', width: 115 },
  { left: '62%', top: '11%', width: 155 },
  { left: '82%', top: '23%', width: 110 },
]

/**
 * Lighter buildings form the background layer.
 *
 * The sizes deliberately vary instead of following a staircase pattern.
 * These buildings do not contain windows because they are visually farther
 * away, matching the high-fidelity wireframe.
 */
const distantBuildings = [
  { left: '0%', width: '10%', height: '54%' },
  { left: '9%', width: '8%', height: '66%' },
  { left: '16%', width: '13%', height: '61%' },
  { left: '28%', width: '9%', height: '48%' },
  { left: '36%', width: '14%', height: '57%' },
  { left: '49%', width: '10%', height: '69%' },
  { left: '58%', width: '13%', height: '53%' },
  { left: '70%', width: '9%', height: '64%' },
  { left: '78%', width: '13%', height: '56%' },
  { left: '90%', width: '10%', height: '67%' },
]

/**
 * Every foreground window is positioned individually.
 *
 * This is intentional: using a CSS grid made the buildings look calculated.
 * Sparse, uneven windows reproduce the hand-placed cartoon appearance shown
 * in the approved wireframe.
 */
/*
 * Foreground buildings are intentionally separated.
 *
 * The gaps allow the lighter background buildings to remain visible between
 * them, matching the layered skyline in the wireframe.
 */
const nearbyBuildings = [
  {
    left: '0%',
    width: '6%',
    height: '78%',
    windows: [
      { left: '50%', top: '17%', size: 'medium' },
      { left: '8%', top: '43%', size: 'small' },
      { left: '47%', top: '68%', size: 'medium' },
    ],
  },
  {
    left: '9%',
    width: '10%',
    height: '47%',
    windows: [
      { left: '18%', top: '14%', size: 'medium' },
      { left: '61%', top: '47%', size: 'small' },
      { left: '25%', top: '77%', size: 'medium' },
    ],
  },
  {
    left: '23%',
    width: '7%',
    height: '63%',
    windows: [
      { left: '51%', top: '20%', size: 'small' },
      { left: '13%', top: '54%', size: 'medium' },
      { left: '58%', top: '81%', size: 'small' },
    ],
  },
  {
    left: '33%',
    width: '7%',
    height: '50%',
    windows: [
      { left: '18%', top: '27%', size: 'small' },
      { left: '57%', top: '64%', size: 'medium' },
    ],
  },
  {
    left: '43%',
    width: '8%',
    height: '66%',
    windows: [
      { left: '16%', top: '19%', size: 'medium' },
      { left: '59%', top: '52%', size: 'small' },
      { left: '24%', top: '80%', size: 'medium' },
    ],
  },
  {
    left: '55%',
    width: '8%',
    height: '72%',
    windows: [
      { left: '57%', top: '15%', size: 'medium' },
      { left: '13%', top: '48%', size: 'small' },
      { left: '61%', top: '76%', size: 'medium' },
    ],
  },
  {
    left: '67%',
    width: '7%',
    height: '58%',
    windows: [
      { left: '18%', top: '25%', size: 'medium' },
      { left: '59%', top: '61%', size: 'small' },
    ],
  },
  {
    left: '78%',
    width: '7%',
    height: '45%',
    windows: [
      { left: '48%', top: '16%', size: 'small' },
      { left: '14%', top: '66%', size: 'medium' },
    ],
  },
  {
    left: '88%',
    width: '8%',
    height: '67%',
    windows: [
      { left: '16%', top: '19%', size: 'medium' },
      { left: '58%', top: '45%', size: 'small' },
      { left: '24%', top: '76%', size: 'medium' },
    ],
  },
]
export default function SkylineBackground() {
  return (
    /*
     * The complete scene is decorative, so it is hidden from assistive
     * technologies and does not interfere with the authentication form.
     */
    <div
      className="bg-sky-blue pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/*
       * Keep the current detailed cartoon clouds.
       *
       * Each cloud consists of one main pill and two overlapping rounded
       * sections. The inner strip hides intersecting borders so the three
       * shapes appear as one cloud.
       */}
      {clouds.map((cloud, index) => (
        <div
          key={`cloud-${index}`}
          className="border-charcoal bg-cloud-white absolute z-10 h-10 rounded-full border-[3px] sm:h-12"
          style={
            {
              left: cloud.left,
              top: cloud.top,
              width: `${cloud.width}px`,
            } satisfies CSSProperties
          }
        >
          <span className="border-charcoal bg-cloud-white absolute -top-4 left-[22%] h-8 w-12 rounded-full border-[3px]" />

          <span className="border-charcoal bg-cloud-white absolute -top-3 right-[18%] h-7 w-10 rounded-full border-[3px]" />

          <span className="bg-cloud-white absolute inset-x-2 top-1 h-6" />
        </div>
      ))}

      {/*
       * Render the lighter distant skyline first so the darker buildings can
       * naturally overlap it.
       */}
      {distantBuildings.map((building, index) => (
        <div
          key={`distant-building-${index}`}
          className="border-charcoal bg-building-far absolute bottom-0 border-x-[4px] border-t-[4px]"
          style={
            {
              left: building.left,
              width: building.width,
              height: building.height,
            } satisfies CSSProperties
          }
        />
      ))}

      {/*
       * Foreground buildings use the darker approved blue and thick black
       * outlines. Buildings continue behind the auth card, as shown in the
       * wireframe, instead of creating an artificial central gap.
       */}
      {nearbyBuildings.map((building, buildingIndex) => (
        <div
          key={`near-building-${buildingIndex}`}
          className="border-charcoal bg-building-near absolute bottom-0 overflow-hidden border-x-[4px] border-t-[4px]"
          style={
            {
              left: building.left,
              width: building.width,
              height: building.height,
            } satisfies CSSProperties
          }
        >
          {building.windows.map((window, windowIndex) => {
            /*
             * Two slightly different window sizes prevent the skyline from
             * looking mechanically repeated.
             */
            const windowSize =
              window.size === 'medium' ? 'h-9 w-7 sm:h-11 sm:w-9' : 'h-7 w-6 sm:h-9 sm:w-7'

            return (
              <span
                key={`window-${buildingIndex}-${windowIndex}`}
                className={`bg-cloud-white absolute block ${windowSize}`}
                style={
                  {
                    left: window.left,
                    top: window.top,
                  } satisfies CSSProperties
                }
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
