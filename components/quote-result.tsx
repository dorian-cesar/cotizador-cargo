import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Home, Wallet, Receipt, Info } from "lucide-react";

/** Tipos compartidos con el form */
export type QuoteMatch = {
  origen: string;
  destino: string;
  pesoSolicitado: number;
  bucketSeleccionado: number;
};

export type QuoteResultado = {
  tarifa_pullman_nueva: string | number;
  tipo_servicio: string;
  tipo_entrega: string;
  nombre_tarifa: string;
  fecha_compromiso: string;
  [k: string]: any;
};

export type QuoteData = {
  match: QuoteMatch;
  /** compat: resultado único */
  resultado?: QuoteResultado;
  /** lista completa de resultados */
  resultados?: QuoteResultado[];
};

const toCLP = (n: number) =>
  Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Number(n || 0));

/** Busca base de AGENCIA; si no hay, toma el primero disponible */
function getBaseResult(q: QuoteData | null): QuoteResultado | null {
  if (!q) return null;
  const many = q.resultados && q.resultados.length ? q.resultados : (q.resultado ? [q.resultado] : []);
  if (!many || many.length === 0) return null;
  const agency = many.find((r) => String(r?.tipo_entrega ?? "").toUpperCase() === "AGENCIA");
  return agency ?? many[0];
}

type CardOption = {
  key: "AGENCIA" | "DOMICILIO_20" | "PAGO_DESTINO_15";
  title: string;
  icon: React.ReactNode;
  result: QuoteResultado;
  isDerived?: boolean;
  deltaPct?: number; // +0.20, +0.15 para mostrar diferencia
};

