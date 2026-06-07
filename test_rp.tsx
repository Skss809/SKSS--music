import React, { useRef, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import ReactPlayer from 'react-player';

function App() {
  const ref = useRef(null);
  console.log("ref:", ref);
  return <ReactPlayer ref={ref} url="https://youtube.com/watch?v=kJQP7kiw5Fk" />
}

renderToString(<App />);
