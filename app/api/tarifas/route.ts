// app/api/tarifas/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CORS preflight (si llamas desde un front distinto dominio)
export async function OPTIONS(req: Request) {
  const reqHeaders = new Headers(req.headers);
  const acrh = reqHeaders.get("Access-Control-Request-Headers") ?? "Content-Type, Authorization";

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": acrh,
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let { origen, destino, peso } = body as {
      origen?: string;
      destino?: string;
      peso?: number; // peso solicitado por el usuario
    };

    // Validación básica (conserva tu comportamiento original)
    origen = origen?.trim();
    destino = destino?.trim();

    if (!origen || !destino || peso === undefined || peso === null) {
      return NextResponse.json(
        { error: "Debes enviar origen, destino y peso" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }
    if (origen.length > 100 || destino.length > 100) {
      return NextResponse.json(
        { error: "Parámetros demasiado largos" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }
    const pesoNum = Number(peso);
    if (!Number.isFinite(pesoNum) || pesoNum <= 0) {
      return NextResponse.json(
        { error: "peso inválido" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 1) Traer los buckets reales de peso_final para ese origen/destino
    const bucketsRows = await query(
      `
      SELECT DISTINCT CAST(peso_final AS DECIMAL(10,2)) AS peso_final
      FROM pcargo_tarifas.resultado_comparacion_tarifas
      WHERE origen = ? AND destino = ?
      ORDER BY peso_final ASC
      `,
      [origen, destino]
    ) as Array<{ peso_final: number }>;

    if (!bucketsRows.length) {
      return NextResponse.json(
        { error: "No hay tarifas para ese origen/destino" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 2) Elegir bucket: el mínimo >= peso solicitado; si no existe, el máximo (misma lógica)
    const buckets = bucketsRows
      .map(r => Number(r.peso_final))
      .filter(n => Number.isFinite(n))
      .sort((a, b) => a - b);

    let targetBucket = buckets.find(b => b >= pesoNum);
    if (targetBucket === undefined) {
      targetBucket = buckets[buckets.length - 1]; // usar el mayor
    }

    // 3) Traer HASTA DOS registros del bucket elegido (uno por tipo_entrega),
    //    cada uno el más reciente según fecha_compromiso e id.
    const [agenciaRows, domicilioRows] = await Promise.all([
      query(
        `
        SELECT *
        FROM pcargo_tarifas.resultado_comparacion_tarifas
        WHERE origen = ? AND destino = ? AND peso_final = ?
          AND UPPER(tipo_entrega) = 'AGENCIA'
        ORDER BY fecha_compromiso DESC, id DESC
        LIMIT 1
        `,
        [origen, destino, targetBucket]
      ) as Promise<any[]>,
      query(
        `
        SELECT *
        FROM pcargo_tarifas.resultado_comparacion_tarifas
        WHERE origen = ? AND destino = ? AND peso_final = ?
          AND UPPER(tipo_entrega) = 'DOMICILIO'
        ORDER BY fecha_compromiso DESC, id DESC
        LIMIT 1
        `,
        [origen, destino, targetBucket]
      ) as Promise<any[]>,
    ]);

    const data: any[] = [];
    if (agenciaRows.length) data.push(agenciaRows[0]);
    if (domicilioRows.length) data.push(domicilioRows[0]);

    // Fallback: si por algún motivo no hay ni agencia ni domicilio en el bucket,
    // conservamos tu comportamiento anterior (al menos 1 registro del bucket).
    if (data.length === 0) {
      const fallback = await query(
        `
        SELECT *
        FROM pcargo_tarifas.resultado_comparacion_tarifas
        WHERE origen = ? AND destino = ? AND peso_final = ?
        ORDER BY fecha_compromiso DESC, id DESC
        LIMIT 1
        `,
        [origen, destino, targetBucket]
      ) as any[];

      if (fallback.length) {
        data.push(fallback[0]);
      }
    }

    if (data.length === 0) {
      // caso extremo: bucket sin filas utilizable
      return NextResponse.json(
        {
          error: "No se encontró registro para el bucket seleccionado",
          detalle: { bucketSeleccionado: targetBucket, pesoSolicitado: pesoNum, disponibles: buckets },
        },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 4) Responder incluyendo metadatos útiles (igual que antes) y ambos registros si existen
    const payload: any = {
      match: {
        origen,
        destino,
        pesoSolicitado: pesoNum,
        bucketSeleccionado: targetBucket,
        estrategia: "ceiling (mínimo bucket >= peso; si no hay, usa máximo)",
        disponibles: buckets, // útil para debug/UI (puedes quitarlo en prod)
      },
      data,
    };
    // Compatibilidad: incluir 'resultado' como primer elemento
    if (data.length > 0) payload.resultado = data[0];

    return NextResponse.json(payload, {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Error al consultar resultado_comparacion_tarifas:", err);
    return NextResponse.json(
      { error: "Error al consultar tarifas" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}