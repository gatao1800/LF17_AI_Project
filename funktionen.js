export function postPromt(prompt) {
  return fetch("/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
      stream: false
    })
  });
}

export async function getResponse(response) {
  if (!response.ok) {
    throw new Error(`Serverfehler ${response.status}: ${await response.text()}`);
  }

  const daten = await response.json();
  return daten.choices[0].message.content;
}

export async function generateUML(response, targetElement) {
  // URL an euren PlantUML-Server anpassen:
  const serverUrl = "http://localhost:8081/plantuml";

  // PlantUML-Code aus der KI-Antwort extrahieren.
  const treffer = response.match(/@startuml[\s\S]*?@enduml/i);
  if (!treffer) {
    throw new Error("Kein vollständiger PlantUML-Code in der Antwort gefunden.");
  }

  // UTF-8-Text im PlantUML-HEX-Format kodieren.
  const bytes = new TextEncoder().encode(treffer[0]);
  const hex = Array.from(bytes, byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  const bild = document.createElement("img");
  bild.alt = "PlantUML-Diagramm";

  await new Promise((resolve, reject) => {
    bild.onload = resolve;
    bild.onerror = () => reject(new Error("Diagramm konnte nicht geladen werden."));
    bild.src = `${serverUrl}/svg/~h${hex}`;
  });

  targetElement.replaceChildren(bild);
}
