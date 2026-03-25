async function testKey(key) {
  try {
    const res = await fetch("https://judge0-ce.p.rapidapi.com/languages", {
      headers: {
        "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        "x-rapidapi-key": key
      }
    });
    const text = await res.text();
    console.log(`Key ${key.substring(0, 5)}... -> HTTP ${res.status}: ${text.substring(0, 100)}`);
  } catch (err) {
    console.error(`Error for key ${key}:`, err.message);
  }
}

async function run() {
  await testKey("0c0b540ec7msh9da3ea469827476p11b263jsn2cfd6542cdb6"); // From .env
  await testKey("b4e5c5a05fmsh9adf6ec091523f8p165338jsncc58f31c26e1"); // From user snippet 1
  await testKey("3ed7a75b44mshc9e28568fe0317bp17b5b2jsn6d89943165d8"); // From user snippet 2
}

run();
