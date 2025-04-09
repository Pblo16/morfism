import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { redrawCanvas, calculateActiveBoundingBox } from '../utils/canvasUtils'
import ExportPreview from './ExportPreview'
import '../styles/scrollbars.css' // Importar los estilos para scrollbars personalizados

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
    redrawCanvas(canvasRef, scale, offset, lines, currentLine, lineColor, activeTextInput, cachedImageRef, canvasDimensions);
    
    // Ajustamos el scroll para centrar la imagen inicialmente
    if (containerRef.current && canvasRef.current) {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      
      // Centramos el scroll
      container.scrollLeft = (canvas.width - container.clientWidth) / 2;
      container.scrollTop = (canvas.height - container.clientHeight) / 2;
    }
  }, [canvasDimensions, imageLoaded, scale, offset, lines, currentLine, lineColor, activeTextInput]);

  // Modificar el manejador de eventos para zoom (ahora con Shift)
  const handleWheel = (e) => {
    e.preventDefault();
    
    // Factor de zoom por cada scroll
    const zoomIntensity = 0.1;
    
    // Verificar si Shift está presionado para zoom
    if (e.shiftKey) {
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
    } else {
      // Movimiento normal (desplazamiento)
      // Permitir que el contenedor maneje el scroll natural
      if (containerRef.current) {
        containerRef.current.scrollTop += e.deltaY;
        containerRef.current.scrollLeft += e.deltaX;
      }
    }
  };

  // Manejadores de eventos para arrastrar el canvas (pan)
  const handlePanStart = (e) => {
    // Solo iniciar arrastre si está en modo mover o se usa el botón central
    if (viewMode === 'move' || e.button === 1) { 
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
      const boundingBox = calculateActiveBoundingBox(canvasRef, canvasDimensions, lines);
      
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
      const root = document.createElement('div');
      document.body.appendChild(root);
      
      const handleDownload = () => {
        const link = document.createElement('a');
        link.download = `imagen_editada_${new Date().getTime()}.jpg`;
        link.href = exportCanvas.toDataURL('image/jpeg', 0.9);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        document.body.removeChild(root);
      };
      
      const handleClose = () => {
        document.body.removeChild(root);
      };
      
      // Mostrar el componente ExportPreview
      const previewProps = {
        exportCanvas,
        onDownload: handleDownload,
        onClose: handleClose
      };
      
      const modalDiv = document.createElement('div');
      root.appendChild(modalDiv);
      
      // Mostrar el modal de vista previa
      const previewElement = document.createElement('div');
      previewElement.id = 'export-preview-container';
      modalDiv.appendChild(previewElement);
      
      // Usamos el componente ExportPreview
      const previewContainer = document.getElementById('export-preview-container');
      
      // Simulamos el renderizado del componente ExportPreview (en un contexto real usaríamos ReactDOM.render)
      const previewModal = document.createElement('div');
      previewModal.innerHTML = `
        <div class="export-preview-modal">
          <div class="export-container">
            <h3>Vista previa de la imagen recortada</h3>
            <div class="image-container">
              <img src="${exportCanvas.toDataURL('image/jpeg', 0.9)}" alt="Vista previa de exportación" />
            </div>
            <div class="info">Dimensiones: ${exportCanvas.width}px × ${exportCanvas.height}px</div>
            <div class="controls">
              <button id="download-btn">Descargar</button>
              <button id="cancel-btn">Cancelar</button>
            </div>
          </div>
        </div>
      `;
      
      // Estilizar el modal
      const modalStyle = document.createElement('style');
      modalStyle.textContent = `
        .export-preview-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.8);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .export-container {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          max-width: 90%;
          max-height: 90%;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        h3 {
          margin: 0;
          text-align: center;
        }
        .image-container {
          overflow: auto;
          max-height: 70vh;
          display: flex;
          justify-content: center;
          border: 1px solid #ddd;
          background-color: #f8f8f8;
        }
        .image-container img {
          max-width: 100%;
          max-height: 100%;
        }
        .info {
          text-align: center;
          color: #666;
        }
        .controls {
          display: flex;
          justify-content: center;
          gap: 10px;
        }
        button {
          padding: 8px 16px;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        #download-btn {
          background-color: #22c55e;
        }
        #cancel-btn {
          background-color: #ef4444;
        }
      `;
      
      previewContainer.appendChild(previewModal);
      document.head.appendChild(modalStyle);
      
      // Agregar eventos a los botones
      document.getElementById('download-btn').addEventListener('click', handleDownload);
      document.getElementById('cancel-btn').addEventListener('click', handleClose);
      
    } catch (error) {
      console.error('Error al preparar la imagen para descargar:', error);
      alert('Hubo un problema al procesar la imagen.');
    }
  };

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
            <span className="ml-2 text-gray-500 italic text-xs">(Shift + Rueda para zoom)</span>
          </span>
        </div>
      </div>
      
      {/* Contenedor principal con barras de desplazamiento */}
      <div 
        className="canvas-container custom-scrollbar flex-grow mt-16 overflow-auto" 
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
      
      {/* Indicaciones de ayuda para la navegación */}
      <div className="navigation-help fixed bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white text-xs px-3 py-1 rounded-full z-10">
        <span>Shift + Rueda = Zoom</span>
        <span className="mx-2">|</span>
        <span>Rueda = Desplazamiento</span>
        <span className="mx-2">|</span>
        <span>Espacio = Cambiar modo</span>
      </div>
    </div>
  );
}

export default ImageEditor;
