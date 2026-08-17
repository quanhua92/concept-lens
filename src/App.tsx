import { Route, Routes, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout'
import Home from '@/pages/Home'
import ConceptPage from '@/pages/ConceptPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="c/:slug" element={<ConceptPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
