import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Home, Wallet, Receipt } from "lucide-react"

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
  /** compat: hay flows que traen resultado único */
  resultado?: QuoteResultado
  /** nuevo: lista de resultados */
  resultados?: QuoteResultado[]
}

const toCLP = (n: number) =>
  Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(Number(n || 0))

/** Busca base de AGENCIA; si no hay, toma el primero disponible */
function getBaseResult(q: QuoteData | null): QuoteResultado | null {
  if (!q) return null
  const many = q.resultados && q.resultados.length ? q.resultados : (q.resultado ? [q.resultado] : [])
  if (!many || many.length === 0) return null
  const agency = many.find(r => String(r?.tipo_entrega ?? "").toUpperCase() === "AGENCIA")
  return agency ?? many[0]
}

export function QuoteResult({
  quote,
  onSelect,
}: {
  quote: QuoteData | null
  /** opcional: callback si quieres capturar la opción elegida */
  onSelect?: (opt: QuoteResultado) => void
}) {
  const base = getBaseResult(quote)
  const match = quote?.match

  if (!quote || !base || !match) {
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

  // Precio base (Agencia)
  const basePrice = Number(base.tarifa_pullman_nueva) || 0

  // Derivados según tu lógica:
  const domicilioPrice = Math.round(basePrice * 1.20)   // +20%
  const pagoDestinoPrice = Math.round(basePrice * 1.15) // +15%

  // Armamos objetos "sintéticos" para las otras opciones
  const domicilio: QuoteResultado = {
    ...base,
    tipo_entrega: "DOMICILIO",
    nombre_tarifa: base.nombre_tarifa || "Domicilio (+20%)",
    tarifa_pullman_nueva: domicilioPrice,
  }
  const pagoDestino: QuoteResultado = {
    ...base,
    tipo_entrega: "PAGO EN DESTINO",
    nombre_tarifa: base.nombre_tarifa || "Pago en destino (+15%)",
    tarifa_pullman_nueva: pagoDestinoPrice,
  }

  const cards: Array<{
    title: string
    icon: React.ReactNode
    data: QuoteResultado
  }> = [
    { title: "Entrega en Agencia", icon: <Building2 className="h-4 w-4 text-[#003fa2]" />, data: base },
    { title: "Entrega a Domicilio (+20%)", icon: <Home className="h-4 w-4 text-[#003fa2]" />, data: domicilio },
    { title: "Pago en destino (+15%)", icon: <Wallet className="h-4 w-4 text-[#003fa2]" />, data: pagoDestino },
  ]

  return (
    <Card className="w-full shadow-lg border-0 bg-gradient-to-br from-gray-50 to-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-[#003fa2] flex items-center gap-2">
          <Receipt className="h-6 w-6 text-[#ff5500cc]" />
          Resultado de la cotización
        </CardTitle>
        <div className="h-1 w-16 bg-[#ff5500cc] rounded-full"></div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid lg:grid-cols-3 sm:grid-cols-2 gap-4">
          {cards.map(({ title, icon, data }, idx) => (
            <Card key={idx} className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {icon}
                  <h3 className="text-base font-semibold text-gray-800">{title}</h3>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="text-sm text-gray-500">Tarifa</div>
                  <div className="text-lg font-bold">{toCLP(Number(data.tarifa_pullman_nueva))}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500">Servicio</div>
                    <div className="font-medium">{data.tipo_servicio}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Entrega</div>
                    <div className="font-medium">{data.tipo_entrega}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500">Nombre tarifa</div>
                    <div className="font-medium">{data.nombre_tarifa || "—"}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500">Fecha compromiso</div>
                    <div className="font-medium">
                      {data.fecha_compromiso ? new Date(data.fecha_compromiso).toLocaleString("es-CL") : "—"}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Ruta: <span className="font-medium">{match.origen} → {match.destino}</span> · Peso:{" "}
                  <span className="font-medium">{match.pesoSolicitado} kg</span>
                </div>

                {onSelect && (
                  <div className="pt-1">
                    <Button
                      className="w-full bg-[#003fa2] hover:bg-[#00328a] text-white"
                      onClick={() => onSelect(data)}
                    >
                      Elegir esta opción
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}