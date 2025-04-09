import { useState, useRef, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'

// Componente para la página de carga de imagen
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

// Componente para el editor de imágenes
function ImageEditor({ image }) {
  const navigate = useNavigate()
  const [lines, setLines] = useState([])
  const [undoHistory, setUndoHistory] = useState([])
  const [currentLine, setCurrentLine] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 })
  const imageRef = useRef(null)
  const canvasRef = useRef(null)
  const [activeTextInput, setActiveTextInput] = useState(null)
  const textInputRef = useRef(null)
  const [imageLoaded, setImageLoaded] = useState(false);
  const cachedImageRef = useRef(null);
  
  // Verificar si hay una imagen para editar
  if (!image) {
    return (
      <div className="p-4">
        <h1 className="text-2xl mb-4">No hay imagen para editar</h1>
        <button 
          onClick={() => navigate('/')}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
        >
          Volver a la página de carga
        </button>
      </div>
    )
  }

  // Cargar la imagen una vez y almacenarla en caché
  useEffect(() => {
    if (image && !cachedImageRef.current) {
      const img = new Image();
      img.onload = () => {
        cachedImageRef.current = img;
        setImageLoaded(true);
        
        // Dimensiones máximas para la imagen
        const maxWidth = 1200;
        const maxHeight = 800;
        
        // Calcular nueva dimensión manteniendo la proporción
        let newWidth = img.naturalWidth;
        let newHeight = img.naturalHeight;
        let scale = 1;
        
        if (newWidth > maxWidth || newHeight > maxHeight) {
          // Calcular la escala para ajustar la imagen
          const scaleX = maxWidth / newWidth;
          const scaleY = maxHeight / newHeight;
          scale = Math.min(scaleX, scaleY); // Usamos la escala más pequeña
          
          // Aplicamos la escala
          newWidth = Math.floor(newWidth * scale);
          newHeight = Math.floor(newHeight * scale);
        }
        
        // Añadir padding alrededor de la imagen
        const padding = 100;
        const canvasWidth = newWidth + (padding * 2);
        const canvasHeight = newHeight + (padding * 2);
        
        // Guardar dimensiones y escala para usarla en los cálculos de posición
        setCanvasDimensions({
          width: canvasWidth,
          height: canvasHeight,
          imageWidth: newWidth,
          imageHeight: newHeight,
          padding: padding,
          scale: scale,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight
        });
      };
      img.src = image.url;
    }
  }, [image]);

  // Actualizar el canvas cuando cambian las dimensiones (solo una vez)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded || !cachedImageRef.current || !canvasDimensions.padding) return;
    
    // Configurar el tamaño del canvas
    canvas.width = canvasDimensions.width;
    canvas.height = canvasDimensions.height;
    
    // Dibujar el contenido inicial
    redrawCanvas();
  }, [canvasDimensions, imageLoaded]);

  // Función para redibujar el canvas (para evitar duplicación de código)
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !cachedImageRef.current || !canvasDimensions.padding) return;
    
    const ctx = canvas.getContext('2d');
    
    // Limpiar canvas y dibujar fondo blanco
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar la imagen desde la caché
    ctx.drawImage(
      cachedImageRef.current,
      canvasDimensions.padding,
      canvasDimensions.padding,
      canvasDimensions.imageWidth,
      canvasDimensions.imageHeight
    );
    
    // Dibujar todas las líneas guardadas y sus textos
    lines.forEach(line => {
      // Dibujar línea principal
      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(line.endX, line.endY);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Determinar la dirección de la línea horizontal para el texto
      const isPointingRight = line.endX >= line.startX;
      const horizontalLineLength = 100; // Longitud de la línea horizontal
      
      // Dibujar línea horizontal para el texto
      ctx.beginPath();
      const horizontalLineStartX = line.endX;
      const horizontalLineStartY = line.endY;
      
      const horizontalLineEndX = isPointingRight 
        ? line.endX + horizontalLineLength 
        : line.endX - horizontalLineLength;
        
      ctx.moveTo(horizontalLineStartX, horizontalLineStartY);
      ctx.lineTo(horizontalLineEndX, horizontalLineStartY);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Dibujar texto si existe
      if (line.text && !activeTextInput || (activeTextInput && 
         (line.startX !== activeTextInput.startX || line.startY !== activeTextInput.startY))) {
        // Posicionar el texto sobre la línea horizontal
        const textX = isPointingRight 
          ? line.endX + 10
          : line.endX - horizontalLineLength + 10;
          
        const textY = line.endY - 10;
        
        // Configurar el estilo del texto
        ctx.font = '14px Arial';
        
        // Dibujar texto con sombra para mejorar legibilidad
        ctx.fillStyle = 'white';
        
        const textLines = line.text.split('\n');
        
        // Dibujar el efecto de sombra/contorno
        textLines.forEach((textLine, i) => {
          ctx.fillText(textLine, textX + 1, textY + (i * 18) + 1);
          ctx.fillText(textLine, textX - 1, textY + (i * 18) - 1);
          ctx.fillText(textLine, textX + 1, textY + (i * 18) - 1);
          ctx.fillText(textLine, textX - 1, textY + (i * 18) + 1);
        });
        
        // Dibujar el texto principal
        ctx.fillStyle = 'black';
        textLines.forEach((textLine, i) => {
          ctx.fillText(textLine, textX, textY + (i * 18));
        });
      }
    });
    
    // Dibujar la línea actual si existe
    if (currentLine) {
      // Dibujar línea principal actual
      ctx.beginPath();
      ctx.moveTo(currentLine.startX, currentLine.startY);
      ctx.lineTo(currentLine.endX, currentLine.endY);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Determinar dirección y dibujar línea horizontal actual
      const isPointingRight = currentLine.endX >= currentLine.startX;
      const horizontalLineLength = 100;
      
      ctx.beginPath();
      ctx.moveTo(currentLine.endX, currentLine.endY);
      ctx.lineTo(
        isPointingRight 
          ? currentLine.endX + horizontalLineLength 
          : currentLine.endX - horizontalLineLength, 
        currentLine.endY
      );
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    // Dibujar borde alrededor de la imagen para delimitar
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      canvasDimensions.padding - 1, 
      canvasDimensions.padding - 1, 
      canvasDimensions.imageWidth + 2, 
      canvasDimensions.imageHeight + 2
    );
  };

  // Manejar cambios en líneas, línea actual, o texto activo
  useEffect(() => {
    redrawCanvas();
  }, [lines, currentLine, activeTextInput]);

  // Manejar inicio de dibujo
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Calcular la posición correcta dentro del canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setCurrentLine({ startX: x, startY: y, endX: x, endY: y });
    setIsDrawing(true);
  }

  // Manejar movimiento durante el dibujo
  const handleMouseMove = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Calcular la posición correcta dentro del canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setCurrentLine(prev => ({
      ...prev,
      endX: x,
      endY: y
    }));
  }

  // Manejar fin de dibujo
  const handleMouseUp = () => {
    if (isDrawing && currentLine) {
      // Guardar el estado actual en el historial antes de añadir una nueva línea
      setUndoHistory(prev => [...prev, [...lines]]);
      
      // Iniciar entrada de texto al final de la línea
      const newLine = { ...currentLine, text: '' };
      setLines([...lines, newLine]);
      setActiveTextInput(newLine);
      setCurrentLine(null);
      setIsDrawing(false);

      // Enfocar el campo de texto después de renderizarlo
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
      }, 100);
    }
  }

  // Manejar la entrada de texto
  const handleTextChange = (e) => {
    if (activeTextInput) {
      setActiveTextInput({
        ...activeTextInput,
        text: e.target.value
      });
    }
  }

  // Manejar las pulsaciones de teclas en el campo de texto
  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: agregar salto de línea
        return;
      } else {
        // Solo Enter: guardar el texto
        e.preventDefault();
        saveTextAndCloseInput();
      }
    } else if (e.key === 'Escape') {
      cancelTextInput();
    }
  }

  // Guardar el texto y cerrar el input
  const saveTextAndCloseInput = () => {
    if (activeTextInput) {
      // Al modificar el texto, guardamos el estado previo en el historial
      const prevLines = [...lines];
      setUndoHistory(prev => [...prev, prevLines]);
      
      setLines(prevLines => 
        prevLines.map(line => 
          (line.startX === activeTextInput.startX && 
           line.startY === activeTextInput.startY && 
           line.endX === activeTextInput.endX && 
           line.endY === activeTextInput.endY) 
            ? activeTextInput 
            : line
        )
      );
      setActiveTextInput(null);
    }
  }

  // Cancelar la entrada de texto
  const cancelTextInput = () => {
    if (activeTextInput) {
      // Si es una línea nueva sin texto, eliminarla
      if (activeTextInput.text === '') {
        setLines(prevLines => 
          prevLines.filter(line => 
            !(line.startX === activeTextInput.startX && 
              line.startY === activeTextInput.startY && 
              line.endX === activeTextInput.endX && 
              line.endY === activeTextInput.endY)
          )
        );
      }
      setActiveTextInput(null);
    }
  }

  // Limpiar todas las líneas
  const clearLines = () => {
    if (lines.length > 0) {
      // Guardar el estado actual antes de limpiar
      setUndoHistory(prev => [...prev, [...lines]]);
      setLines([]);
    }
  }

  // Volver a la página de carga
  const goBack = () => {
    navigate('/')
  }

  // Función para descargar el canvas como imagen JPG
  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      // Convertir el canvas a una URL de datos en formato JPG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // 0.9 es la calidad (90%)
      
      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.download = `imagen_editada_${new Date().getTime()}.jpg`;
      link.href = dataUrl;
      
      // Simular un clic para iniciar la descarga
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error al descargar la imagen:', error);
      alert('Hubo un problema al generar la imagen para descargar.');
    }
  };

  // Función para deshacer la última acción
  const handleUndo = () => {
    // No hacer nada si estamos en modo de entrada de texto
    if (activeTextInput) return;
    
    if (undoHistory.length > 0) {
      // Obtener el último estado guardado
      const lastState = undoHistory[undoHistory.length - 1];
      
      // Restaurar ese estado
      setLines(lastState);
      
      // Eliminar ese estado del historial
      setUndoHistory(prev => prev.slice(0, -1));
    } else if (lines.length > 0) {
      // Si no hay historial pero hay líneas, simplemente eliminar la última
      setLines(prev => prev.slice(0, -1));
    }
  };

  // Escuchar el evento de teclado para Control+Z
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Si se presiona Control+Z y no hay un input de texto activo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !activeTextInput) {
        e.preventDefault();
        handleUndo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [undoHistory, lines, activeTextInput]);

  return (
    <div className="p-4 max-w-screen-2xl mx-auto">
      <h1 className="text-2xl mb-4 text-center">Editor de Imagen</h1>
      
      <div className="editor-container flex flex-col items-center">
        <div className="tools-panel mb-4 flex flex-wrap items-center justify-center gap-2 w-full">
          <button 
            onClick={handleUndo}
            disabled={undoHistory.length === 0 && lines.length === 0}
            className={`bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded ${(undoHistory.length === 0 && lines.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Deshacer
          </button>
          <button 
            onClick={clearLines}
            className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
          >
            Limpiar líneas
          </button>
          <button 
            onClick={downloadImage}
            className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
          >
            Descargar JPG
          </button>
          <button 
            onClick={goBack}
            className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
          >
            Volver
          </button>
          {canvasDimensions.scale < 1 && (
            <span className="text-gray-600 ml-2">
              Imagen redimensionada a {Math.round(canvasDimensions.scale * 100)}% del tamaño original
            </span>
          )}
        </div>
        
        <div className="canvas-wrapper w-full flex justify-center">
          <div className="canvas-container border border-gray-300 overflow-auto shadow-lg bg-gray-100">
            <div 
              className="relative" 
              style={{ 
                width: canvasDimensions.width, 
                height: canvasDimensions.height 
              }}
            >
              <img 
                ref={imageRef}
                src={image.url} 
                alt="Imagen para editar"
                style={{ 
                  position: 'absolute', 
                  left: canvasDimensions.padding || 0, 
                  top: canvasDimensions.padding || 0,
                  display: 'none' // Ocultamos la imagen ya que se dibuja en el canvas
                }}
              />
              <canvas
                ref={canvasRef}
                width={canvasDimensions.width}
                height={canvasDimensions.height}
                className="cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              
              {/* Input de texto flotante */}
              {activeTextInput && (
                <div 
                  style={{
                    position: 'absolute',
                    left: `${activeTextInput.endX >= activeTextInput.startX ? 
                      activeTextInput.endX + 10 : 
                      activeTextInput.endX - 100 + 10}px`,
                    top: `${activeTextInput.endY - 40}px`, // Colocarlo encima de la línea
                    zIndex: 10
                  }}
                >
                  <textarea
                    ref={textInputRef}
                    value={activeTextInput.text || ''}
                    onChange={handleTextChange}
                    onKeyDown={handleTextKeyDown}
                    onBlur={saveTextAndCloseInput}
                    className="border border-gray-300 p-1 min-w-[150px] min-h-[60px] bg-white shadow-md text-black"
                    placeholder="Escribe texto aquí... (Enter para guardar, Shift+Enter para nueva línea)"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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
