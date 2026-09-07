import { Link, Route, Routes } from 'react-router-dom';

function Home() {
  return (
    <main>
      <h1>TriFid Admin</h1>
      <p>Staff application foundation.</p>
      <Link to="/health">Open route foundation</Link>
    </main>
  );
}

function Health() {
  return (
    <main>
      <h1>Route foundation</h1>
      <p>No application features have been added.</p>
      <Link to="/">Back home</Link>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/health" element={<Health />} />
    </Routes>
  );
}
