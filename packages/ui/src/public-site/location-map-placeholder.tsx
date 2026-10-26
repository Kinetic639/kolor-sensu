import { MapPin } from "lucide-react";
import { PrimaryButton } from "./actions";

/** Local decorative artwork; no map provider is contacted by this placeholder. */
export function LocationMapPlaceholder({
  address,
  onShowMap,
}: {
  address: string;
  onShowMap?: () => void;
}) {
  return (
    <div className="ks-location-map__placeholder">
      <svg
        className="ks-location-map__sketch"
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M-30 35 Q120 3 247 65 T490 43 T830 70 L830 520 H-30Z"
          fill="#e1eadc"
        />
        <path
          d="M470 -30 Q430 90 530 153 T800 172 V520 H620 Q690 370 550 300 T470 -30"
          fill="#f4d9d6"
        />
        <path
          d="M-30 350 Q110 270 205 350 T430 337 T830 260"
          fill="none"
          stroke="#c4d7c0"
          strokeWidth="85"
        />
        <g fill="none" stroke="#faf8f1" strokeLinecap="round">
          <path
            d="M-20 96 Q170 150 280 98 T810 85 M-20 275 Q200 205 340 273 T825 310 M140 -20 Q90 190 220 300 T280 520 M600 -20 Q650 140 560 270 T570 520"
            strokeWidth="25"
          />
          <path
            d="M-20 430 Q230 360 420 426 T810 430 M365 -20 Q320 130 385 235 T425 520"
            strokeWidth="15"
          />
        </g>
        <path
          d="M215 350 Q260 300 310 300 T400 205"
          fill="none"
          stroke="#6f956e"
          strokeWidth="3"
          strokeDasharray="5 10"
          strokeLinecap="round"
        />
      </svg>
      <div className="ks-location-map__pin" aria-hidden="true">
        <MapPin strokeWidth={1.4} />
      </div>
      <div className="ks-location-map__invitation">
        <p className="ks-location-map__title">Mapa dojazdu</p>
        <p className="ks-location-map__address">{address}</p>
        <PrimaryButton onClick={onShowMap} arrow>
          Pokaż mapę
        </PrimaryButton>
        <p className="ks-location-map__consent">
          Klikając „Pokaż mapę”, zgadzasz się na wczytanie Map Google i ich
          plików cookies podczas tej wizyty.
        </p>
      </div>
    </div>
  );
}
