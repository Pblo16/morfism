import React from 'react';

const ExportPreview = ({ exportCanvas, onDownload, onClose }) => {
  return (
    <div className="export-preview-modal">
      <div className="export-container">
        <h3>Vista previa de la imagen recortada</h3>
        <div className="image-container">
          <img src={exportCanvas.toDataURL('image/jpeg', 0.9)} alt="Vista previa de exportación" />
        </div>
        <div className="info">Dimensiones: {exportCanvas.width}px × {exportCanvas.height}px</div>
        <div className="controls">
          <button 
            onClick={onDownload} 
            className="btn-tool bg-green-500"
          >
            Descargar
          </button>
          <button 
            onClick={onClose} 
            className="btn-tool bg-red-500"
          >
            Cancelar
          </button>
        </div>
      </div>

      <style jsx>{`
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
        img {
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
      `}</style>
    </div>
  );
};

export default ExportPreview;
