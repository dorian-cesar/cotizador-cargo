import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Home, Receipt } from "lucide-react"

/** Tipos compartidos con el form */
export type QuoteMatch = {
  origen: string
  destino: string
  pesoSolicitado: number
  bucketSeleccionado: number
}

export type QuoteResultado = {
  tarifa_pullman_nueva: string | number
  tipo_servicio: string
  tipo_entrega: string
  nombre_tarifa: string
  fecha_compromiso: string
  [k: string]: any
}

export type QuoteData = {
  match: QuoteMatch
  /** Compat: un solo resultado */
  resultado?: QuoteResultado
  /** Nuevo: múltiples resultados */
  resultados?: QuoteResultado[]
}

const toCLP = (n: number) =>
  Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Number(n || 0))

export function QuoteResult({
  quote,
  onSelect,
}: {
  quote: QuoteData | null
  /** opcional: callback si quieres manejar “Elegir esta opción” */
  onSelect?: (opt: QuoteResultado) => void
}) {
  if (!quote) {
    return (
      <Card className="w-full shadow-lg border-0 bg-gradient-to-br from-gray-50 to-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-[#003fa2] flex items-center gap-2">
            <Receipt className="h-6 w-6 text-[#ff5500cc]" />
            Resultado de la cotización
          </CardTitle>
          <div className="h-1 w-16 bg-[#ff5500cc] rounded-full"></div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Completa el formulario y presiona <span className="font-medium">Cotizar</span> para ver las opciones aquí.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Acepta tanto 1 como N resultados
  const all = quote?.resultados?.length
  ? quote.resultados
  : (quote?.resultado ? [quote.resultado] : []);

  // Agrupar por tipo_entrega
  const grupos: Record<"AGENCIA" | "DOMICILIO" | "OTROS", QuoteResultado[]> = {
    AGENCIA: [],
    DOMICILIO: [],
    OTROS: [],
  }

  for (const r of all) {
    const tipo = String(r.tipo_entrega || "").toUpperCase()
    if (tipo === "AGENCIA") grupos.AGENCIA.push(r)
    else if (tipo === "DOMICILIO") grupos.DOMICILIO.push(r)
    else grupos.OTROS.push(r)
  }

  const Section = ({
    title,
    icon,
    items,
  }: {
    title: string
    icon: React.ReactNode
    items: QuoteResultado[]
  }) => {
    if (!items || items.length === 0) return null
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((it, idx) => (
            <Card key={idx} className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="text-sm text-gray-500">Tarifa</div>
                  <div className="text-lg font-bold">{toCLP(it.tarifa_pullman_nueva as number)}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500">Servicio</div>
                    <div className="font-medium">{it.tipo_servicio}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Entrega</div>
                    <div className="font-medium">{it.tipo_entrega}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500">Nombre tarifa</div>
                    <div className="font-medium">{it.nombre_tarifa}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500">Fecha compromiso</div>
                    <div className="font-medium">
                      {it.fecha_compromiso ? new Date(it.fecha_compromiso).toLocaleString("es-CL") : "—"}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Ruta: <span className="font-medium">{quote.match.origen} → {quote.match.destino}</span> · Peso:{" "}
                  <span className="font-medium">{quote.match.pesoSolicitado} kg</span>
                </div>

                {onSelect && (
                  <div className="pt-1">
                    <Button
                      className="w-full bg-[#003fa2] hover:bg-[#00328a] text-white"
                      onClick={() => onSelect(it)}
                    >
                      Elegir esta opción
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full shadow-lg border-0 bg-gradient-to-br from-gray-50 to-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-[#003fa2] flex items-center gap-2">
          <Receipt className="h-6 w-6 text-[#ff5500cc]" />
          Resultado de la cotización
        </CardTitle>
        <div className="h-1 w-16 bg-[#ff5500cc] rounded-full"></div>
      </CardHeader>

      <CardContent className="space-y-8">
        <Section
          title="Opciones en Agencia"
          icon={<Building2 className="h-4 w-4 text-[#003fa2]" />}
          items={grupos.AGENCIA}
        />
        <Section
          title="Opciones a Domicilio"
          icon={<Home className="h-4 w-4 text-[#003fa2]" />}
          items={grupos.DOMICILIO}
        />
        <Section
          title="Otras opciones"
          icon={<Receipt className="h-4 w-4 text-[#003fa2]" />}
          items={grupos.OTROS}
        />

        {/* Si por alguna razón no vino nada */}
        {all.length === 0 && (
          <div className="text-sm text-gray-600">
            No se encontraron alternativas para esta combinación.
          </div>
        )}
      </CardContent>
    </Card>
  )
}