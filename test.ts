async function test() {
  const res = await fetch("http://localhost:3000/api/ai-recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recentTracks: [{ title: "Blinding Lights", artist: "The Weeknd" }] })
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
