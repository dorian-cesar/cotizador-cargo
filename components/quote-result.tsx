import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Home, Receipt, Info } from "lucide-react";

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
  tipo_entrega: string; // "AGENCIA" | "DOMICILIO" | otros
  nombre_tarifa: string;
  fecha_compromiso: string;
  [k: string]: any; // resto de campos del backend (peso_cotizar, descuento, etc.)
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

function byEntrega(arr: QuoteResultado[] | undefined, value: string): QuoteResultado | null {
  if (!arr || arr.length === 0) return null;
  const v = String(value).toUpperCase();
  return arr.find((r) => String(r?.tipo_entrega ?? "").toUpperCase() === v) ?? null;
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
            Completa el formulario y presiona <span className="font-medium">Cotizar</span> para ver las opciones aquí.
          </p>
        </CardContent>
      </Card>
    );
  }

  type CardOption = {
    key: "AGENCIA" | "DOMICILIO";
    title: string;
    icon: React.ReactNode;
    result: QuoteResultado | null; // null cuando no exista ese tipo_entrega
  };

  const options: CardOption[] = [
    {
      key: "AGENCIA",
      title: "Entrega en Agencia",
      icon: <Building2 className="h-4 w-4 text-[#003fa2]" />,
      result: agencia, // si no existe, mostrará mensaje de no disponible
    },
    {
      key: "DOMICILIO",
      title: "Entrega a Domicilio",
      icon: <Home className="h-4 w-4 text-[#003fa2]" />,
      result: domicilio, // si no existe, mostrará mensaje de no disponible
    },
  ];

  // UX: si no hay agencia pero sí domicilio, seleccionar DOMICILIO por defecto
  const [selected, setSelected] = React.useState<CardOption["key"]>(agencia ? "AGENCIA" : "DOMICILIO");
  const selectedOption = options.find((o) => o.key === selected) || options[0];

  function handleSelect(opt: CardOption) {
    setSelected(opt.key);
    if (opt.result) onSelect?.(opt.result);
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

      <CardContent className="space-y-4">
        {/* Botones/Opciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((opt) => {
            const price = opt.result ? Math.max(0, Number(opt.result.tarifa_pullman_nueva) || 0) : 0;
            const fechaCompromiso = opt.result?.fecha_compromiso ? new Date(opt.result.fecha_compromiso) : null;

            return (
              <div
                key={opt.key}
                className={`rounded-xl border ${
                  selected === opt.key ? "border-[#003fa2] bg-white" : "border-gray-200 bg-white"
                } p-4 shadow-sm flex flex-col gap-3`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    <h3 className="font-semibold text-[#003fa2]">{opt.title}</h3>
                  </div>
                </div>

                {/* Precio principal o mensaje */}
                <div>
                  {opt.result ? (
                    <div className="text-2xl font-bold text-gray-900">{toCLP(price)}</div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      {opt.key === "Domicilio"
                        ? "No hay entrega a domicilio para esta ruta"
                        : "No hay servicio de agencia para esta ruta"}
                    </div>
                  )}
                </div>

                {/* Detalles */}
                <div className="mt-1 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500">Tipo de servicio</div>
                    <div className="font-medium">{opt.result?.tipo_servicio ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Tipo de entrega</div>
                    <div className="font-medium">{opt.result?.tipo_entrega ?? opt.key}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500">Tarifa</div>
                    <div className="font-medium truncate">{opt.result?.nombre_tarifa ?? "-"}</div>
                  </div>                  
                </div>

                <Button
                  onClick={() => handleSelect(opt)}
                  className="w-full bg-[#003fa2] hover:bg-[#002b73]"
                  disabled={!opt.result}
                >
                  Seleccionar
                </Button>
              </div>
            );
          })}
        </div>        
      </CardContent>
    </Card>
  );
}