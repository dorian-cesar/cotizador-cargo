import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Home, Receipt, Info, Wallet } from "lucide-react";

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
  tipo_entrega: string; // "AGENCIA" | "DOMICILIO" | derivados
  nombre_tarifa: string;
  fecha_compromiso: string;
  [k: string]: any; // resto de campos del backend
};

export type QuoteData = {
  match: QuoteMatch;
  /** compat: algunos endpoints devuelven un único resultado */
  resultado?: QuoteResultado;
  /** nuevo: lista de opciones */
  resultados?: QuoteResultado[];
};

/* ===================== Helpers ===================== */
const toCLP = (n: number) =>
  Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(n);

function byEntrega(
  arr: QuoteResultado[] | undefined,
  value: string
): QuoteResultado | null {
  if (!arr || arr.length === 0) return null;
  const v = String(value).toUpperCase();
  return (
    arr.find((r) => String(r?.tipo_entrega ?? "").toUpperCase() === v) ?? null
  );
}

/* Recuadro reutilizable para un card de opción */
function OptionCard({
  active,
  title,
  icon,
  result,
  note,
  onSelect,
}: {
  active: boolean;
  title: string;
  icon: React.ReactNode;
  result: QuoteResultado | null;
  note?: string;
  onSelect: () => void;
}) {
  const price = result ? Math.max(0, Number(result.tarifa_pullman_nueva) || 0) : 0;
  const fechaCompromiso = result?.fecha_compromiso
    ? new Date(result.fecha_compromiso)
    : null;

  const isAgencia = title.toLowerCase().includes("agencia");
  const unavailable = !result
    ? isAgencia
      ? "No hay servicio de agencia para esta ruta"
      : "No hay entrega a domicilio para esta ruta"
    : null;

  return (
    <div
      className={[
        "rounded-2xl border shadow-sm bg-white p-4 md:p-5",
        "flex flex-col gap-3",
        "min-h-[220px] md:min-h-[260px]",
        active ? "border-[#003fa2]" : "border-gray-200",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-[#003fa2]">{title}</h3>
        </div>
      </div>

      <div className="flex-1">
        {result ? (
          <>
            <div className="text-2xl font-bold text-gray-900">{toCLP(price)}</div>
            {note ? <div className="text-xs text-gray-500 mt-1">{note}</div> : null}
          </>
        ) : (
          <div className="text-sm text-gray-500 italic">{unavailable}</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-500">Tipo de servicio</div>
          <div className="font-medium">{result?.tipo_servicio ?? "-"}</div>
        </div>
        <div>
          <div className="text-gray-500">Tipo de entrega</div>
          <div className="font-medium">{result?.tipo_entrega ?? "-"}</div>
        </div>
        <div className="col-span-2">
          <div className="text-gray-500">Tarifa</div>
          <div className="font-medium truncate">{result?.nombre_tarifa ?? "-"}</div>
        </div>
        <div className="col-span-2">
          <div className="text-gray-500">Fecha compromiso</div>
          <div className="font-medium">
            {fechaCompromiso ? fechaCompromiso.toLocaleString() : "-"}
          </div>
        </div>
      </div>

      <Button
        onClick={onSelect}
        className="w-full bg-[#003fa2] hover:bg-[#002b73]"
        disabled={!result}
      >
        Seleccionar
      </Button>
    </div>
  );
}

/* ===================== UI ===================== */
export function QuoteResult({
  quote,
  onSelect,
}: {
  quote: QuoteData | null;
  /** opcional: callback cuando el usuario elige una opción */
  onSelect?: (opt: QuoteResultado) => void;
}) {
  const many: QuoteResultado[] = React.useMemo(() => {
    if (!quote) return [];
    if (quote.resultados && quote.resultados.length) return quote.resultados;
    return quote.resultado ? [quote.resultado] : [];
  }, [quote]);

  const agencia = React.useMemo(() => byEntrega(many, "AGENCIA"), [many]);
  const domicilio = React.useMemo(() => byEntrega(many, "DOMICILIO"), [many]);

  // Estado inicial (cuando no hay datos suficientes)
  if (!quote || (many.length === 0 && !agencia && !domicilio)) {
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
          <p className="text-sm text-gray-600">
            Completa el formulario y presiona{" "}
            <span className="font-medium">Cotizar</span> para ver las opciones
            aquí.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Precio base para los derivados "pago al momento":
  // Se toma del mejor resultado disponible (prioriza Agencia; si no, Domicilio; si no, primero de many).
  const baseRef: QuoteResultado | null =
    agencia ?? domicilio ?? (many[0] ?? null);
  const basePrice = baseRef
    ? Math.max(0, Number(baseRef.tarifa_pullman_nueva) || 0)
    : 0;

  // Derivados: Pago al momento (solo existen si existe el servicio base correspondiente)
  const agenciaPagoRetiro: QuoteResultado | null = agencia
    ? {
        ...agencia,
        tipo_entrega: "AGENCIA - PAGO AL RETIRAR",
        nombre_tarifa: agencia.nombre_tarifa || "Agencia (Pago al Retirar)",
        tarifa_pullman_nueva: Math.round(basePrice * 1.15),
      }
    : null;

  const domicilioPagoEntrega: QuoteResultado | null = domicilio
    ? {
        ...domicilio,
        tipo_entrega: "DOMICILIO - PAGO AL ENTREGAR",
        nombre_tarifa: domicilio.nombre_tarifa || "Domicilio (Pago al Entregar)",
        tarifa_pullman_nueva: Math.round(basePrice * 1.2),
      }
    : null;

  type CardKey =
    | "AGENCIA"
    | "DOMICILIO"
    | "AGENCIA_PAGO_RETIRO_15"
    | "DOMICILIO_PAGO_ENTREGA_20";

  // Ordenamiento fijo 2×2:
  // Columna izquierda: Agencia (arriba) + Agencia Pago (abajo)
  // Columna derecha: Domicilio (arriba) + Domicilio Pago (abajo)
  const left = [
    {
      key: "AGENCIA" as CardKey,
      title: "Entrega en Agencia",
      icon: <Building2 className="h-4 w-4 text-[#003fa2]" />,
      result: agencia,
      note: undefined,
    },
    {
      key: "AGENCIA_PAGO_RETIRO_15" as CardKey,
      title: "Agencia (Pago al Retirar)",
      icon: (
        <span className="inline-flex items-center gap-1">
          <Building2 className="h-4 w-4 text-[#003fa2]" />
          <Wallet className="h-4 w-4 text-[#003fa2]" />
        </span>
      ),
      result: agenciaPagoRetiro,
      note: baseRef ? "Incluye +15% sobre precio base" : undefined,
    },
  ];

  const right = [
    {
      key: "DOMICILIO" as CardKey,
      title: "Entrega a Domicilio",
      icon: <Home className="h-4 w-4 text-[#003fa2]" />,
      result: domicilio,
      note: undefined,
    },
    {
      key: "DOMICILIO_PAGO_ENTREGA_20" as CardKey,
      title: "Domicilio (Pago al Entregar)",
      icon: (
        <span className="inline-flex items-center gap-1">
          <Home className="h-4 w-4 text-[#003fa2]" />
          <Wallet className="h-4 w-4 text-[#003fa2]" />
        </span>
      ),
      result: domicilioPagoEntrega,
      note: baseRef ? "Incluye +20% sobre precio base" : undefined,
    },
  ];

  // Selección (para mantener tu callback onSelect):
  const initialSelected: CardKey =
    agencia ? "AGENCIA" : domicilio ? "DOMICILIO" : "AGENCIA";
  const [selected, setSelected] = React.useState<CardKey>(initialSelected);

  return (
    <Card className="w-full shadow-lg border-0 bg-gradient-to-br from-gray-50 to-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-[#003fa2] flex items-center gap-2">
          <Receipt className="h-6 w-6 text-[#ff5500cc]" />
          Resultado de la cotización
        </CardTitle>
        <div className="h-1 w-16 bg-[#ff5500cc] rounded-full" />
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Grilla 2×2: dos columnas, cada una con dos filas (arriba/abajo) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Columna izquierda */}
          <div className="grid grid-rows-2 gap-4 md:gap-6">
            {left.map((opt) => (
              <OptionCard
                key={opt.key}
                active={selected === opt.key}
                title={opt.title}
                icon={opt.icon}
                result={opt.result}
                note={opt.note}
                onSelect={() => {
                  setSelected(opt.key);
                  if (opt.result) {
                    // Disparamos callback si existe resultado
                    // (mantiene compatibilidad con tu flujo)
                    (typeof opt.result !== "undefined") && (onSelect?.(opt.result));
                  }
                }}
              />
            ))}
          </div>

          {/* Columna derecha */}
          <div className="grid grid-rows-2 gap-4 md:gap-6">
            {right.map((opt) => (
              <OptionCard
                key={opt.key}
                active={selected === opt.key}
                title={opt.title}
                icon={opt.icon}
                result={opt.result}
                note={opt.note}
                onSelect={() => {
                  setSelected(opt.key);
                  if (opt.result) {
                    onSelect?.(opt.result);
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Nota contextual */}
        <div className="flex items-start gap-2 text-xs text-gray-500">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#003fa2]" />
          <p>
            Las opciones <span className="font-medium">Pago al Retirar</span> y{" "}
            <span className="font-medium">Pago al Entregar</span> se calculan a
            partir del precio base de la cotización (
            <span className="font-medium">+15%</span> y{" "}
            <span className="font-medium">+20%</span> respectivamente). Si un
            tipo de entrega no existe para la ruta, verás un aviso
            correspondiente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}