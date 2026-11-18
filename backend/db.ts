// Öffnet den gemeinsamen Deno-KV-Speicher für die API, relativ zum Arbeitsverzeichnis des Servers.
export const kv = await Deno.openKv('./restaurants.db')