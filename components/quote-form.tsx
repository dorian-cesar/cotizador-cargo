"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Package as PackageIcon, RefreshCcw, Loader2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

/* ===================== Tipos comunes (coinciden con QuoteResult) ===================== */
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
  /** compat: algunos endpoints devuelven un único resultado */
  resultado?: QuoteResultado;
  /** nuevo: lista de opciones */
  resultados?: QuoteResultado[];
};

/* ===================== Tipos locales ===================== */
type Ciudad = {
  id: number;
  ciudad_pullman: string;
  code_pullman: string;
};

type ApiRow = {
  origen: string;
  destino: string;
  peso_final?: string | number;
  peso_cotizar?: string | number;
  tarifa_pullman_nueva: string | number;
  tipo_servicio: string;
  tipo_entrega: string;
  nombre_tarifa: string;
  fecha_compromiso: string;
  [k: string]: any;
};

/* ===================== Helpers ===================== */
const toCLP = (n: number) =>
  Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(n);

function parsePositiveFloat(s: string): number | null {
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) return n;
  return null;
}

function normalizeToQuoteData(
  payload: any,
  submitted: { origen: string; destino: string; peso: number; bucket: number }
): QuoteData {
  // Si ya viene en el formato final, respétalo
  if (payload && typeof payload === "object" && "match" in payload) {
    const q = payload as Partial<QuoteData>;
    if (Array.isArray(q.resultados) && q.resultados.length > 0) {
      return {
        match: q.match as QuoteMatch,
        resultado: q.resultado ?? q.resultados[0],
        resultados: q.resultados,
      };
    }
    if (q.resultado) {
      return {
        match: q.match as QuoteMatch,
        resultado: q.resultado,
        resultados: q.resultados ?? (q.resultado ? [q.resultado] : []),
      };
    }
  }

  // Helper: transformar una fila cruda del backend al shape QuoteResultado
  const mapRow = (row: ApiRow): QuoteResultado => {
    const {
      tarifa_pullman_nueva,
      tipo_servicio,
      tipo_entrega,
      nombre_tarifa,
      fecha_compromiso,
      ...rest
    } = row;
    return {
      ...rest,
      tarifa_pullman_nueva,
      tipo_servicio,
      tipo_entrega,
      nombre_tarifa,
      fecha_compromiso,
    };
  };

  // Caso: array de filas
  if (Array.isArray(payload) && payload.length > 0) {
    const resultados = payload.map(mapRow);
    return {
      match: {
        origen: submitted.origen,
        destino: submitted.destino,
        pesoSolicitado: submitted.peso,
        bucketSeleccionado: submitted.bucket,
      },
      resultado: resultados[0],
      resultados,
    };
  }

  // Caso: payload.data (array o objeto)
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as any).data;
    if (Array.isArray(data) && data.length > 0) {
      const resultados = data.map(mapRow);
      return {
        match: {
          origen: submitted.origen,
          destino: submitted.destino,
          pesoSolicitado: submitted.peso,
          bucketSeleccionado: submitted.bucket,
        },
        resultado: resultados[0],
        resultados,
      };
    }
    if (data && typeof data === "object") {
      const r = mapRow(data as ApiRow);
      return {
        match: {
          origen: submitted.origen,
          destino: submitted.destino,
          pesoSolicitado: submitted.peso,
          bucketSeleccionado: submitted.bucket,
        },
        resultado: r,
        resultados: [r],
      };
    }
  }

  // Caso: objeto único con forma de fila
  if (payload && typeof payload === "object") {
    const r = mapRow(payload as ApiRow);
    return {
      match: {
        origen: submitted.origen,
        destino: submitted.destino,
        pesoSolicitado: submitted.peso,
        bucketSeleccionado: submitted.bucket,
      },
      resultado: r,
      resultados: [r],
    };
  }

  throw new Error("Respuesta de cotización inválida o vacía.");
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Selecciona…",
  disabled = false,
  triggerId,
}: {
  value: string
  onChange: (val: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
  triggerId?: string
}) {
  const [open, setOpen] = React.useState(false)

  const selected = value || ""

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={triggerId}
          type="button"
          disabled={disabled}
          className={cn(
            "w-full inline-flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm",
            "border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff5500cc]/50 focus:border-[#ff5500cc]",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          <span className={cn("truncate", !selected && "text-gray-500")}>
            {selected || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar…" />
          <CommandList>
            <CommandEmpty>Sin coincidencias</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt)
                    setOpen(false)
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected === opt ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{opt}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/* ===================== Componente ===================== */
export function QuoteForm({
  onQuote,
}: {
  /** Si se pasa, enviamos el resultado al padre y NO renderizamos el resultado inline */
  onQuote?: (q: QuoteData) => void;
}) {
  /* ciudades */
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [loadingCiudades, setLoadingCiudades] = useState(false);
  const [ciudadesError, setCiudadesError] = useState<string | null>(null);

  /* formulario */
  const [origen, setOrigen] = useState<string>("");
  const [destino, setDestino] = useState<string>("");
  const [peso, setPeso] = useState<string>("");
  const [largo, setLargo] = useState<string>("");
  const [ancho, setAncho] = useState<string>("");
  const [alto, setAlto] = useState<string>("");
  const [declaredValue, setDeclaredValue] = useState<string>("");

  /* estado de envío */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* fallback (solo si NO hay onQuote) */
  const [localQuote, setLocalQuote] = useState<QuoteData | null>(null);

  const inlineResult = useMemo(() => {
    if (!localQuote) return null
    return (localQuote.resultado ?? localQuote.resultados?.[0]) ?? null
  }, [localQuote])

  const inlineMatch = useMemo(() => localQuote?.match ?? null, [localQuote])

  /* ===================== Cargar ciudades ===================== */
  async function fetchCiudades() {
    setLoadingCiudades(true);
    setCiudadesError(null);
    try {
      const res = await fetch("/api/ciudades", { cache: "no-store" });
      if (!res.ok) throw new Error(`Error ${res.status} al cargar ciudades`);
      const data = (await res.json()) as Ciudad[];
      setCiudades(data);
    } catch (e: any) {
      setCiudadesError(e?.message ?? "Error al cargar ciudades");
    } finally {
      setLoadingCiudades(false);
    }
  }

  useEffect(() => {
    fetchCiudades();
  }, []);

  /* ===================== Derivados ===================== */
  const opcionesCiudades = useMemo(
    () =>
      ciudades
        .map((c) => c.ciudad_pullman)
        .sort((a, b) => a.localeCompare(b)),
    [ciudades]
  );

  const destinosFiltrados = useMemo(() => {
    if (!origen) return opcionesCiudades;
    // Evita permitir el mismo destino que el origen
    return opcionesCiudades.filter((c) => c !== origen);
  }, [origen, opcionesCiudades]);

  // Cálculo informativo de peso volumétrico (L×A×H ÷ 5000)
  const volumetrico = useMemo(() => {
    const L = parsePositiveFloat(largo) ?? 0;
    const A = parsePositiveFloat(ancho) ?? 0;
    const H = parsePositiveFloat(alto) ?? 0;
    if (L && A && H) return (L * A * H) / 5000;
    return 0;
  }, [largo, ancho, alto]);

  /* ===================== Submit ===================== */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const origenVal = origen.trim().toUpperCase();
    const destinoVal = destino.trim().toUpperCase();
    const pesoNum = parsePositiveFloat(peso);

    if (!origenVal || !destinoVal) {
      setError("Debes indicar origen y destino.");
      return;
    }
    if (!pesoNum) {
      setError("El peso debe ser un número mayor a 0.");
      return;
    }

    // permite vacío o >= 0
    const declaredValNum =
      declaredValue.trim() === "" ? null : Number(declaredValue);

    if (declaredValNum !== null && (!Number.isFinite(declaredValNum) || declaredValNum < 0)) {
      setError("El valor declarado debe ser un número mayor o igual a 0.");
      return;
    }

    // Bucket seleccionado: por ahora usamos el mismo peso declarado
    const bucket = pesoNum;

    setLoading(true);
    try {
      const res = await fetch("/api/tarifas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origen: origenVal,
          destino: destinoVal,
          peso: pesoNum,
          valor_declarado: declaredValNum ?? undefined,
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        const maybe = await res.json().catch(() => null);
        throw new Error(
          maybe?.error || maybe?.message || `Error al cotizar: ${res.status}`
        );
      }
      const data = await res.json();

      const quote = normalizeToQuoteData(data, {
        origen: origenVal,
        destino: destinoVal,
        peso: pesoNum,
        bucket,
      });

      if (onQuote) {
        onQuote(quote);
      } else {
        setLocalQuote(quote);
      }
    } catch (err: any) {
      setError(err?.message || "Error inesperado al cotizar.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setOrigen("");
    setDestino("");
    setPeso("");
    setLargo("");
    setAncho("");
    setAlto("");
    setError(null);
    setLocalQuote(null);
    setDeclaredValue("");
  }

  /* ===================== Render ===================== */
  return (
    <Card className="relative w-full shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-[#003fa2] flex items-center gap-2">
          <PackageIcon className="h-6 w-6 text-[#ff5500cc]" />
          Cotiza tu envío
        </CardTitle>     
        <p className="text-sm text-gray-600">
          Selecciona origen/destino e ingresa medidas exactas, peso y valor declarado para obtener tu cotización.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Origen / Destino */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Origen */}
            <div className="space-y-2">
              <Label htmlFor="origin" className="text-sm font-medium text-gray-700">
                Origen
              </Label>
              <SearchableSelect
                triggerId="origin"
                value={origen}                
                onChange={setOrigen}
                options={opcionesCiudades}     
                placeholder={loadingCiudades ? "Cargando..." : "Seleccione origen"}
                disabled={loadingCiudades || !!ciudadesError || opcionesCiudades.length === 0} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination" className="text-sm font-medium text-gray-700">
                Destino
              </Label>
              <SearchableSelect
                triggerId="destination"
                value={destino}
                onChange={setDestino}
                options={destinosFiltrados}
                placeholder={
                  loadingCiudades
                    ? "Cargando..."
                    : (!origen ? "Seleccione origen primero" : "Seleccione destino")
                }
                disabled={loadingCiudades || !!ciudadesError || destinosFiltrados.length === 0}
              />
            </div>
          </div>

          {/* Medidas (cm), Peso (kg) y Valor declarado ($) */}
          <div className="space-y-4">
            {/* Fila 1: Largo / Ancho / Alto */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Largo */}
              <div className="space-y-2">
                <Label htmlFor="largo" className="text-sm font-medium text-gray-700">
                  Largo
                </Label>
                <div className="relative">
                  <Input
                    id="largo"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0"
                    value={largo}
                    onChange={(e) => setLargo(e.target.value)}
                    className="pr-12 border-gray-300 focus:border-[#ff5500cc] focus:ring-[#ff5500cc]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-100 px-1 rounded">
                    cm
                  </span>
                </div>
              </div>

              {/* Ancho */}
              <div className="space-y-2">
                <Label htmlFor="ancho" className="text-sm font-medium text-gray-700">
                  Ancho
                </Label>
                <div className="relative">
                  <Input
                    id="ancho"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0"
                    value={ancho}
                    onChange={(e) => setAncho(e.target.value)}
                    className="pr-12 border-gray-300 focus:border-[#ff5500cc] focus:ring-[#ff5500cc]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-100 px-1 rounded">
                    cm
                  </span>
                </div>
              </div>

              {/* Alto */}
              <div className="space-y-2">
                <Label htmlFor="alto" className="text-sm font-medium text-gray-700">
                  Alto
                </Label>
                <div className="relative">
                  <Input
                    id="alto"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0"
                    value={alto}
                    onChange={(e) => setAlto(e.target.value)}
                    className="pr-12 border-gray-300 focus:border-[#ff5500cc] focus:ring-[#ff5500cc]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-100 px-1 rounded">
                    cm
                  </span>
                </div>
              </div>
            </div>

            {/* Fila 2: Peso / Valor declarado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Peso */}
              <div className="space-y-2">
                <Label htmlFor="peso" className="text-sm font-medium text-gray-700">
                  Peso
                </Label>
                <div className="relative">
                  <Input
                    id="peso"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    className="pr-12 border-gray-300 focus:border-[#ff5500cc] focus:ring-[#ff5500cc]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-100 px-1 rounded">
                    kg
                  </span>
                </div>
              </div>

              {/* Valor declarado */}
              <div className="space-y-2">
                <Label htmlFor="declaredValue" className="text-sm font-medium text-gray-700">
                  Valor declarado
                </Label>
                <div className="relative">
                  <Input
                    id="declaredValue"
                    type="number"
                    placeholder="0"
                    value={declaredValue}
                    onChange={(e) => setDeclaredValue(e.target.value)}
                    className="pr-12 border-gray-300 focus:border-[#ff5500cc] focus:ring-[#ff5500cc]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-100 px-1 rounded">
                    $
                  </span>
                </div>
              </div>
            </div>
          </div>
      
          {/* Info Alert */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>100 cm = 1 metro</strong> — Ingresa medidas correctas para una cotización precisa.
            </p>
          </div>          

          {/* Errores */}
          {error && (
            <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {/* Acciones */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              className="bg-[#ff5500cc] hover:bg-[#ff5500] text-white"
              disabled={loading || loadingCiudades || !!ciudadesError}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cotizando…
                </span>
              ) : (
                "Cotizar"
              )}
            </Button>
          </div>
        </form>

        {/* Fallback resultado inline (solo si NO hay onQuote) */}
        {!onQuote && inlineResult && inlineMatch && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="text-sm text-gray-500 mb-1">
            Resultado (inline, sin onQuote)
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-gray-500">Ruta</div>
              <div className="font-medium">
                {inlineMatch.origen} → {inlineMatch.destino}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Peso / Bucket</div>
              <div className="font-medium">
                {inlineMatch.pesoSolicitado} kg → {inlineMatch.bucketSeleccionado} kg
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-gray-500">Tarifa</div>
              <div className="text-base font-bold">
                {toCLP(Number(inlineResult.tarifa_pullman_nueva))}
              </div>
            </div>
          </div>
        </div>
      )}
      </CardContent>
      {loading && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-white/60 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 text-[#003fa2]">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="font-medium">Cotizando…</span>
          </div>
        </div>
      )}
    </Card>
  );
}