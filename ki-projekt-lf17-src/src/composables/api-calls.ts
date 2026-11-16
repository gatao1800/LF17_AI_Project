export function postPromt(prompt: string) {
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
