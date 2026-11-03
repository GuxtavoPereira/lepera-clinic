type Props = { space: "reception" | "consultation"; className?: string };

/** Original illustration; it does not represent a photograph of the clinic. */
export function ClinicSpace({ space, className }: Props) {
  return (
    <svg
      viewBox="0 0 640 440"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="640" height="440" rx="24" fill="#e8f2ee" />
      <path d="M0 334h640v106H0z" fill="#d6e5df" />
      <rect x="70" y="42" width="198" height="238" rx="88" fill="#faf7ed" />
      <rect x="90" y="61" width="158" height="200" rx="70" fill="#c1ded6" />
      <path d="M169 64v195M92 161h153" stroke="#faf7ed" strokeWidth="10" />
      <path
        d="M99 260h142"
        stroke="#fffdf5"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <rect x="381" y="63" width="108" height="116" rx="6" fill="#fffdf5" />
      <path
        d="M404 148c35-72 32-38 63-65M404 146c30-25 38-12 63-26"
        stroke="#8ab4a1"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M537 329V201" stroke="#6a8e7f" strokeWidth="7" />
      <path
        d="M537 244c-48-2-54-37-40-52 29 2 43 25 40 52M539 274c48-9 52-42 34-55-28 8-41 28-34 55M536 220c25-28 13-53-3-57-17 21-14 39 3 57"
        fill="#589d87"
      />
      <path d="M509 319h57l-9 54h-39z" fill="#b78060" />
      {space === "reception" ? (
        <>
          <rect
            x="171"
            y="244"
            width="287"
            height="110"
            rx="15"
            fill="#4f8e7c"
          />
          <path d="M186 354v25M440 354v25" stroke="#396d5f" strokeWidth="9" />
          <path
            d="M163 246h306"
            stroke="#fbf3df"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <rect x="258" y="198" width="69" height="44" rx="4" fill="#416e64" />
          <path d="M291 241v-13" stroke="#31584f" strokeWidth="8" />
          <path d="M366 237h31v-27h-31z" fill="#cb956e" />
          <path
            d="M381 211v-24M380 203c-20-1-23-16-17-23 14 1 19 11 17 23M381 196c20-1 23-16 17-23-14 1-19 11-17 23"
            fill="#74a98a"
          />
          <rect x="64" y="308" width="68" height="43" rx="12" fill="#d1a984" />
          <path d="M74 347v26M122 347v26" stroke="#957151" strokeWidth="7" />
        </>
      ) : (
        <>
          <path
            d="M90 310c0-24 17-41 39-41h110c22 0 36 17 36 41v39H90z"
            fill="#94b6a0"
          />
          <rect
            x="107"
            y="244"
            width="147"
            height="67"
            rx="27"
            fill="#adc8b3"
          />
          <path d="M111 346v25M255 346v25" stroke="#6b8270" strokeWidth="8" />
          <path
            d="M383 299c0-30 15-47 39-47h13c22 0 35 18 35 47v49h-87z"
            fill="#b88766"
          />
          <path d="M392 345v26M460 345v26" stroke="#85604a" strokeWidth="8" />
          <ellipse cx="328" cy="332" rx="45" ry="13" fill="#f8efdc" />
          <path d="M300 338v38M354 338v38" stroke="#a78f70" strokeWidth="7" />
          <rect x="313" y="307" width="29" height="18" rx="3" fill="#4f8e7c" />
        </>
      )}
      <ellipse
        cx="320"
        cy="396"
        rx="228"
        ry="14"
        fill="#b7cfc1"
        opacity=".42"
      />
    </svg>
  );
}

export function ClinicGallery() {
  return (
    <section
      className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20"
      aria-labelledby="spaces-title"
    >
      <div className="mb-8 max-w-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
          Um lugar para conversar
        </p>
        <h2
          id="spaces-title"
          className="text-3xl font-semibold tracking-tight text-foreground"
        >
          O cuidado começa no acolhimento.
        </h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Da recepção ao consultório, cada etapa da experiência deve respeitar
          seu tempo e sua privacidade.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {(["reception", "consultation"] as const).map((space) => (
          <figure
            key={space}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <ClinicSpace space={space} className="aspect-[16/11] w-full" />
            <figcaption className="p-5">
              <p className="font-semibold text-foreground">
                {space === "reception"
                  ? "Recepção e acolhimento"
                  : "Espaço de escuta"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ilustração dos ambientes
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
