import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function ImageUploader({ onImageLoad }) {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Función para manejar la subida de la imagen
  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file && file.type.substr(0, 6) === 'image/') {
      setLoading(true)
      // Crear URL temporal para la imagen
      const imageUrl = URL.createObjectURL(file)
      const imageData = {
        url: imageUrl,
        name: file.name,
        type: file.type,
        size: file.size
      }
      
      // Cargar la imagen en el estado global y navegar automáticamente al editor
      onImageLoad(imageData)
      
      // Pequeña espera para asegurar que la imagen se cargó correctamente
      setTimeout(() => {
        navigate('/editor')
      }, 100)
    } else if (file) {
      alert('Por favor selecciona un archivo de imagen válido')
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold underline mb-4">
        Subida de Imágenes Temporal
      </h1>
      
      <div className="image-upload-container p-4 border rounded">
        <p className="mb-4">Selecciona una imagen para comenzar a editarla:</p>
        <input 
          type="file" 
          accept="image/*"
          onChange={handleImageUpload}
          className="mb-4"
        />
        
        {loading && (
          <div className="loading-indicator mt-2">
            <p>Cargando imagen...</p>
          </div>
        )}
      </div>
    </>
  )
}

export default ImageUploader
