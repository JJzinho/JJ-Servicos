const cache = new Map();
export function coordinates(lat, lon) {
  if (
    [lat, lon].some(
      (v) =>
        !['number', 'string'].includes(typeof v) || String(v).trim() === '',
    )
  )
    return null;
  lat = Number(lat);
  lon = Number(lon);
  // As coordenadas do CEP precisam estar dentro dos limites do Brasil.
  return lat >= -34 && lat <= 6 && lon >= -74 && lon <= -28
    ? { lat, lon }
    : null;
}
async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(3500) });
  if (!response.ok) throw new Error('Consulta de CEP indisponível');
  return response.json();
}
export async function lookupCep(cep) {
  if (!/^\d{8}$/.test(cep)) return null;
  const cached = cache.get(cep);
  if (cached?.until > Date.now()) return cached.value;
  let value;
  try {
    const data = await json('https://brasilapi.com.br/api/cep/v2/' + cep);
    if (
      !data.city ||
      !data.state ||
      String(data.cep).replace(/\D/g, '') !== cep
    )
      throw new Error();
    const point = data.location?.coordinates;
    value = {
      cep,
      street: data.street || '',
      district: data.neighborhood || '',
      city: data.city,
      state: data.state,
      point: coordinates(point?.latitude, point?.longitude),
    };
  } catch {
    try {
      const data = await json('https://viacep.com.br/ws/' + cep + '/json/');
      if (data.erro || !data.localidade || !data.uf) return null;
      value = {
        cep,
        street: data.logradouro || '',
        district: data.bairro || '',
        city: data.localidade,
        state: data.uf,
        point: null,
      };
    } catch {
      return null;
    }
  }
  if (cache.size >= 1000) cache.delete(cache.keys().next().value);
  cache.set(cep, {
    value,
    until: Date.now() + (value.point ? 86400000 : 300000),
  });
  return value;
}
export function distanceKm(a, b) {
  if (!a || !b || !coordinates(a.lat, a.lon) || !coordinates(b.lat, b.lon))
    return null;
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h))) * 10) / 10;
}
