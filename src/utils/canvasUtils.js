// Función para redibujar el canvas con zoom y desplazamiento
export const redrawCanvas = (canvasRef, scale, offset, lines, currentLine, lineColor, activeTextInput, cachedImageRef, canvasDimensions) => {
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

            // Calcular ancho de texto (necesario para indicador de edición)
            const textWidth = Math.max(...textLines.map(text => ctx.measureText(text).width));

            // Añadir un indicador visual para textos editables (pequeño botón de edición)
            // Verificamos si estamos en modo edición
            if (line.viewMode !== 'move') {
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

// Función para calcular el área activa del canvas (imagen + anotaciones)
export const calculateActiveBoundingBox = (canvasRef, canvasDimensions, lines) => {
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
