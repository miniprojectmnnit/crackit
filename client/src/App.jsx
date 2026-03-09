import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/data")
      .then(res => res.json())
      .then(data => setData(data.message));
  }, []);

  return <h1>{data}</h1>;
}

export default App;