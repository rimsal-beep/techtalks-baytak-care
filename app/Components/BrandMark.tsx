/**
 * The Baytak Care house mark.
 * It is drawn in the current text colour, so it is white on the blue sidebar tile.
 */
export default function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      viewBox="-4 -4 128 148"
      width={size}
      height={(size * 148) / 128}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 104V46Q6 42 9.5 39.5L56 6Q60 3 64 6L110.5 39.5Q114 42 114 46V129Q114 134 109 134H34Q29 134 29 129V62.5A11.85 11.85 0 0 1 52.7 62.5V84.7H70A12.9 12.9 0 0 1 70 110.5H11Q6 110.5 6 105.5Z"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
