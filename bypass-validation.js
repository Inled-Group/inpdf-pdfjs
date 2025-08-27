// Script simplificado para bypasear validación de archivo en PDF.js
// Este script debe ejecutarse antes que viewer.mjs

(function() {
    'use strict';

    console.log('[PDF.js Extension] Bypass validation script cargado');

    // Función simple para silenciar errores específicos
    function setupErrorSilencing() {
        // Interceptar console.error para silenciar errores específicos
        const originalConsoleError = console.error;
        console.error = function(...args) {
            const message = args.join(' ');
            // Solo silenciar errores específicos de origen de archivo, no todos los errores
            if (message.includes('file origin does not match viewer origin') ||
                message.includes('getDocument - no `url` parameter provided') ||
                (message.includes('file:') && message.includes('origin does not match'))) {
                console.log('[PDF.js Extension] Error silenciado:', message.substring(0, 100));
                return;
            }
            return originalConsoleError.apply(this, args);
        };

        // Interceptar errores globales
        window.addEventListener('error', function(event) {
            if (event.message && 
                (event.message.includes('file origin does not match viewer origin') ||
                 event.message.includes('getDocument - no `url` parameter provided'))) {
                console.log('[PDF.js Extension] Error global silenciado');
                event.preventDefault();
            }
        });

        // Interceptar Promise rejections
        window.addEventListener('unhandledrejection', function(event) {
            const message = event.reason?.message || event.reason;
            if (typeof message === 'string' && 
                (message.includes('file origin does not match viewer origin') ||
                 message.includes('getDocument - no `url` parameter provided'))) {
                console.log('[PDF.js Extension] Promise rejection silenciada');
                event.preventDefault();
            }
        });
    }

    // Función para interceptar URLSearchParams y proporcionar el archivo correcto
    function interceptURLParams() {
        const originalURLSearchParams = window.URLSearchParams;
        
        window.URLSearchParams = function(init) {
            const params = new originalURLSearchParams(init);
            
            // Interceptar el método get
            const originalGet = params.get.bind(params);
            params.get = function(name) {
                const value = originalGet(name);
                
                if (name === 'file') {
                    // Si hay una URL de extensión configurada, usarla
                    if (window.PDFJSExtensionFileURL) {
                        console.log('[PDF.js Extension] Proporcionando URL de archivo desde extensión:', window.PDFJSExtensionFileURL);
                        return window.PDFJSExtensionFileURL;
                    }
                }
                
                return value;
            };
            
            // Interceptar el método has
            const originalHas = params.has.bind(params);
            params.has = function(name) {
                if (name === 'file' && window.PDFJSExtensionFileURL) {
                    console.log('[PDF.js Extension] Confirmando que existe parámetro file');
                    return true;
                }
                return originalHas(name);
            };
            
            return params;
        };
        
        // Preservar prototipo
        window.URLSearchParams.prototype = originalURLSearchParams.prototype;
        
        // Intentar interceptar window.location.search si es posible
        try {
            let originalLocationSearch = window.location.search;
            Object.defineProperty(window.location, 'search', {
                get: function() {
                    if (window.PDFJSExtensionFileURL) {
                        const url = new URL(window.location.href);
                        url.searchParams.set('file', window.PDFJSExtensionFileURL);
                        return url.search;
                    }
                    return originalLocationSearch;
                },
                configurable: true
            });
        } catch (e) {
            console.log('[PDF.js Extension] No se pudo interceptar window.location.search (ya definido)');
        }
    }

    // Función para asegurar que la funcionalidad de búsqueda funcione correctamente
    function ensureSearchFunctionality() {
        window.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                const findButton = document.getElementById('viewFindButton');
                const findInput = document.getElementById('findInput');
                const findbar = document.getElementById('findbar');
                
                if (findButton && findbar && findInput) {
                    console.log('[PDF.js Extension] Elementos de búsqueda encontrados, configurando funcionalidad');
                    
                    // Función para cerrar la barra y limpiar resultados
                    const hideSearchBar = function() {
                        if (!findbar.classList.contains('hidden')) {
                            findbar.classList.add('hidden');
                            findButton.setAttribute('aria-expanded', 'false');
                            clearSearch();
                            console.log('[PDF.js Extension] Barra de búsqueda cerrada y resultados limpiados');
                        }
                    };
                    
                    // Asegurar que el botón de búsqueda muestre/oculte la barra
                    findButton.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (findbar.classList.contains('hidden')) {
                            findbar.classList.remove('hidden');
                            findButton.setAttribute('aria-expanded', 'true');
                            setTimeout(() => findInput.focus(), 100);
                            console.log('[PDF.js Extension] Barra de búsqueda mostrada');
                        } else {
                            hideSearchBar();
                        }
                    });
                    
                    // Añadir funcionalidad de escape para cerrar
                    document.addEventListener('keydown', function(e) {
                        if (e.key === 'Escape' && !findbar.classList.contains('hidden')) {
                            hideSearchBar();
                        }
                    });
                    
                    // Añadir atajo Ctrl+F
                    document.addEventListener('keydown', function(e) {
                        if (e.ctrlKey && e.key === 'f') {
                            e.preventDefault();
                            findbar.classList.remove('hidden');
                            findButton.setAttribute('aria-expanded', 'true');
                            setTimeout(() => findInput.focus(), 100);
                            console.log('[PDF.js Extension] Barra de búsqueda abierta con Ctrl+F');
                        }
                    });
                    
                    // Configurar funcionalidad de búsqueda actual
                    const findPreviousButton = document.getElementById('findPreviousButton');
                    const findNextButton = document.getElementById('findNextButton');
                    
                    // Variables para la búsqueda
                    let currentSearchResults = [];
                    let currentSearchIndex = -1;
                    let currentQuery = '';
                    
                    // Función mejorada de búsqueda
                    function performSearch(direction = 1) {
                        const query = findInput.value.trim();
                        if (!query) {
                            clearSearch();
                            return;
                        }
                        
                        console.log('[PDF.js Extension] Buscando:', query);
                        
                        // Si es una nueva búsqueda, resetear
                        if (query !== currentQuery) {
                            clearSearch();
                            currentQuery = query;
                            findInDocument(query);
                        } else {
                            // Navegar entre resultados existentes
                            navigateResults(direction);
                        }
                    }
                    
                    // Buscar en el documento
                    function findInDocument(query) {
                        // Primero intentar con la API nativa de PDF.js
                        if (window.PDFViewerApplication && window.PDFViewerApplication.eventBus) {
                            try {
                                // Configurar el controlador de búsqueda
                                if (window.PDFViewerApplication.findController) {
                                    window.PDFViewerApplication.findController.executeCommand('find', {
                                        query: query,
                                        phraseSearch: true,
                                        caseSensitive: false,
                                        entireWord: false,
                                        highlightAll: true,
                                        findPrevious: false
                                    });
                                    console.log('[PDF.js Extension] Búsqueda ejecutada con findController');
                                    return;
                                }
                                
                                // Método alternativo con eventBus
                                window.PDFViewerApplication.eventBus.dispatch('find', {
                                    source: window.PDFViewerApplication,
                                    type: 'find',
                                    query: query,
                                    phraseSearch: true,
                                    caseSensitive: false,
                                    entireWord: false,
                                    highlightAll: true,
                                    findPrevious: false
                                });
                                console.log('[PDF.js Extension] Búsqueda enviada con eventBus');
                                return;
                            } catch (error) {
                                console.log('[PDF.js Extension] Error con API nativa, usando búsqueda manual:', error);
                            }
                        }
                        
                        // Búsqueda manual como fallback
                        searchManually(query);
                    }
                    
                    // Búsqueda manual en el contenido del documento
                    function searchManually(query) {
                        currentSearchResults = [];
                        const textLayers = document.querySelectorAll('.textLayer');
                        
                        console.log('[PDF.js Extension] Buscando manualmente en', textLayers.length, 'capas de texto');
                        
                        textLayers.forEach((textLayer, pageIndex) => {
                            const textElements = textLayer.querySelectorAll('span');
                            
                            textElements.forEach((element, elementIndex) => {
                                const text = element.textContent || '';
                                const lowerText = text.toLowerCase();
                                const lowerQuery = query.toLowerCase();
                                
                                let index = 0;
                                while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
                                    currentSearchResults.push({
                                        element: element,
                                        pageIndex: pageIndex,
                                        elementIndex: elementIndex,
                                        textIndex: index,
                                        text: text,
                                        query: query
                                    });
                                    index += lowerQuery.length;
                                }
                            });
                        });
                        
                        console.log('[PDF.js Extension] Encontrados', currentSearchResults.length, 'resultados');
                        
                        if (currentSearchResults.length > 0) {
                            currentSearchIndex = 0;
                            highlightResults();
                            showResult(0);
                            updateSearchUI();
                        } else {
                            updateSearchUI();
                        }
                    }
                    
                    // Resaltar resultados
                    function highlightResults() {
                        // Limpiar resaltados anteriores
                        document.querySelectorAll('.searchHighlight').forEach(el => {
                            const parent = el.parentNode;
                            parent.insertBefore(document.createTextNode(el.textContent), el);
                            parent.removeChild(el);
                            parent.normalize();
                        });
                        
                        // Añadir nuevos resaltados
                        currentSearchResults.forEach((result, index) => {
                            try {
                                highlightText(result, index === currentSearchIndex);
                            } catch (error) {
                                console.log('[PDF.js Extension] Error resaltando resultado:', error);
                            }
                        });
                    }
                    
                    // Resaltar texto específico
                    function highlightText(result, isCurrent) {
                        const element = result.element;
                        const text = result.text;
                        const startIndex = result.textIndex;
                        const endIndex = startIndex + result.query.length;
                        
                        const beforeText = text.substring(0, startIndex);
                        const matchText = text.substring(startIndex, endIndex);
                        const afterText = text.substring(endIndex);
                        
                        element.innerHTML = '';
                        
                        if (beforeText) {
                            element.appendChild(document.createTextNode(beforeText));
                        }
                        
                        const highlight = document.createElement('mark');
                        highlight.className = 'searchHighlight' + (isCurrent ? ' currentResult' : '');
                        highlight.style.backgroundColor = isCurrent ? '#ff6b35' : '#ffff00';
                        highlight.style.color = isCurrent ? 'white' : 'black';
                        highlight.textContent = matchText;
                        element.appendChild(highlight);
                        
                        if (afterText) {
                            element.appendChild(document.createTextNode(afterText));
                        }
                    }
                    
                    // Navegar entre resultados
                    function navigateResults(direction) {
                        if (currentSearchResults.length === 0) return;
                        
                        currentSearchIndex += direction;
                        if (currentSearchIndex < 0) currentSearchIndex = currentSearchResults.length - 1;
                        if (currentSearchIndex >= currentSearchResults.length) currentSearchIndex = 0;
                        
                        highlightResults();
                        showResult(currentSearchIndex);
                        updateSearchUI();
                    }
                    
                    // Mostrar resultado actual
                    function showResult(index) {
                        if (index < 0 || index >= currentSearchResults.length) return;
                        
                        const result = currentSearchResults[index];
                        const element = result.element;
                        
                        // Hacer scroll al elemento
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'nearest'
                        });
                        
                        console.log('[PDF.js Extension] Mostrando resultado', index + 1, 'de', currentSearchResults.length);
                    }
                    
                    // Actualizar interfaz de búsqueda
                    function updateSearchUI() {
                        const findMsg = document.getElementById('findMsg');
                        const findResultsCount = document.getElementById('findResultsCount');
                        
                        if (currentSearchResults.length > 0) {
                            const current = currentSearchIndex + 1;
                            const total = currentSearchResults.length;
                            if (findResultsCount) {
                                findResultsCount.textContent = `${current} de ${total}`;
                            }
                            if (findMsg) {
                                findMsg.textContent = '';
                            }
                        } else if (currentQuery) {
                            if (findResultsCount) {
                                findResultsCount.textContent = '';
                            }
                            if (findMsg) {
                                findMsg.textContent = 'Frase no encontrada';
                            }
                        }
                    }
                    
                    // Limpiar búsqueda
                    function clearSearch() {
                        currentSearchResults = [];
                        currentSearchIndex = -1;
                        currentQuery = '';
                        
                        // Limpiar resaltados
                        document.querySelectorAll('.searchHighlight').forEach(el => {
                            const parent = el.parentNode;
                            parent.insertBefore(document.createTextNode(el.textContent), el);
                            parent.removeChild(el);
                            parent.normalize();
                        });
                        
                        const findMsg = document.getElementById('findMsg');
                        const findResultsCount = document.getElementById('findResultsCount');
                        if (findMsg) findMsg.textContent = '';
                        if (findResultsCount) findResultsCount.textContent = '';
                    }
                    
                    // Configurar eventos de búsqueda
                    if (findPreviousButton) {
                        findPreviousButton.addEventListener('click', () => performSearch(-1));
                    }
                    if (findNextButton) {
                        findNextButton.addEventListener('click', () => performSearch(1));
                    }
                    
                    // Búsqueda al presionar Enter
                    findInput.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            performSearch(e.shiftKey ? -1 : 1);
                        }
                    });
                    
                    // Búsqueda automática mientras se escribe (con debounce)
                    let searchTimeout;
                    findInput.addEventListener('input', function() {
                        clearTimeout(searchTimeout);
                        if (!findInput.value.trim()) {
                            clearSearch();
                            return;
                        }
                        searchTimeout = setTimeout(() => {
                            if (findInput.value.trim()) {
                                performSearch(1);
                            }
                        }, 500);
                    });
                    
                    
                    console.log('[PDF.js Extension] Funcionalidad de búsqueda configurada correctamente');
                } else {
                    console.error('[PDF.js Extension] ERROR: No se pudieron encontrar todos los elementos de búsqueda');
                    console.log('[PDF.js Extension] findButton:', !!findButton);
                    console.log('[PDF.js Extension] findbar:', !!findbar);
                    console.log('[PDF.js Extension] findInput:', !!findInput);
                }
            }, 1000);
        });
    }

    // Función para asegurar que las miniaturas funcionen
    function ensureThumbnailFunctionality() {
        window.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                console.log('[PDF.js Extension] Configurando funcionalidad de miniaturas');
                
                const thumbnailView = document.getElementById('thumbnailView');
                const viewThumbnailButton = document.getElementById('viewThumbnail');
                
                if (!thumbnailView || !viewThumbnailButton) {
                    console.error('[PDF.js Extension] ERROR: Elementos de miniaturas no encontrados');
                    return;
                }
                
                console.log('[PDF.js Extension] Elementos de miniaturas encontrados');
                
                // Configurar el botón de la barra lateral para generar miniaturas automáticamente
                const sidebarToggleButton = document.getElementById('sidebarToggleButton');
                if (sidebarToggleButton) {
                    sidebarToggleButton.addEventListener('click', function() {
                        // Esperar a que la barra lateral se abra
                        setTimeout(function() {
                            // Verificar si la barra lateral está abierta viendo el aria-expanded
                            const isExpanded = sidebarToggleButton.getAttribute('aria-expanded') === 'true';
                            
                            if (isExpanded) {
                                console.log('[PDF.js Extension] Barra lateral abierta - generando miniaturas automáticamente');
                                
                                // Asegurar que la vista de miniaturas esté activa primero
                                showThumbnailView();
                                
                                // Generar miniaturas si no existen o regenerar si es necesario
                                setTimeout(function() {
                                    generateThumbnails();
                                }, 100);
                            }
                        }, 200); // Reducir tiempo para ser más responsivo
                    });
                    
                    // También verificar si la barra lateral ya está abierta al cargar la página
                    setTimeout(function() {
                        const isExpanded = sidebarToggleButton.getAttribute('aria-expanded') === 'true';
                        if (isExpanded && thumbnailView.children.length === 0) {
                            console.log('[PDF.js Extension] Barra lateral ya abierta al cargar - generando miniaturas');
                            showThumbnailView();
                            setTimeout(function() {
                                generateThumbnails();
                            }, 500);
                        }
                    }, 2000); // Esperar a que todo esté cargado
                    
                } else {
                    console.log('[PDF.js Extension] Botón de barra lateral no encontrado');
                }
                
                // Función para generar miniaturas manualmente
                async function generateThumbnails() {
                    console.log('[PDF.js Extension] Iniciando generación de miniaturas');
                    
                    // Verificar que PDF.js esté disponible
                    if (!window.PDFViewerApplication || !window.PDFViewerApplication.pdfDocument) {
                        console.log('[PDF.js Extension] PDF no disponible aún, esperando...');
                        setTimeout(generateThumbnails, 1000);
                        return;
                    }
                    
                    const pdfDocument = window.PDFViewerApplication.pdfDocument;
                    console.log('[PDF.js Extension] PDF documento disponible, páginas:', pdfDocument.numPages);
                    
                    // Limpiar contenido anterior
                    thumbnailView.innerHTML = '';
                    
                    // Crear array para almacenar miniaturas en orden
                    const thumbnailElements = [];
                    
                    // Generar miniaturas secuencialmente para mantener el orden
                    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
                        try {
                            const thumbnailElement = await createThumbnailElement(pdfDocument, pageNum);
                            thumbnailElements.push(thumbnailElement);
                            
                            // Insertar inmediatamente en el DOM en el orden correcto
                            if (thumbnailElement) {
                                thumbnailView.appendChild(thumbnailElement);
                            }
                        } catch (error) {
                            console.error('[PDF.js Extension] Error creando miniatura para página', pageNum, ':', error);
                        }
                    }
                    
                    console.log('[PDF.js Extension] Todas las miniaturas generadas correctamente');
                }
                
                // Función para crear elemento de miniatura individual
                async function createThumbnailElement(pdfDocument, pageNum) {
                    try {
                        console.log('[PDF.js Extension] Creando miniatura para página', pageNum);
                        
                        const page = await pdfDocument.getPage(pageNum);
                        
                        // Crear enlace contenedor (PDF.js usa estructura a > .thumbnail)
                        const link = document.createElement('a');
                        link.href = '#';
                        link.title = `Página ${pageNum}`;
                        link.setAttribute('data-l10n-id', 'pdfjs-thumb-page-title');
                        link.setAttribute('data-l10n-args', JSON.stringify({ page: pageNum }));
                        
                        // Crear contenedor de miniatura
                        const thumbnailContainer = document.createElement('div');
                        thumbnailContainer.className = 'thumbnail';
                        thumbnailContainer.setAttribute('data-page-number', pageNum);
                        thumbnailContainer.setAttribute('data-loaded', 'true');
                        
                        // Crear canvas para renderizar miniatura
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.className = 'thumbnailImage';
                        
                        // Configurar dimensiones de miniatura
                        const THUMBNAIL_WIDTH = 98;
                        const viewport = page.getViewport({ scale: 1 });
                        const scale = THUMBNAIL_WIDTH / viewport.width;
                        const scaledViewport = page.getViewport({ scale });
                        
                        canvas.width = scaledViewport.width;
                        canvas.height = scaledViewport.height;
                        
                        // Configurar variables CSS para el thumbnail
                        thumbnailContainer.style.setProperty('--thumbnail-width', scaledViewport.width + 'px');
                        thumbnailContainer.style.setProperty('--thumbnail-height', scaledViewport.height + 'px');
                        
                        // Renderizar página en canvas
                        const renderContext = {
                            canvasContext: context,
                            viewport: scaledViewport
                        };
                        
                        const renderTask = page.render(renderContext);
                        await renderTask.promise;
                        
                        // Añadir evento de clic para navegar a la página
                        link.addEventListener('click', function(e) {
                            e.preventDefault();
                            console.log('[PDF.js Extension] Navegando a página', pageNum);
                            
                            if (window.PDFViewerApplication && window.PDFViewerApplication.page !== pageNum) {
                                window.PDFViewerApplication.page = pageNum;
                            }
                            
                            // Actualizar miniatura activa
                            document.querySelectorAll('.thumbnail').forEach(thumb => {
                                thumb.classList.remove('selected');
                            });
                            thumbnailContainer.classList.add('selected');
                        });
                        
                        // Añadir canvas a la miniatura
                        thumbnailContainer.appendChild(canvas);
                        
                        // Añadir miniatura al enlace
                        link.appendChild(thumbnailContainer);
                        
                        // Marcar primera página como seleccionada
                        if (pageNum === 1) {
                            thumbnailContainer.classList.add('selected');
                        }
                        
                        console.log('[PDF.js Extension] Miniatura creada para página', pageNum);
                        
                        // Retornar el elemento para que sea insertado en el orden correcto
                        return link;
                        
                    } catch (error) {
                        console.error('[PDF.js Extension] Error creando miniatura para página', pageNum, ':', error);
                        return null;
                    }
                }
                
                // Función para mostrar vista de miniaturas
                function showThumbnailView() {
                    // Mostrar el contenedor de miniaturas
                    thumbnailView.style.display = 'block';
                    
                    // Añadir estilo para forzar orden vertical correcto
                    if (!document.getElementById('thumbnail-order-fix')) {
                        const style = document.createElement('style');
                        style.id = 'thumbnail-order-fix';
                        style.textContent = `
                            #thumbnailView {
                                display: flex !important;
                                flex-direction: column !important;
                                align-items: center !important;
                            }
                            #thumbnailView > a {
                                display: block !important;
                                margin-bottom: 5px !important;
                            }
                            .thumbnail {
                                float: none !important;
                            }
                        `;
                        document.head.appendChild(style);
                    }
                    
                    // Ocultar otras vistas
                    const outlineView = document.getElementById('outlineView');
                    const attachmentsView = document.getElementById('attachmentsView');
                    const layersView = document.getElementById('layersView');
                    
                    if (outlineView) outlineView.classList.add('hidden');
                    if (attachmentsView) attachmentsView.classList.add('hidden');
                    if (layersView) layersView.classList.add('hidden');
                    
                    // Actualizar botones
                    document.querySelectorAll('#sidebarViewButtons button').forEach(btn => {
                        btn.classList.remove('toggled');
                        btn.setAttribute('aria-checked', 'false');
                    });
                    
                    viewThumbnailButton.classList.add('toggled');
                    viewThumbnailButton.setAttribute('aria-checked', 'true');
                    
                    console.log('[PDF.js Extension] Vista de miniaturas activada');
                }
                
                // Configurar evento del botón de miniaturas
                viewThumbnailButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log('[PDF.js Extension] Botón de miniaturas clickeado');
                    
                    showThumbnailView();
                    
                    // Siempre generar miniaturas cuando se hace clic en el botón (regenera si es necesario)
                    generateThumbnails();
                });
                
                // Monitorear cambios de página para actualizar miniatura activa
                function setupPageChangeMonitoring() {
                    let currentPage = 1;
                    
                    function checkPageChange() {
                        if (window.PDFViewerApplication && window.PDFViewerApplication.page !== currentPage) {
                            currentPage = window.PDFViewerApplication.page;
                            
                            // Actualizar miniatura activa
                            document.querySelectorAll('.thumbnail').forEach(thumb => {
                                thumb.classList.remove('selected');
                            });
                            
                            const activeThumbnail = document.querySelector(`[data-page-number="${currentPage}"]`);
                            if (activeThumbnail) {
                                activeThumbnail.classList.add('selected');
                            }
                        }
                    }
                    
                    setInterval(checkPageChange, 500);
                }
                
                setupPageChangeMonitoring();
                
                console.log('[PDF.js Extension] Funcionalidad de miniaturas configurada correctamente');
                
            }, 1500);
        });
    }

    // Función para asegurar que los botones de navegación funcionen
    function ensureNavigationButtons() {
        window.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                console.log('[PDF.js Extension] Configurando botones de navegación');
                
                const previousButton = document.getElementById('previous');
                const nextButton = document.getElementById('next');
                const pageNumberInput = document.getElementById('pageNumber');
                
                if (!previousButton || !nextButton) {
                    console.error('[PDF.js Extension] ERROR: Botones de navegación no encontrados');
                    return;
                }
                
                console.log('[PDF.js Extension] Botones de navegación encontrados');
                
                // Función para ir a la página anterior
                function goToPreviousPage() {
                    if (window.PDFViewerApplication && window.PDFViewerApplication.page > 1) {
                        const currentPage = window.PDFViewerApplication.page;
                        const newPage = currentPage - 1;
                        console.log(`[PDF.js Extension] Navegando a página anterior: ${currentPage} → ${newPage}`);
                        window.PDFViewerApplication.page = newPage;
                        
                        // Actualizar el input de número de página si existe
                        if (pageNumberInput) {
                            pageNumberInput.value = newPage;
                        }
                    } else {
                        console.log('[PDF.js Extension] Ya estás en la primera página');
                    }
                }
                
                // Función para ir a la página siguiente
                function goToNextPage() {
                    if (window.PDFViewerApplication && window.PDFViewerApplication.pdfDocument) {
                        const currentPage = window.PDFViewerApplication.page;
                        const totalPages = window.PDFViewerApplication.pdfDocument.numPages;
                        
                        if (currentPage < totalPages) {
                            const newPage = currentPage + 1;
                            console.log(`[PDF.js Extension] Navegando a página siguiente: ${currentPage} → ${newPage}`);
                            window.PDFViewerApplication.page = newPage;
                            
                            // Actualizar el input de número de página si existe
                            if (pageNumberInput) {
                                pageNumberInput.value = newPage;
                            }
                        } else {
                            console.log('[PDF.js Extension] Ya estás en la última página');
                        }
                    }
                }
                
                // Configurar eventos de los botones
                previousButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    goToPreviousPage();
                });
                
                nextButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    goToNextPage();
                });
                
                // Añadir atajos de teclado adicionales
                document.addEventListener('keydown', function(e) {
                    // Solo si no estamos escribiendo en un input
                    if (document.activeElement.tagName !== 'INPUT' && 
                        document.activeElement.tagName !== 'TEXTAREA') {
                        
                        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                            e.preventDefault();
                            goToPreviousPage();
                        } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                            e.preventDefault();
                            goToNextPage();
                        }
                    }
                });
                
                console.log('[PDF.js Extension] Botones de navegación configurados correctamente');
                
            }, 1500);
        });
    }

    // Ejecutar todos los interceptores
    setupErrorSilencing();
    interceptURLParams();
    ensureSearchFunctionality();
    ensureThumbnailFunctionality();
    ensureNavigationButtons();

    console.log('[PDF.js Extension] Sistema de bypass completo activado');

})();