import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import ImageUploader from './components/ImageUploader'
import ImageEditor from './components/ImageEditor'

// Componente principal que contiene el estado de la imagen y la lógica de enrutamiento
function App() {
  const [imageData, setImageData] = useState(null)
  
  // Función para limpiar la imagen y liberar memoria cuando ya no se necesite
  const clearImage = () => {
    if (imageData) {
      URL.revokeObjectURL(imageData.url)
      setImageData(null)
    }
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ImageUploader onImageLoad={setImageData} />} />
        <Route path="/editor" element={<ImageEditor image={imageData} />} />
      </Routes>
    </Router>
  )
}

export default App
