import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Search from './pages/Search'
import Map from './pages/Map'
import NewPost from './pages/NewPost'
import PostDetail from './pages/PostDetail'
import Alerts from './pages/Alerts'
import AlertDetail from './pages/AlertDetail'
import NewAlert from './pages/NewAlert'
import Admin from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin route without Layout */}
        <Route path="/admin" element={<Admin />} />

        {/* Regular routes with Layout */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/post/:id" element={<Layout><PostDetail /></Layout>} />
        <Route path="/avisos" element={<Layout><Alerts /></Layout>} />
        <Route path="/avisos/:id" element={<Layout><AlertDetail /></Layout>} />
        <Route path="/avisos/nuevo" element={<Layout><NewAlert /></Layout>} />
        <Route path="/buscar" element={<Layout><Search /></Layout>} />
        <Route path="/mapa" element={<Layout><Map /></Layout>} />
        <Route path="/new" element={<Layout><NewPost /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
