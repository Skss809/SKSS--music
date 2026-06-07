async function test() {
  const res = await fetch('http://127.0.0.1:3000/api/sc-search?q=Somewhere%20only%20We%20know');
  const json = await res.json();
  console.log(json.items?.length);
}
test();