export function QuoteResult({
  quote,
  onSelect,
}: {
  quote: QuoteData | null;
  /** opcional: callback cuando el usuario elige una opción */
  onSelect?: (opt: QuoteResultado) => void;
}) {
  const base = getBaseResult(quote);
  const match = quote?.match;

  if (!quote || !base || !match) {
    return (
      <Card className="w-full shadow-lg border-0 bg-gradient-to-br from-gray-50 to-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-[#003fa2] flex items-center gap-2">
            <Receipt className="h-6 w-6 text-[#ff5500cc]" />
            Resultado de la cotización
          </CardTitle>
          <div className="h-1 w-16 bg-[#ff5500cc] rounded-full" />
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Completa el formulario y presiona <span className="font-medium">Cotizar</span> para ver las opciones aquí.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Precio base (Agencia)
  const basePrice = Math.max(0, Number(base.tarifa_pullman_nueva) || 0);

  // Derivados: +20% domicilio, +15% pago destino (redondeo al peso)
  const domicilioPrice = Math.round(basePrice * 1.2);
  const pagoDestinoPrice = Math.round(basePrice * 1.15);

  // Objetos "sintéticos" derivados de la base
  const domicilio: QuoteResultado = {
    ...base,
    tipo_entrega: "DOMICILIO",
    nombre_tarifa: base.nombre_tarifa || "Domicilio",
    tarifa_pullman_nueva: domicilioPrice,
  };
  const pagoDestino: QuoteResultado = {
    ...base,
    tipo_entrega: "PAGO EN DESTINO",
    nombre_tarifa: base.nombre_tarifa || "Pago en destino",
    tarifa_pullman_nueva: pagoDestinoPrice,
  };

  const options: CardOption[] = [
    {
      key: "AGENCIA",
      title: "Entrega en Agencia",
      icon: <Building2 className="h-4 w-4 text-[#003fa2]" />,
      result: base,
      isDerived: false,
      deltaPct: 0,
    },
    {
      key: "DOMICILIO_20",
      title: "Entrega a Domicilio",
      icon: <Home className="h-4 w-4 text-[#003fa2]" />,
      result: domicilio,
      isDerived: true,
      deltaPct: 0.2,
    },
    {
      key: "PAGO_DESTINO_15",
      title: "Pago en destino",
      icon: <Wallet className="h-4 w-4 text-[#003fa2]" />,
      result: pagoDestino,
      isDerived: true,
      deltaPct: 0.15,
    },
  ];

  const [selected, setSelected] = React.useState<CardOption["key"]>("AGENCIA");

  function handleSelect(opt: CardOption) {
    setSelected(opt.key);
    onSelect?.(opt.result);
  }

  function deltaText(pct?: number, price?: number) {
    if (!pct || !price) return "";
    const diff = Math.round(price - basePrice);
    const pctLabel = Math.round(pct * 100);
    return `+${toCLP(diff)} (+${pctLabel}% vs. Agencia)`;
  }

  return (
    <Card className="w-full shadow-lg border-0 bg-gradient-to-br from-gray-50 to-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-[#003fa2] flex items-center gap-2">
          <Receipt className="h-6 w-6 text-[#ff5500cc]" />
          Resultado de la cotización
        </CardTitle>
        <div className="h-1 w-16 bg-[#ff5500cc] rounded-full" />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Resumen de ruta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
          <span>
            <span className="text-gray-500">Ruta:</span>{" "}
            <span className="font-medium">
              {match.origen} → {match.destino}
            </span>
          </span>
          <span className="hidden sm:inline text-gray-300">•</span>
          <span>
            <span className="text-gray-500">Peso:</span>{" "}
            <span className="font-medium">{match.pesoSolicitado} kg</span>
          </span>
        </div>

        {/* Cards como radiogroup accesible */}
        <div
          role="radiogroup"
          aria-label="Opciones de entrega"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {options.map((opt) => {
            const price = Number(opt.result.tarifa_pullman_nueva) || 0;
            const isSelected = selected === opt.key;

            return (
              <div
                key={opt.key}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => handleSelect(opt)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(opt);
                  }
                }}
                className={[
                  "group cursor-pointer select-none rounded-xl border bg-white p-4 shadow-sm transition",
                  "hover:shadow-md focus:outline-none",
                  isSelected
                    ? "border-[#003fa2] ring-2 ring-[#003fa2]/30"
                    : "border-gray-200",
                ].join(" ")}
              >
                {/* Header: icono + título + badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    <h3 className="text-base font-semibold text-gray-800">{opt.title}</h3>
                  </div>

                  {/* Badges
                  <div className="flex items-center gap-1">
                    {opt.key === "AGENCIA" && (
                      <span className="rounded-full bg-emerald-50 text-emerald-700 text-[11px] px-2 py-1 font-medium">
                        Recomendado
                      </span>
                    )}
                    {opt.isDerived && (
                      <span
                        className="rounded-full bg-orange-50 text-orange-700 text-[11px] px-2 py-1 font-medium"
                        title="Calculado en base a la tarifa de Agencia"
                      >
                        Calculado
                      </span>
                    )}
                  </div> */}
                </div>

                {/* Precio destacado */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div className="text-sm text-gray-500">Tarifa</div>
                  <div className="text-2xl font-bold tracking-tight">{toCLP(price)}</div>
                </div>

                {/* Diferencia vs Agencia
                {opt.deltaPct ? (
                  <div className="mt-1 text-xs text-gray-500">{deltaText(opt.deltaPct, price)}</div>
                ) : (
                  <div className="mt-1 text-[11px] text-gray-500">Tarifa base de Agencia</div>
                )} */}

                {/* Detalles */}
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500">Servicio</div>
                    <div className="font-medium">{opt.result.tipo_servicio || "—"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Entrega</div>
                    <div className="font-medium">{opt.result.tipo_entrega || "—"}</div>
                  </div>
                  {/* <div className="col-span-2">
                    <div className="text-gray-500">Nombre tarifa</div>
                    <div className="font-medium truncate">{opt.result.nombre_tarifa || "—"}</div>
                  </div> */}
                  {/* <div className="col-span-2">
                    <div className="text-gray-500">Fecha compromiso</div>
                    <div className="font-medium">
                      {opt.result.fecha_compromiso
                        ? new Date(opt.result.fecha_compromiso).toLocaleString("es-CL")
                        : "—"}
                    </div>
                  </div> */}
                </div>

                {/* CTA */}
                <div className="mt-4">
                  <Button
                    className={[
                      "w-full transition",
                      isSelected
                        ? "bg-[#003fa2] hover:bg-[#00328a] text-white"
                        : "bg-[#ff5500cc] hover:bg-[#ff5500] text-white",
                    ].join(" ")}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(opt);
                    }}
                  >
                    {isSelected ? "Seleccionado" : "Elegir esta opción"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nota contextual */}
        <div className="flex items-start gap-2 text-xs text-gray-500">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#003fa2]" />
          <p>
            Los valores de <span className="font-medium">Domicilio</span> y <span className="font-medium">Pago en destino</span> se calculan desde la tarifa de Agencia (+20% y +15% respectivamente).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}