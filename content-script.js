// Content script para interceptar PDFs y redirigir al visor PDF.js

(function() {
    'use strict';

    console.log('[PDF.js Extension] Content script cargado');

    // Verificar si la página actual es un PDF
    function isPDFURL(url) {
        if (!url) return false;
        
        const urlLower = url.toLowerCase();
        
        // Verificar extensión .pdf
        if (urlLower.includes('.pdf')) {
            return true;
        }
        
        // Verificar Content-Type
        const metaContentType = document.querySelector('meta[http-equiv="content-type"]');
        if (metaContentType && metaContentType.content && 
            metaContentType.content.toLowerCase().includes('application/pdf')) {
            return true;
        }
        
        // Verificar si el documento es de tipo PDF
        if (document.contentType === 'application/pdf') {
            return true;
        }
        
        return false;
    }

    // Obtener la URL del PDF de diferentes fuentes
    function getPDFURL() {
        // Prioridad 1: URL directa actual si es PDF
        if (isPDFURL(window.location.href)) {
            console.log('[PDF.js Extension] PDF detectado en URL:', window.location.href);
            return window.location.href;
        }
        
        // Prioridad 2: Buscar embeds de PDF
        const pdfEmbed = document.querySelector('embed[type="application/pdf"]');
        if (pdfEmbed && pdfEmbed.src) {
            console.log('[PDF.js Extension] PDF detectado en embed:', pdfEmbed.src);
            return pdfEmbed.src;
        }
        
        // Prioridad 3: Buscar objects de PDF
        const pdfObject = document.querySelector('object[type="application/pdf"]');
        if (pdfObject && pdfObject.data) {
            console.log('[PDF.js Extension] PDF detectado en object:', pdfObject.data);
            return pdfObject.data;
        }
        
        // Prioridad 4: Buscar iframes que puedan contener PDFs
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
            if (iframe.src && isPDFURL(iframe.src)) {
                console.log('[PDF.js Extension] PDF detectado en iframe:', iframe.src);
                return iframe.src;
            }
        }
        
        return null;
    }

    // Función para redirigir al visor PDF.js
    function redirectToPDFJS(pdfURL) {
        if (!pdfURL) {
            console.warn('[PDF.js Extension] No se proporcionó URL de PDF');
            return;
        }

        console.log('[PDF.js Extension] Redirigiendo a PDF.js con URL:', pdfURL);
        
        // Si es un archivo local, intentar diferentes métodos de carga
        if (pdfURL.startsWith('file://')) {
            console.log('[PDF.js Extension] Archivo local detectado, procesando:', pdfURL);
            
            // Extraer nombre del archivo de la URL
            const fileName = decodeURIComponent(pdfURL).split('/').pop() || 'document.pdf';
            console.log('[PDF.js Extension] Nombre de archivo:', fileName);
            
            // Método 1: Intentar obtener el archivo desde elementos de la página
            const embedElement = document.querySelector('embed[src*=".pdf"]');
            const objectElement = document.querySelector('object[data*=".pdf"]');
            
            if (embedElement || objectElement) {
                console.log('[PDF.js Extension] Encontrado elemento embed/object, intentando extraer datos');
                
                // Intentar obtener el contenido del archivo
                fetch(pdfURL)
                    .then(response => response.blob())
                    .then(blob => {
                        console.log('[PDF.js Extension] ✅ Contenido del archivo obtenido via fetch');
                        const blobURL = URL.createObjectURL(blob);
                        
                        const extensionURL = chrome.runtime.getURL('web/viewer.html');
                        const viewerURL = `${extensionURL}?autoLoad=true&fileName=${encodeURIComponent(fileName)}&blobURL=${encodeURIComponent(blobURL)}`;
                        window.location.replace(viewerURL);
                    })
                    .catch(error => {
                        console.log('[PDF.js Extension] No se pudo obtener via fetch, usando método alternativo');
                        useAlternativeMethod();
                    });
            } else {
                useAlternativeMethod();
            }
            
            function useAlternativeMethod() {
                // Método 2: Intentar acceso directo si el archivo está visible en la página
                if (document.body && document.body.innerHTML.includes('PDF')) {
                    console.log('[PDF.js Extension] Página contiene PDF, intentando método directo');
                    
                    // Intentar leer el contenido de la página como PDF
                    const extensionURL = chrome.runtime.getURL('web/viewer.html');
                    const viewerURL = `${extensionURL}?forceLocal=true&fileName=${encodeURIComponent(fileName)}&originalFile=${encodeURIComponent(pdfURL)}`;
                    window.location.replace(viewerURL);
                } else {
                    // Método 3: Usar el sistema de selección automática
                    console.log('[PDF.js Extension] Usando sistema de selección para archivo local');
                    const extensionURL = chrome.runtime.getURL('web/viewer.html');
                    const viewerURL = `${extensionURL}?autoLocalSelect=true&fileName=${encodeURIComponent(fileName)}&originalFile=${encodeURIComponent(pdfURL)}`;
                    window.location.replace(viewerURL);
                }
            }
            
            return;
        }
        
        // Para URLs web normales
        const extensionURL = chrome.runtime.getURL('web/viewer.html');
        const encodedPDFURL = encodeURIComponent(pdfURL);
        const viewerURL = `${extensionURL}?file=${encodedPDFURL}`;
        
        console.log('[PDF.js Extension] URL del visor:', viewerURL);
        
        // Reemplazar la página actual
        window.location.replace(viewerURL);
    }

    // Interceptar la carga de PDFs
    function interceptPDF() {
        console.log('[PDF.js Extension] Iniciando interceptación de PDFs');
        
        // Verificar si es un PDF directo en la URL
        const pdfURL = getPDFURL();
        if (pdfURL) {
            redirectToPDFJS(pdfURL);
            return;
        }
        
        // Observer para detectar PDFs que se cargan dinámicamente
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Verificar embeds de PDF
                        if (node.tagName === 'EMBED' && 
                            (node.type === 'application/pdf' || isPDFURL(node.src))) {
                            console.log('[PDF.js Extension] PDF encontrado en embed añadido');
                            redirectToPDFJS(node.src);
                        }
                        // Verificar objects de PDF
                        if (node.tagName === 'OBJECT' && 
                            (node.type === 'application/pdf' || isPDFURL(node.data))) {
                            console.log('[PDF.js Extension] PDF encontrado en object añadido');
                            redirectToPDFJS(node.data);
                        }
                        // Buscar dentro del nodo añadido
                        if (node.querySelector) {
                            const pdfEmbed = node.querySelector('embed[type="application/pdf"], embed[src*=".pdf"]');
                            if (pdfEmbed && pdfEmbed.src) {
                                console.log('[PDF.js Extension] PDF encontrado en embed dentro del nodo');
                                redirectToPDFJS(pdfEmbed.src);
                            }
                            const pdfObject = node.querySelector('object[type="application/pdf"], object[data*=".pdf"]');
                            if (pdfObject && pdfObject.data) {
                                console.log('[PDF.js Extension] PDF encontrado en object dentro del nodo');
                                redirectToPDFJS(pdfObject.data);
                            }
                        }
                    }
                });
            });
        });

        // Observar cambios en el DOM
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            // Si body no está listo, observar el documento completo
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        }
    }

    // Función para detectar PDFs por Content-Type usando cabeceras HTTP
    function checkPDFByResponse() {
        // Esta función se ejecuta después de que la respuesta HTTP está disponible
        const url = window.location.href;
        
        // Verificar si la URL termina en .pdf
        if (url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf')) {
            console.log('[PDF.js Extension] URL contiene .pdf:', url);
            redirectToPDFJS(url);
            return true;
        }
        
        // Verificar Content-Type del documento
        if (document.contentType === 'application/pdf') {
            console.log('[PDF.js Extension] Content-Type es application/pdf');
            redirectToPDFJS(url);
            return true;
        }
        
        // Verificar si el título o elementos del DOM indican PDF
        if (document.title && document.title.toLowerCase().includes('.pdf')) {
            console.log('[PDF.js Extension] Título indica PDF:', document.title);
            redirectToPDFJS(url);
            return true;
        }
        
        // Verificar si hay un embed o object de PDF en la página principal
        const pdfElements = document.querySelectorAll('embed[type="application/pdf"], object[type="application/pdf"]');
        if (pdfElements.length > 0) {
            console.log('[PDF.js Extension] Elementos PDF encontrados en la página');
            const element = pdfElements[0];
            const pdfUrl = element.src || element.data;
            if (pdfUrl) {
                redirectToPDFJS(pdfUrl);
                return true;
            }
        }
        
        return false;
    }

    // Función principal de inicialización
    function initializeInterception() {
        console.log('[PDF.js Extension] Inicializando interceptación, readyState:', document.readyState);
        
        // Verificar primero si es un PDF directo
        if (checkPDFByResponse()) {
            return; // Ya redirigido
        }
        
        // Si no es PDF directo, buscar PDFs embebidos
        interceptPDF();
    }

    // Verificar el estado del documento e inicializar apropiadamente
    if (document.readyState === 'loading') {
        console.log('[PDF.js Extension] Documento cargándose, esperando DOMContentLoaded');
        document.addEventListener('DOMContentLoaded', initializeInterception);
    } else {
        console.log('[PDF.js Extension] Documento ya cargado, inicializando inmediatamente');
        initializeInterception();
    }

    // Interceptar drag and drop para capturar archivos reales
    let draggedFiles = [];
    
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
        console.log('[PDF.js Extension] Drop event detectado');
        
        if (e.dataTransfer && e.dataTransfer.files) {
            const files = Array.from(e.dataTransfer.files);
            console.log('[PDF.js Extension] Archivos soltados:', files.length);
            
            const pdfFiles = files.filter(file => 
                file.type === 'application/pdf' || 
                file.name.toLowerCase().endsWith('.pdf')
            );
            
            if (pdfFiles.length > 0) {
                console.log('[PDF.js Extension] PDF detectado en drop:', pdfFiles[0].name);
                e.preventDefault();
                e.stopPropagation();
                
                // Guardar el archivo en una variable global
                window.droppedPDFFile = pdfFiles[0];
                
                // Crear blob URL inmediatamente
                const blobURL = URL.createObjectURL(pdfFiles[0]);
                console.log('[PDF.js Extension] Blob URL creado para archivo arrastrado:', blobURL);
                
                // Redirigir con información del archivo
                const extensionURL = chrome.runtime.getURL('web/viewer.html');
                const viewerURL = `${extensionURL}?autoLoad=true&fileName=${encodeURIComponent(pdfFiles[0].name)}&blobURL=${encodeURIComponent(blobURL)}`;
                window.location.replace(viewerURL);
                return;
            }
        }
    });

    // También interceptar clics en enlaces de PDF
    document.addEventListener('click', (event) => {
        const target = event.target.closest('a');
        if (target && target.href && isPDFURL(target.href)) {
            console.log('[PDF.js Extension] Interceptando clic en enlace PDF:', target.href);
            event.preventDefault();
            event.stopPropagation();
            redirectToPDFJS(target.href);
        }
    });

})();