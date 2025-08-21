// Script para cargar PDFs directamente sin validación
// Se ejecuta después de que PDF.js esté parcialmente cargado

(function() {
    'use strict';

    console.log('[PDF.js Extension] Direct loader script cargado');

    // Función para cargar PDF directamente usando la API de PDF.js
    function loadPDFDirectly(url) {
        console.log('[PDF.js Extension] Cargando PDF directamente:', url);

        // Configuración para PDF.js
        const loadingTask = window.pdfjsLib.getDocument({
            url: url,
            cMapUrl: 'cmaps/',
            cMapPacked: true,
            enableXfa: true,
            verbosity: 0 // Reducir logs
        });

        // Manejar la carga
        loadingTask.promise.then(function(pdf) {
            console.log('[PDF.js Extension] PDF cargado exitosamente:', pdf);
            
            // Asignar el PDF al viewer
            if (window.PDFViewerApplication) {
                // Cerrar cualquier documento existente primero
                if (window.PDFViewerApplication.pdfDocument) {
                    window.PDFViewerApplication.close();
                }
                
                // Asignar el nuevo documento
                window.PDFViewerApplication.pdfDocument = pdf;
                
                // Configurar las propiedades necesarias
                Object.defineProperty(window.PDFViewerApplication, 'pagesCount', {
                    get: function() { return pdf.numPages; },
                    configurable: true
                });
                
                // Notificar que el documento está listo
                if (window.PDFViewerApplication.eventBus) {
                    window.PDFViewerApplication.eventBus.dispatch('documentloaded', {
                        source: window.PDFViewerApplication
                    });
                }
                
                // Configurar la URL en el viewer
                if (window.PDFViewerApplication.url !== url) {
                    Object.defineProperty(window.PDFViewerApplication, 'url', {
                        value: url,
                        writable: true,
                        configurable: true
                    });
                }
                
                // Renderizar todas las páginas usando el viewer nativo
                renderAllPages(pdf);
            }
            
        }).catch(function(error) {
            console.error('[PDF.js Extension] Error cargando PDF directamente:', error);
            
            // Si falla, mostrar mensaje de error personalizado
            showErrorMessage('Error cargando el archivo PDF: ' + error.message);
        });

        return loadingTask;
    }

    // Función para renderizar todas las páginas usando el viewer nativo
    function renderAllPages(pdf) {
        console.log('[PDF.js Extension] Configurando renderizado de todas las páginas');
        
        // Usar el PDFViewer nativo si está disponible
        if (window.PDFViewerApplication.pdfViewer) {
            try {
                // Configurar el documento en el viewer nativo
                window.PDFViewerApplication.pdfViewer.setDocument(pdf);
                console.log('[PDF.js Extension] Documento configurado en viewer nativo');
                
                // Actualizar UI
                updatePDFViewer(pdf);
                
                return;
            } catch (e) {
                console.log('[PDF.js Extension] Error con viewer nativo, usando fallback:', e);
            }
        }
        
        // Fallback: renderizar solo la primera página
        pdf.getPage(1).then(function(page) {
            console.log('[PDF.js Extension] Primera página obtenida (fallback)');
            
            // Buscar el canvas del viewer
            const viewer = document.getElementById('viewer');
            if (viewer) {
                // Limpiar viewer existente
                viewer.innerHTML = '';
                
                // Crear canvas para la página
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                viewer.appendChild(canvas);
                
                // Calcular escala
                const viewport = page.getViewport({ scale: 1.0 });
                const scale = Math.min(
                    (viewer.clientWidth - 20) / viewport.width,
                    (viewer.clientHeight - 20) / viewport.height
                );
                
                const scaledViewport = page.getViewport({ scale: scale });
                
                // Configurar canvas
                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;
                
                // Renderizar página
                const renderContext = {
                    canvasContext: context,
                    viewport: scaledViewport
                };
                
                page.render(renderContext).promise.then(function() {
                    console.log('[PDF.js Extension] Primera página renderizada (fallback)');
                    
                    // Actualizar UI
                    updatePDFViewer(pdf);
                });
            }
        });
    }

    // Función para actualizar la interfaz del viewer
    function updatePDFViewer(pdf) {
        console.log('[PDF.js Extension] Actualizando interfaz del viewer');
        
        // Actualizar contador de páginas
        const numPages = document.getElementById('numPages');
        if (numPages) {
            numPages.textContent = `de ${pdf.numPages}`;
        }
        
        // Habilitar controles
        const pageNumber = document.getElementById('pageNumber');
        if (pageNumber) {
            pageNumber.value = '1';
            pageNumber.max = pdf.numPages;
        }
        
        // Remover indicador de carga
        const loadingBar = document.getElementById('loadingBar');
        if (loadingBar) {
            loadingBar.style.display = 'none';
        }
        
        console.log('[PDF.js Extension] ✅ PDF cargado completamente');
    }

    // Función para mostrar mensaje de error
    function showErrorMessage(message) {
        const viewer = document.getElementById('viewer');
        if (viewer) {
            viewer.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    flex-direction: column;
                    font-family: Arial, sans-serif;
                    color: #666;
                ">
                    <h3>Error al cargar el PDF</h3>
                    <p>${message}</p>
                    <button id="retryButton" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-top: 10px;
                    ">Reintentar</button>
                </div>
            `;
            
            // Añadir event listener después de crear el elemento
            const retryButton = document.getElementById('retryButton');
            if (retryButton) {
                retryButton.addEventListener('click', function() {
                    window.location.reload();
                });
            }
        }
    }

    // Función principal para inicializar la carga directa
    function initializeDirectLoader() {
        console.log('[PDF.js Extension] Inicializando direct loader');
        
        // Esperar a que PDFjs esté disponible
        function checkPDFJS() {
            console.log('[PDF.js Extension] Verificando disponibilidad de PDF.js...');
            
            if (window.pdfjsLib && window.pdfjsLib.getDocument) {
                console.log('[PDF.js Extension] PDF.js disponible');
                
                // Esperar un poco más para que la extensión configure la URL
                setTimeout(() => {
                    const fileURL = window.PDFJSExtensionFileURL;
                    console.log('[PDF.js Extension] URL de archivo detectada:', fileURL);
                    
                    if (fileURL && fileURL !== '') {
                        console.log('[PDF.js Extension] Iniciando carga directa con:', fileURL);
                        loadPDFDirectly(fileURL);
                    } else {
                        console.log('[PDF.js Extension] No hay URL válida para carga directa');
                        
                        // Verificar si hay parámetros openLocal
                        if (window.location.search.includes('openLocal=true')) {
                            console.log('[PDF.js Extension] Modo openLocal detectado, esperando selección de archivo');
                        }
                    }
                }, 500);
                
            } else {
                console.log('[PDF.js Extension] PDF.js no disponible aún, reintentando...');
                // Reintentar después de un momento
                setTimeout(checkPDFJS, 200);
            }
        }
        
        checkPDFJS();
    }

    // Exponer función globalmente para uso manual
    window.PDFJSExtensionDirectLoader = {
        loadPDF: loadPDFDirectly,
        initialize: initializeDirectLoader
    };

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDirectLoader);
    } else {
        initializeDirectLoader();
    }

    console.log('[PDF.js Extension] Direct loader configurado');

})();