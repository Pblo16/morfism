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
  const containerRef = useRef(null)
  const [activeTextInput, setActiveTextInput] = useState(null)
  const textInputRef = useRef(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const cachedImageRef = useRef(null)
  
  // Estados para zoom y pan
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [startPanPos, setStartPanPos] = useState({ x: 0, y: 0 })
  const [viewMode, setViewMode] = useState('edit') // 'edit' o 'move'
  
  // Estado para el color de línea seleccionado
  const [lineColor, setLineColor] = useState('#ff0000'); // Rojo por defecto
  
  // Colores predefinidos para la paleta
  const predefinedColors = [
    '#ff0000', // Rojo
    '#ff8800', // Naranja
    '#ffff00', // Amarillo
    '#00ff00', // Verde
    '#0000ff', // Azul
    '#800080', // Púrpura
    '#000000', // Negro
    '#ffffff', // Blanco
  ];
  
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

  // Nueva función para ajustar el canvas a las dimensiones de la ventana
  useEffect(() => {
    const updateCanvasSizeToWindow = () => {
      const container = containerRef.current;
      if (!container || !imageLoaded || !cachedImageRef.current) return;
      
      // Obtenemos el tamaño disponible (90% del viewport)
      const availableWidth = window.innerWidth * 0.9;
      const availableHeight = (window.innerHeight - 120) * 0.9; // Restamos altura del header y toolbar
      
      // Calculamos el padding para centrar la imagen
      const paddingX = Math.max(100, availableWidth * 0.1);
      const paddingY = Math.max(100, availableHeight * 0.1);
      
      // Guardamos las dimensiones originales de la imagen
      const imgWidth = cachedImageRef.current.naturalWidth;
      const imgHeight = cachedImageRef.current.naturalHeight;
      
      // Calculamos el tamaño del canvas: el viewport disponible más algo de espacio extra
      const canvasWidth = availableWidth + paddingX * 2;
      const canvasHeight = availableHeight + paddingY * 2;
      
      // Actualizamos el estado
      setCanvasDimensions({
        width: canvasWidth,
        height: canvasHeight,
        imageWidth: imgWidth,
        imageHeight: imgHeight,
        padding: { x: paddingX, y: paddingY },
        scale: 1, // Escala inicial
        originalWidth: imgWidth,
        originalHeight: imgHeight
      });
    };
    
    updateCanvasSizeToWindow();
    window.addEventListener('resize', updateCanvasSizeToWindow);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSizeToWindow);
    };
  }, [imageLoaded]);

  // Actualizar el canvas cuando cambian las dimensiones
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded || !cachedImageRef.current || !canvasDimensions.padding) return;
    
    // Configurar el tamaño del canvas
    canvas.width = canvasDimensions.width;
    canvas.height = canvasDimensions.height;
    
    // Dibujar el contenido inicial
    redrawCanvas();
    
    // Ajustamos el scroll para centrar la imagen inicialmente
    if (containerRef.current && canvasRef.current) {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      
      // Centramos el scroll
      container.scrollLeft = (canvas.width - container.clientWidth) / 2;
      container.scrollTop = (canvas.height - container.clientHeight) / 2;
    }
  }, [canvasDimensions, imageLoaded]);

  // Función para redibujar el canvas con zoom y desplazamiento
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !cachedImageRef.current) return;
    
    const ctx = canvas.getContext('2d');
    
    // Limpiar canvas y dibujar fondo blanco
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Aplicar transformaciones para zoom y pan
    ctx.save();
    
    // Calcula la posición central para la imagen
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Aplica transformaciones: primero trasladar al centro, aplicar zoom, y luego aplicar offset
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX + offset.x / scale, -centerY + offset.y / scale);
    
    // Dibujar la imagen centrada
    const imgX = (canvas.width - canvasDimensions.imageWidth) / 2;
    const imgY = (canvas.height - canvasDimensions.imageHeight) / 2;
    
    ctx.drawImage(
      cachedImageRef.current,
      imgX,
      imgY,
      canvasDimensions.imageWidth,
      canvasDimensions.imageHeight
    );
    
    // Dibujar borde alrededor de la imagen para delimitar
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      imgX - 1, 
      imgY - 1, 
      canvasDimensions.imageWidth + 2, 
      canvasDimensions.imageHeight + 2
    );
    
    // Dibujar todas las líneas guardadas y sus textos
    lines.forEach(line => {
      // Dibujar línea principal
      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(line.endX, line.endY);
      ctx.strokeStyle = line.color || '#ff0000'; // Usar el color de la línea o rojo por defecto
      ctx.lineWidth = 2 / scale; // Ajustar grosor según zoom
      ctx.stroke();
      
      // Determinar la dirección de la línea horizontal para el texto
      const isPointingRight = line.endX >= line.startX;
      const horizontalLineLength = 100 / scale; // Ajustar longitud según zoom
      
      // Dibujar línea horizontal para el texto
      ctx.beginPath();
      const horizontalLineStartX = line.endX;
      const horizontalLineStartY = line.endY;
      
      const horizontalLineEndX = isPointingRight 
        ? line.endX + horizontalLineLength 
        : line.endX - horizontalLineLength;
        
      ctx.moveTo(horizontalLineStartX, horizontalLineStartY);
      ctx.lineTo(horizontalLineEndX, horizontalLineStartY);
      ctx.strokeStyle = line.color || '#ff0000'; // Mismo color que la línea principal
      ctx.lineWidth = 1 / scale;
      ctx.stroke();
      
      // Dibujar texto si existe
      if (line.text && !activeTextInput || (activeTextInput && 
         (line.startX !== activeTextInput.startX || line.startY !== activeTextInput.startY))) {
        // Posicionar el texto sobre la línea horizontal
        const textX = isPointingRight 
          ? line.endX + 10 / scale
          : line.endX - horizontalLineLength + 10 / scale;
          
        const textY = line.endY - 10 / scale;
        
        // Configurar el estilo del texto
        ctx.font = `${14 / scale}px Arial`;
        
        // Dibujar texto con sombra para mejorar legibilidad
        ctx.fillStyle = 'white';
        
        const textLines = line.text.split('\n');
        
        // Dibujar el efecto de sombra/contorno con escala
        const offset = 1 / scale;
        textLines.forEach((textLine, i) => {
          ctx.fillText(textLine, textX + offset, textY + (i * 18 / scale) + offset);
          ctx.fillText(textLine, textX - offset, textY + (i * 18 / scale) - offset);
          ctx.fillText(textLine, textX + offset, textY + (i * 18 / scale) - offset);
          ctx.fillText(textLine, textX - offset, textY + (i * 18 / scale) + offset);
        });
        
        // Dibujar el texto principal
        ctx.fillStyle = 'black';
        textLines.forEach((textLine, i) => {
          ctx.fillText(textLine, textX, textY + (i * 18 / scale));
        });

        // Añadir un indicador visual para textos editables (pequeño botón de edición)
        if (viewMode === 'edit') {
          // Dibujar un pequeño icono de "editar" al lado del texto
          const editIconX = isPointingRight 
            ? textX - 15 / scale
            : textX + textWidth + 5 / scale;
          const editIconY = textY - 5 / scale;
          
          // Círculo indicador de que el texto es editable
          ctx.beginPath();
          ctx.arc(editIconX, editIconY, 6 / scale, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(60, 180, 250, 0.8)';
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1 / scale;
          ctx.stroke();
          
          // Dibujar "lápiz" icono
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.moveTo(editIconX - 2 / scale, editIconY - 2 / scale);
          ctx.lineTo(editIconX + 2 / scale, editIconY - 2 / scale);
          ctx.lineTo(editIconX + 2 / scale, editIconY + 2 / scale);
          ctx.lineTo(editIconX - 2 / scale, editIconY + 2 / scale);
          ctx.fill();
        }
      }
    });
    
    // Dibujar la línea actual si existe
    if (currentLine) {
      // Dibujar línea principal actual
      ctx.beginPath();
      ctx.moveTo(currentLine.startX, currentLine.startY);
      ctx.lineTo(currentLine.endX, currentLine.endY);
      ctx.strokeStyle = lineColor; // Usar el color seleccionado actualmente
      ctx.lineWidth = 2 / scale;
      ctx.stroke();
      
      // Determinar dirección y dibujar línea horizontal actual
      const isPointingRight = currentLine.endX >= currentLine.startX;
      const horizontalLineLength = 100 / scale;
      
      ctx.beginPath();
      ctx.moveTo(currentLine.endX, currentLine.endY);
      ctx.lineTo(
        isPointingRight 
          ? currentLine.endX + horizontalLineLength 
          : currentLine.endX - horizontalLineLength, 
        currentLine.endY
      );
      ctx.strokeStyle = lineColor; // Usar el color seleccionado actualmente
      ctx.lineWidth = 1 / scale;
      ctx.stroke();
    }
    
    ctx.restore();
  };

  // Manejadores de eventos para zoom
  const handleWheel = (e) => {
    e.preventDefault();
    
    // Factor de zoom por cada scroll
    const zoomIntensity = 0.1;
    
    // Calcular nueva escala
    let newScale;
    if (e.deltaY < 0) {
      // Zoom in (límite máximo de zoom: 5x)
      newScale = Math.min(scale * (1 + zoomIntensity), 5);
    } else {
      // Zoom out (límite mínimo de zoom: 0.2x)
      newScale = Math.max(scale * (1 - zoomIntensity), 0.2);
    }
    
    setScale(newScale);
  };

  // Manejadores de eventos para arrastrar el canvas (pan)
  const handlePanStart = (e) => {
    if (viewMode === 'move' || e.button === 1) { // Si estamos en modo mover o se usa el botón central
      setIsPanning(true);
      setStartPanPos({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y
      });
      
      // Cambiar el cursor
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing';
      }
      
      // Prevenir selección de texto durante el drag
      e.preventDefault();
    }
  };

  const handlePanMove = (e) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - startPanPos.x,
        y: e.clientY - startPanPos.y
      });
    }
  };

  const handlePanEnd = () => {
    if (isPanning) {
      setIsPanning(false);
      
      // Restaurar cursor
      if (canvasRef.current) {
        canvasRef.current.style.cursor = viewMode === 'move' ? 'grab' : 'crosshair';
      }
    }
  };

  // Toggle entre modo edición y modo movimiento
  const toggleViewMode = () => {
    const newMode = viewMode === 'edit' ? 'move' : 'edit';
    setViewMode(newMode);
    
    // Actualizar el cursor
    if (canvasRef.current) {
      canvasRef.current.style.cursor = newMode === 'move' ? 'grab' : 'crosshair';
    }
  };

  // Reset zoom y posición
  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // Función para hacer un texto editable
  const editLineText = (line) => {
    // Guardar el estado actual en el historial antes de editar
    setUndoHistory(prev => [...prev, [...lines]]);
    
    // Activar el campo de texto con los datos de esta línea
    setActiveTextInput(line);
    
    // Enfocar el campo de texto después de renderizarlo
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
      }
    }, 100);
  };
  
  // Función para verificar si se hizo clic en un texto
  const checkTextClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || viewMode !== 'edit') return;
    
    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Transformar coordenadas del cliente a coordenadas del canvas con zoom y pan
    const canvasX = ((e.clientX - rect.left) / scale) + centerX * (1 - 1/scale) - offset.x / scale;
    const canvasY = ((e.clientY - rect.top) / scale) + centerY * (1 - 1/scale) - offset.y / scale;
    
    // Verificar si algún texto fue clickeado
    for (const line of lines) {
      if (!line.text) continue;
      
      const isPointingRight = line.endX >= line.startX;
      const horizontalLineLength = 100 / scale;
      
      // Determinar área del texto
      const textX = isPointingRight 
        ? line.endX + 10 / scale
        : line.endX - horizontalLineLength + 10 / scale;
        
      const textY = line.endY - 10 / scale;
      
      const textLines = line.text.split('\n');
      const lineHeight = 18 / scale;
      const textHeight = textLines.length * lineHeight;
      const textWidth = Math.max(...textLines.map(text => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = `${14 / scale}px Arial`;
        return ctx.measureText(text).width;
      }));
      
      // Verificar si el clic está dentro del área de texto
      if (
        canvasX >= textX - 5 / scale &&
        canvasX <= textX + textWidth + 10 / scale &&
        canvasY >= textY - 20 / scale &&
        canvasY <= textY + textHeight
      ) {
        editLineText(line);
        return true;
      }
    }
    return false;
  };

  // Modificar los manejadores de eventos del ratón para el dibujo
  const handleMouseDown = (e) => {
    if (viewMode === 'move' || e.button === 1) { // Modo mover o botón central
      handlePanStart(e);
      return;
    }
    
    if (viewMode === 'edit' && e.button === 0) { // Solo en modo edición y con clic izquierdo
      // Primero verificar si se hizo clic en un texto
      if (checkTextClick(e)) {
        return;
      }
      
      // Si no se hizo clic en un texto, iniciar dibujo de línea
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      
      // Calcular la posición correcta dentro del canvas, considerando zoom y pan
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Transformar coordenadas del cliente a coordenadas del canvas con zoom y pan
      const canvasX = ((e.clientX - rect.left) / scale) + centerX * (1 - 1/scale) - offset.x / scale;
      const canvasY = ((e.clientY - rect.top) / scale) + centerY * (1 - 1/scale) - offset.y / scale;
      
      setCurrentLine({ startX: canvasX, startY: canvasY, endX: canvasX, endY: canvasY });
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      handlePanMove(e);
      return;
    }
    
    if (isDrawing && viewMode === 'edit') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      
      // Calcular la posición con zoom y pan
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      const canvasX = ((e.clientX - rect.left) / scale) + centerX * (1 - 1/scale) - offset.x / scale;
      const canvasY = ((e.clientY - rect.top) / scale) + centerY * (1 - 1/scale) - offset.y / scale;
      
      setCurrentLine(prev => ({
        ...prev,
        endX: canvasX,
        endY: canvasY
      }));
    }
  };

  const handleMouseUp = (e) => {
    if (isPanning) {
      handlePanEnd();
      return;
    }
    
    if (isDrawing && viewMode === 'edit') {
      if (currentLine) {
        // Guardar el estado actual en el historial antes de añadir una nueva línea
        setUndoHistory(prev => [...prev, [...lines]]);
        
        // Iniciar entrada de texto al final de la línea
        const newLine = { 
          ...currentLine, 
          text: '',
          color: lineColor // Asignar el color actual a la nueva línea
        };
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
  };

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
      // Crear un canvas temporal para la exportación
      const exportCanvas = document.createElement('canvas');
      const exportCtx = exportCanvas.getContext('2d');
      
      // Obtener el área exacta que contiene la imagen y anotaciones
      const boundingBox = calculateActiveBoundingBox();
      
      // Verificar si el área es válida
      if (boundingBox.width <= 0 || boundingBox.height <= 0) {
        alert('No se pudo determinar el área para exportar.');
        return;
      }
      
      console.log("Área calculada:", boundingBox);
      
      // Establecer el tamaño del canvas de exportación al área exacta
      exportCanvas.width = boundingBox.width;
      exportCanvas.height = boundingBox.height;
      
      // Aplicar fondo blanco al canvas de exportación
      exportCtx.fillStyle = 'white';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      
      // Dibujar solo la porción relevante del canvas original
      exportCtx.drawImage(
        canvas, 
        boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height,
        0, 0, exportCanvas.width, exportCanvas.height
      );
      
      // Mostrar vista previa de la imagen recortada
      showExportPreview(exportCanvas);
    } catch (error) {
      console.error('Error al preparar la imagen para descargar:', error);
      alert('Hubo un problema al procesar la imagen.');
    }
  };

  // Función para mostrar vista previa de la exportación
  const showExportPreview = (exportCanvas) => {
    // Crear un modal para mostrar la vista previa
    const modal = document.createElement('div');
    modal.className = 'export-preview-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    // Contenedor para la imagen y controles
    const container = document.createElement('div');
    container.style.backgroundColor = 'white';
    container.style.padding = '20px';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    container.style.maxWidth = '90%';
    container.style.maxHeight = '90%';
    container.style.overflow = 'auto';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '15px';
    
    // Título
    const title = document.createElement('h3');
    title.textContent = 'Vista previa de la imagen recortada';
    title.style.margin = '0';
    title.style.textAlign = 'center';
    
    // Contenedor de la imagen
    const imageContainer = document.createElement('div');
    imageContainer.style.overflow = 'auto';
    imageContainer.style.maxHeight = '70vh';
    imageContainer.style.display = 'flex';
    imageContainer.style.justifyContent = 'center';
    imageContainer.style.border = '1px solid #ddd';
    imageContainer.style.backgroundColor = '#f8f8f8';
    
    // Imagen
    const img = document.createElement('img');
    img.src = exportCanvas.toDataURL('image/jpeg', 0.9);
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    
    // Información de dimensiones
    const info = document.createElement('div');
    info.textContent = `Dimensiones: ${exportCanvas.width}px × ${exportCanvas.height}px`;
    info.style.textAlign = 'center';
    info.style.color = '#666';
    
    // Controles
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.justifyContent = 'center';
    controls.style.gap = '10px';
    
    // Botón para descargar
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Descargar';
    downloadBtn.className = 'btn-tool bg-green-500';
    downloadBtn.style.padding = '8px 16px';
    downloadBtn.style.backgroundColor = '#22c55e';
    downloadBtn.style.color = 'white';
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '4px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.download = `imagen_editada_${new Date().getTime()}.jpg`;
      link.href = exportCanvas.toDataURL('image/jpeg', 0.9);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      document.body.removeChild(modal);
    };
    
    // Botón para cancelar
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.className = 'btn-tool bg-red-500';
    cancelBtn.style.padding = '8px 16px';
    cancelBtn.style.backgroundColor = '#ef4444';
    cancelBtn.style.color = 'white';
    cancelBtn.style.border = 'none';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.onclick = () => {
      document.body.removeChild(modal);
    };
    
    // Ensamblar el modal
    imageContainer.appendChild(img);
    controls.appendChild(downloadBtn);
    controls.appendChild(cancelBtn);
    container.appendChild(title);
    container.appendChild(imageContainer);
    container.appendChild(info);
    container.appendChild(controls);
    modal.appendChild(container);
    
    // Agregar el modal al body
    document.body.appendChild(modal);
  };

  // Función para calcular el área activa del canvas (imagen + anotaciones)
  const calculateActiveBoundingBox = () => {
    // Primero obtenemos las dimensiones y posición de la imagen
    const imgX = Math.round((canvasDimensions.width - canvasDimensions.imageWidth) / 2);
    const imgY = Math.round((canvasDimensions.height - canvasDimensions.imageHeight) / 2);
    
    // Inicialmente establecemos el área como el área de la imagen
    let minX = imgX;
    let minY = imgY;
    let maxX = imgX + canvasDimensions.imageWidth;
    let maxY = imgY + canvasDimensions.imageHeight;
    
    // Si no hay líneas, solo devolvemos el área de la imagen
    if (lines.length === 0) {
      return {
        x: minX,
        y: minY,
        width: canvasDimensions.imageWidth,
        height: canvasDimensions.imageHeight
      };
    }
    
    // Expandir el área para incluir todas las líneas y textos
    lines.forEach(line => {
      // Verificar las coordenadas de la línea principal
      minX = Math.min(minX, line.startX, line.endX);
      minY = Math.min(minY, line.startY, line.endY);
      maxX = Math.max(maxX, line.startX, line.endX);
      maxY = Math.max(maxY, line.startY, line.endY);
      
      // Verificar la línea horizontal para el texto
      const isPointingRight = line.endX >= line.startX;
      const horizontalLineLength = 100;
      const horizontalEndX = isPointingRight 
        ? line.endX + horizontalLineLength 
        : line.endX - horizontalLineLength;
      
      minX = Math.min(minX, horizontalEndX);
      maxX = Math.max(maxX, horizontalEndX);
      
      // Si hay texto, agregar su área al cálculo
      if (line.text && line.text.trim()) {
        const textLines = line.text.split('\n');
        const lineHeight = 18;
        const textHeight = textLines.length * lineHeight;
        
        // Calcular el área ocupada por el texto
        const textX = isPointingRight 
          ? line.endX + 10 
          : line.endX - horizontalLineLength + 10;
        const textY = line.endY - 10;
        
        // Estimar el ancho del texto (aproximación)
        const estimatedTextWidth = textLines.reduce((maxWidth, line) => {
          return Math.max(maxWidth, line.length * 8); // Aproximado: 8px por carácter
        }, 0);
        
        minX = Math.min(minX, textX);
        minY = Math.min(minY, textY - textHeight);
        maxX = Math.max(maxX, textX + estimatedTextWidth);
        maxY = Math.max(maxY, textY + 5); // pequeño margen inferior
      }
    });
    
    // Agregar un margen alrededor del área activa para que nada quede cortado
    const margin = 30;
    minX = Math.max(0, Math.floor(minX - margin));
    minY = Math.max(0, Math.floor(minY - margin));
    maxX = Math.min(canvasDimensions.width, Math.ceil(maxX + margin));
    maxY = Math.min(canvasDimensions.height, Math.ceil(maxY + margin));
    
    // Asegurar que las dimensiones sean números enteros
    const width = maxX - minX;
    const height = maxY - minY;
    
    return {
      x: minX,
      y: minY,
      width: width,
      height: height
    };
  };

  // Función para deshacer la última acción
  const handleUndo = () => {
    // No hacer nada si estamos en modo de entrada de texto
    if (activeTextInput) {
      // Si estamos editando texto, cancelamos la edición
      cancelTextInput();
      return;
    }
    
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

  // Añadimos el manejador de atajos para zoom
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Control+0 para reset view
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        resetView();
      }
      
      // Espacio para alternar entre modos
      if (e.key === ' ' && !activeTextInput) {
        e.preventDefault();
        toggleViewMode();
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [undoHistory, lines, activeTextInput, scale, offset, viewMode]);

  // Actualizar el canvas cuando cambian zoom, posición, líneas o texto activo
  useEffect(() => {
    redrawCanvas();
  }, [lines, currentLine, activeTextInput, scale, offset]);

  // Función para calcular la posición del textarea
  const calculateTextareaPosition = (activeInput) => {
    if (!canvasRef.current || !activeInput) return { left: 0, top: 0 };

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Calcula la posición central para la imagen
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Determine la dirección del texto (derecha o izquierda)
    const isPointingRight = activeInput.endX >= activeInput.startX;

    // Calcula la posición en coordenadas del canvas
    const inputX = activeInput.endX;
    const inputY = activeInput.endY - 40 / scale; // Ligero offset vertical para no tapar la línea

    // Aplica todas las transformaciones para obtener la posición en pantalla
    // Primero convierte de coordenadas del canvas a coordenadas DOM
    const transformedX = (
      // Posición base en el canvas
      inputX
      // Ajuste por desplazamiento horizontal (pan)
      + offset.x / scale
      // Ajuste por la posición central del canvas
      - centerX * (1 - 1/scale)
    ) * scale;

    const transformedY = (
      // Posición base en el canvas
      inputY
      // Ajuste por desplazamiento vertical (pan)
      + offset.y / scale
      // Ajuste por la posición central del canvas
      - centerY * (1 - 1/scale)
    ) * scale;

    // Añade un desplazamiento horizontal dependiendo de la dirección de la línea
    const horizontalOffset = isPointingRight ? 50 : -50;

    return {
      left: transformedX + horizontalOffset,
      top: transformedY
    };
  };

  // Función para manejar el cambio de color
  const handleColorChange = (color) => {
    setLineColor(color);
  };

  return (
    <div className="editor-page fixed inset-0 overflow-hidden bg-gray-100 flex flex-col">
      {/* Barra de herramientas fija en la parte superior */}
      <div className="toolbar fixed top-0 left-0 right-0 bg-white shadow-md z-10 py-2 px-4">
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-screen-xl mx-auto">
          <button 
            onClick={handleUndo}
            disabled={undoHistory.length === 0 && lines.length === 0}
            className={`btn-tool ${(undoHistory.length === 0 && lines.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Deshacer (Ctrl+Z)"
          >
            Deshacer
          </button>
          
          <button 
            onClick={clearLines}
            className="btn-tool bg-red-500 hover:bg-red-600"
            title="Eliminar todas las líneas"
          >
            Limpiar líneas
          </button>
          
          <button 
            onClick={toggleViewMode}
            className={`btn-tool ${viewMode === 'move' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'}`}
            title="Cambiar entre modo edición y movimiento (Espacio)"
          >
            {viewMode === 'move' ? 'Modo Mover' : 'Modo Editar'}
          </button>
          
          {/* Selector de color */}
          <div className="color-picker-container flex items-center">
            <label className="text-sm mr-2">Color:</label>
            <div className="color-picker-wrapper relative">
              <input
                type="color"
                value={lineColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="color-picker w-8 h-8 cursor-pointer outline-none border-0"
                title="Seleccionar color de línea"
              />
              <div 
                className="selected-color absolute top-0 left-0 right-0 bottom-0 pointer-events-none" 
                style={{ backgroundColor: lineColor, borderRadius: '4px' }}
              ></div>
            </div>
          </div>
          
          {/* Paleta de colores predefinidos */}
          <div className="color-palette flex space-x-1 ml-1">
            {predefinedColors.map((color) => (
              <button
                key={color}
                className="color-option w-6 h-6 rounded-sm border-2 cursor-pointer transition-transform"
                style={{ 
                  backgroundColor: color, 
                  borderColor: color === lineColor ? '#333' : 'transparent',
                  transform: color === lineColor ? 'scale(1.2)' : 'scale(1)'
                }}
                onClick={() => handleColorChange(color)}
                title="Seleccionar este color"
              />
            ))}
          </div>
          
          <button 
            onClick={resetView}
            className="btn-tool"
            title="Restablecer zoom y posición (Ctrl+0)"
          >
            Reset Vista
          </button>
          
          <button 
            onClick={downloadImage}
            className="btn-tool bg-green-500 hover:bg-green-600"
            title="Exportar imagen recortada"
          >
            Exportar JPG
          </button>
          
          <button 
            onClick={goBack}
            className="btn-tool bg-gray-500 hover:bg-gray-600"
          >
            Volver
          </button>
          
          <span className="text-sm text-gray-600 ml-2">
            Zoom: {Math.round(scale * 100)}%
            {canvasDimensions.scale < 1 && ` • Imagen original: ${Math.round(canvasDimensions.scale * 100)}%`}
          </span>
        </div>
      </div>
      
      {/* Contenedor principal que ocupa todo el espacio disponible */}
      <div 
        className="canvas-container flex-grow mt-16 overflow-hidden"
        ref={containerRef}
        onWheel={handleWheel}
      >
        <div 
          className="relative"
          style={{ 
            width: canvasDimensions.width, 
            height: canvasDimensions.height,
            margin: '0 auto'
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            className={`${viewMode === 'move' ? 'cursor-grab' : 'cursor-crosshair'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={(e) => e.preventDefault()} // Prevenir menú contextual
          />
          
          {/* Input de texto flotante con posición corregida */}
          {activeTextInput && (
            <div 
              style={{
                position: 'absolute',
                left: `${calculateTextareaPosition(activeTextInput).left}px`,
                top: `${calculateTextareaPosition(activeTextInput).top}px`,
                zIndex: 10,
                transform: 'translate(-50%, -50%)'
              }}
              className="textarea-container"
            >
              <div className="textarea-controls bg-gray-200 rounded-t px-2 py-1 flex justify-between items-center border border-gray-300 border-b-0">
                <span className="text-sm text-gray-700">Editar texto</span>
                <div className="flex gap-1">
                  <button 
                    onClick={saveTextAndCloseInput}
                    className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                    title="Guardar (Enter)"
                  >
                    Guardar
                  </button>
                  <button 
                    onClick={cancelTextInput}
                    className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    title="Cancelar (Esc)"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
              
              <textarea
                ref={textInputRef}
                value={activeTextInput.text || ''}
                onChange={handleTextChange}
                onKeyDown={handleTextKeyDown}
                className="border border-gray-300 p-2 min-w-[200px] min-h-[80px] bg-white shadow-md text-black rounded-b"
                placeholder="Escribe texto aquí... (Enter para guardar, Shift+Enter para nueva línea)"
                autoFocus
                style={{ 
                  fontSize: `${Math.max(12, 14 / Math.sqrt(scale))}px`,
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
