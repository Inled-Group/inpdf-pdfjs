// Script que se ejecuta después de que PDF.js esté completamente cargado
// para asegurar que el archivo se carga correctamente

(function() {
    'use strict';

    console.log('[PDF.js Extension] Post-load script ejecutándose');

    // Función para forzar la carga del PDF usando múltiples métodos
    function forceLoadPDF() {
        const fileURL = window.PDFJSExtensionFileURL;
        const originalURL = window.PDFJSExtensionOriginalURL;
        
        if (!fileURL) {
            console.log('[PDF.js Extension] No hay URL de archivo configurada');
            return;
        }

        console.log('[PDF.js Extension] Forzando carga de PDF:', fileURL);
        if (originalURL && originalURL !== fileURL) {
            console.log('[PDF.js Extension] URL original:', originalURL);
        }

        // Intentar múltiples métodos de carga
        if (window.PDFViewerApplication) {
            console.log('[PDF.js Extension] PDFViewerApplication encontrado');
            
            // Verificar si ya hay un PDF cargado
            if (window.PDFViewerApplication.pdfDocument) {
                console.log('[PDF.js Extension] PDF ya cargado');
                return;
            }

            // Método 1: Usar open() directamente
            try {
                console.log('[PDF.js Extension] Método 1: Usando open()');
                window.PDFViewerApplication.open(fileURL);
                console.log('[PDF.js Extension] open() ejecutado');
                return;
            } catch (error) {
                console.log('[PDF.js Extension] Método 1 falló:', error.message);
            }

            // Método 2: Usar setTitleUsingUrl y load
            try {
                console.log('[PDF.js Extension] Método 2: Usando load()');
                if (window.PDFViewerApplication.load) {
                    window.PDFViewerApplication.load(fileURL);
                    console.log('[PDF.js Extension] load() ejecutado');
                    return;
                }
            } catch (error) {
                console.log('[PDF.js Extension] Método 2 falló:', error.message);
            }

            // Método 3: Usar el evento download
            try {
                console.log('[PDF.js Extension] Método 3: Usando evento download');
                if (window.PDFViewerApplication.eventBus) {
                    window.PDFViewerApplication.eventBus.dispatch('download', {
                        source: window.PDFViewerApplication,
                        url: fileURL
                    });
                    console.log('[PDF.js Extension] Evento download disparado');
                    return;
                }
            } catch (error) {
                console.log('[PDF.js Extension] Método 3 falló:', error.message);
            }

            // Método 4: Forzar a través de la configuración interna
            try {
                console.log('[PDF.js Extension] Método 4: Configuración interna');
                
                // Establecer la URL en el objeto interno
                if (window.PDFViewerApplication.url !== fileURL) {
                    window.PDFViewerApplication.url = fileURL;
                }
                
                // Intentar reinicializar
                if (window.PDFViewerApplication.run) {
                    console.log('[PDF.js Extension] Reejecutando run()');
                    window.PDFViewerApplication.run({
                        url: fileURL
                    });
                }
                
                return;
            } catch (error) {
                console.log('[PDF.js Extension] Método 4 falló:', error.message);
            }

            // Método 5: Crear nuevo getDocument
            try {
                console.log('[PDF.js Extension] Método 5: getDocument directo');
                
                if (window.pdfjsLib && window.pdfjsLib.getDocument) {
                    window.pdfjsLib.getDocument(fileURL).promise.then(pdf => {
                        console.log('[PDF.js Extension] PDF cargado directamente:', pdf);
                        window.PDFViewerApplication.pdfDocument = pdf;
                        window.PDFViewerApplication.load(pdf);
                    }).catch(error => {
                        console.log('[PDF.js Extension] getDocument falló:', error.message);
                    });
                }
                
                return;
            } catch (error) {
                console.log('[PDF.js Extension] Método 5 falló:', error.message);
            }

        } else {
            console.warn('[PDF.js Extension] PDFViewerApplication no encontrado aún');
            
            // Intentar de nuevo en un momento
            setTimeout(forceLoadPDF, 100);
        }
    }

    // Función para configurar eventos de debugging
    function setupDebugging() {
        // Event listener para cuando PDFViewerApplication esté listo
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('webviewerloaded', function() {
                console.log('[PDF.js Extension] Evento webviewerloaded detectado');
                setTimeout(forceLoadPDF, 50);
            });

            window.addEventListener('documentloaded', function(event) {
                console.log('[PDF.js Extension] Documento PDF cargado:', event);
            });

            window.addEventListener('documentinit', function(event) {
                console.log('[PDF.js Extension] Documento PDF inicializado:', event);
            });
        }

        // Monitorear cuando PDFViewerApplication esté disponible
        let checkCount = 0;
        const maxChecks = 50; // Máximo 5 segundos (50 * 100ms)
        
        function checkPDFViewerApplication() {
            checkCount++;
            
            if (window.PDFViewerApplication) {
                console.log('[PDF.js Extension] PDFViewerApplication detectado después de', checkCount * 100, 'ms');
                setTimeout(forceLoadPDF, 100);
                return;
            }
            
            if (checkCount < maxChecks) {
                setTimeout(checkPDFViewerApplication, 100);
            } else {
                console.warn('[PDF.js Extension] PDFViewerApplication no encontrado después de 5 segundos');
            }
        }
        
        checkPDFViewerApplication();
    }

    // Función para verificar si el PDF se cargó correctamente
    function verifyPDFLoad() {
        setTimeout(function() {
            if (window.PDFViewerApplication && window.PDFViewerApplication.pdfDocument) {
                console.log('[PDF.js Extension] ✅ PDF cargado correctamente');
                
                // Verificar si hay páginas
                const numPages = window.PDFViewerApplication.pagesCount;
                console.log('[PDF.js Extension] Número de páginas:', numPages);
                
                if (numPages > 0) {
                    console.log('[PDF.js Extension] ✅ PDF completamente funcional');
                } else {
                    console.warn('[PDF.js Extension] ⚠️ PDF cargado pero sin páginas detectadas');
                }
            } else {
                console.warn('[PDF.js Extension] ❌ PDF no se ha cargado después de 3 segundos');
                
                // Mostrar información de debugging
                console.log('[PDF.js Extension] Estado actual:');
                console.log('- PDFViewerApplication:', !!window.PDFViewerApplication);
                console.log('- pdfDocument:', !!(window.PDFViewerApplication && window.PDFViewerApplication.pdfDocument));
                console.log('- URL configurada:', window.PDFJSExtensionFileURL);
                console.log('- Parámetros URL:', window.location.search);
            }
        }, 3000);
    }

    // Inicializar el script post-load
    function initialize() {
        console.log('[PDF.js Extension] Inicializando verificación post-load');
        setupDebugging();
        verifyPDFLoad();
    }

    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();