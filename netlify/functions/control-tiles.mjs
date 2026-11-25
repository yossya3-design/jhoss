// Mapa base de Control T2 servido desde el mismo sitio (las laptops corporativas bloquean los servidores de mapas).
// Pide el cuadro a OpenStreetMap (respaldo: Esri) y lo deja en la caché del CDN de Netlify por 30 días.
const UA = "ControlT2/1.0 (+https://seguimiento-delivery-t2.netlify.app/control-actividades/)";
export default async (req, context) => {
  const { z, x, y } = context.params || {};
  const Z = +z, X = +x, Y = +y;
  if (![Z, X, Y].every(Number.isInteger) || Z < 3 || Z > 19 || X < 0 || Y < 0 || X >= 2 ** Z || Y >= 2 ** Z)
    return new Response("cuadro no válido", { status: 400 });
  const fuentes = [
    `https://tile.openstreetmap.org/${Z}/${X}/${Y}.png`,
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${Z}/${Y}/${X}`,
  ];
  for (const u of fuentes) {
    try {
      const r = await fetch(u, { headers: { "user-agent": UA, referer: "https://seguimiento-delivery-t2.netlify.app/" } });
      if (!r.ok) continue;
      return new Response(await r.arrayBuffer(), {
        headers: {
          "content-type": r.headers.get("content-type") || "image/png",
          "cache-control": "public, max-age=604800",
          "netlify-cdn-cache-control": "public, max-age=2592000, durable",
        },
      });
    } catch (e) { /* siguiente fuente */ }
  }
  return new Response("sin mapa", { status: 502, headers: { "cache-control": "no-store" } });
};
export const config = { path: "/control-actividades/tiles/:z/:x/:y.png" };
