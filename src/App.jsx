import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import './styles/scrollbars.css'
import ImageUploader from './components/ImageUploader'
import ImageEditor from './components/ImageEditor'

function App() {
  const [image, setImage] = useState(null)
  
  const handleImageLoad = (imageData) => {
    setImage(imageData)
  }
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ImageUploader onImageLoad={handleImageLoad} />} />
        <Route path="/editor" element={<ImageEditor image={image} />} />
      </Routes>
    </Router>
  )
}

export default App
