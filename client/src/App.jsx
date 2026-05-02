import { useApp } from './context/AppContext';
import Nav from './components/Nav';
import Landing from './components/Landing';
import Feed from './components/Feed';
import Reader from './components/Reader';

export default function App() {
  const { view } = useApp();

  return (
    <>
      <Nav />
      {view === 'landing' && <Landing />}
      {view === 'feed' && <Feed />}
      <Reader />
    </>
  );
}
