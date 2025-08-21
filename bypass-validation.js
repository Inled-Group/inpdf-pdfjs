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
            if (message.includes('file origin does not match') ||
                message.includes('getDocument - no') ||
                message.includes('no `url` parameter provided') ||
                (message.includes('file:') && message.includes('origin'))) {
                console.log('[PDF.js Extension] Error silenciado:', message.substring(0, 100));
                return;
            }
            return originalConsoleError.apply(this, args);
        };

        // Interceptar errores globales
        window.addEventListener('error', function(event) {
            if (event.message && 
                (event.message.includes('file origin does not match') ||
                 event.message.includes('no `url` parameter provided'))) {
                console.log('[PDF.js Extension] Error global silenciado');
                event.preventDefault();
            }
        });

        // Interceptar Promise rejections
        window.addEventListener('unhandledrejection', function(event) {
            const message = event.reason?.message || event.reason;
            if (typeof message === 'string' && 
                (message.includes('file origin does not match') ||
                 message.includes('no `url` parameter provided'))) {
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

    // Ejecutar todos los interceptores
    setupErrorSilencing();
    interceptURLParams();

    console.log('[PDF.js Extension] Sistema de bypass completo activado');

})();