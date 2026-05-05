export function SponbitLogo({ className = '' }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 180 52"
      aria-label="Sponbit"
      role="img"
      fill="currentColor"
    >
      {/* Spoon icon mark */}
      <g transform="translate(0, 2)">
        {/* Bowl */}
        <ellipse cx="20" cy="11" rx="8.5" ry="7" />
        {/* Handle */}
        <path d="M20 18 C20 22.5 24 25 24 31.5 C24 33.4 22.4 35 20.5 35 L19.5 35 C17.6 35 16 33.4 16 31.5 C16 25 20 22.5 20 18Z" />
      </g>

      {/* Wordmark: SPONBIT -->
      <!-- Using geometric paths gives a cleaner look, but font-based is fine
           since Playfair Display is already loaded on the page -->

      {/* Main brand name */}
      <text
        x="40"
        y="30"
        fontFamily="'Playfair Display', Georgia, serif"
        fontWeight="700"
        fontSize="28"
        letterSpacing="-0.5"
      >
        Sponbit
      </text>

      {/* Tagline */}
      <text
        x="41"
        y="45"
        fontFamily="'Inter', system-ui, sans-serif"
        fontWeight="500"
        fontSize="8"
        letterSpacing="3"
        opacity="0.55"
      >
        FOOD + CULTURE
      </text>
    </svg>
  );
}
