/** Dãy 5 sao; `value` có thể lẻ (4,3 → 4 sao đầy + 1 sao tô 30%). */
export function Stars({ value, size = 16, label }: { value: number; size?: number; label?: string }) {
  return (
    <span className="stars" role="img" aria-label={label ?? `${formatRating(value)} trên 5 sao`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <defs>
              <linearGradient id={`star-${i}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="#FFC94D" />
                <stop offset={`${fill * 100}%`} stopColor="#E9E0D4" />
              </linearGradient>
            </defs>
            <path
              d="M12,2.5 L14.9,8.6 L21.5,9.4 L16.6,13.9 L17.9,20.5 L12,17.2 L6.1,20.5 L7.4,13.9 L2.5,9.4 L9.1,8.6 Z"
              fill={`url(#star-${i}-${Math.round(fill * 100)})`}
              stroke="#3B3547"
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </span>
  );
}

export function formatRating(value: number): string {
  return value.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function starText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}
