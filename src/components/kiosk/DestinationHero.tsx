"use client";

interface Props {
  origin: string;
  destination: string;
  region: string;
  prominent?: boolean;
}

export default function DestinationHero({
  origin,
  destination,
  region,
  prominent = false,
}: Props) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">
        {region} Region · from {origin}
      </div>
      <h2
        className={`font-space font-bold tracking-tight text-white truncate ${
          prominent ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl"
        }`}
      >
        {destination}
      </h2>
    </div>
  );
}
