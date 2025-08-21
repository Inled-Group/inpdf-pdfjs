// Script de inicialización para la extensión PDF.js
// Este script se ejecuta antes que el viewer.mjs para configurar la extensión

(function() {
    'use strict';

    console.log('[PDF.js Extension] Script de inicialización cargado');

    // Función para obtener parámetros de URL desde el navegador
    function getURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const fileParam = urlParams.get('file');
        const openLocal = urlParams.get('openLocal');
        const originalFile = urlParams.get('originalFile');
        const autoLoad = urlParams.get('autoLoad');
        const fileName = urlParams.get('fileName');
        const blobURL = urlParams.get('blobURL');
        const forceLocal = urlParams.get('forceLocal');
        const autoLocalSelect = urlParams.get('autoLocalSelect');
        
        console.log('[PDF.js Extension] Parámetros detectados:', {
            file: fileParam,
            openLocal: openLocal,
            originalFile: originalFile,
            autoLoad: autoLoad,
            fileName: fileName,
            blobURL: blobURL,
            forceLocal: forceLocal,
            autoLocalSelect: autoLocalSelect
        });
        
        return { fileParam, openLocal, originalFile, autoLoad, fileName, blobURL, forceLocal, autoLocalSelect };
    }

    // Función para validar si una URL es válida
    function isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Función para abrir automáticamente el selector de archivos (sin popup)
    function autoOpenFileSelector(originalFile) {
        console.log('[PDF.js Extension] Abriendo selector de archivos automáticamente para:', originalFile);
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf,.pdf';
        input.style.display = 'none';
        
        input.onchange = function(event) {
            const file = event.target.files[0];
            if (file) {
                console.log('[PDF.js Extension] Archivo seleccionado automáticamente:', file.name, 'tipo:', file.type);
                
                // Procesar el archivo seleccionado
                const blobURL = URL.createObjectURL(file);
                console.log('[PDF.js Extension] Blob URL creado automáticamente:', blobURL);
                
                // Configurar URL para PDF.js
                window.PDFJSExtensionFileURL = blobURL;
                document.title = `${file.name} - PDF.js Viewer`;
                
                // Configurar AppOptions y URL
                setupFileForPDFJS(blobURL);
                
                // Cargar PDF inmediatamente
                loadPDFWithDirectLoader(blobURL);
                
            } else {
                console.log('[PDF.js Extension] No se seleccionó archivo en modo automático, mostrando popup');
                // Si no se selecciona archivo, mostrar popup como fallback
                showLocalFileSelector(originalFile);
            }
            
            // Limpiar input
            if (input.parentNode) {
                input.parentNode.removeChild(input);
            }
        };
        
        // Añadir input al DOM y hacer clic automáticamente
        document.body.appendChild(input);
        input.click();
    }

    // Función para mostrar selector de archivos local
    function showLocalFileSelector(originalFile) {
        console.log('[PDF.js Extension] Mostrando selector de archivos para:', originalFile);
        
        // Crear overlay de fondo
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        `;
        
        // Crear mensaje informativo
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #007bff;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            font-family: Arial, sans-serif;
            box-shadow: 0 8px 16px rgba(0,0,0,0.3);
            z-index: 10000;
            min-width: 400px;
            animation: fadeIn 0.3s ease-in;
        `;
        
        // Añadir animación CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -60%); }
                to { opacity: 1; transform: translate(-50%, -50%); }
            }
        `;
        document.head.appendChild(style);
        
        if (originalFile) {
            const fileName = decodeURIComponent(originalFile).split('/').pop();
            message.innerHTML = `
                <h2 style="color: #007bff; margin-top: 0;">📄 Archivo PDF Detectado</h2>
                <p style="font-size: 16px; margin: 15px 0;">Se detectó: <strong style="color: #333;">${fileName}</strong></p>
                <p style="color: #666; margin: 15px 0;">Por restricciones de seguridad de Chrome, necesitas seleccionar el archivo manualmente.</p>
                <button id="selectFileBtn" style="background: #007bff; color: white; border: none; padding: 15px 30px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; margin: 10px;">
                    🗂️ Seleccionar Archivo PDF
                </button>
                <br>
                <button id="cancelBtn" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px;">
                    Cancelar
                </button>
            `;
        } else {
            message.innerHTML = `
                <h2 style="color: #007bff; margin-top: 0;">📄 Abrir Archivo PDF</h2>
                <p style="font-size: 16px; color: #666; margin: 15px 0;">Selecciona un archivo PDF para visualizar.</p>
                <button id="selectFileBtn" style="background: #007bff; color: white; border: none; padding: 15px 30px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; margin: 10px;">
                    🗂️ Seleccionar Archivo PDF
                </button>
            `;
        }
        
        // Añadir overlay y mensaje al DOM
        document.body.appendChild(overlay);
        document.body.appendChild(message);
        
        // Hacer focus en el botón principal automáticamente
        setTimeout(() => {
            const selectBtn = document.getElementById('selectFileBtn');
            if (selectBtn) {
                selectBtn.focus();
                // Añadir efecto visual de enfoque
                selectBtn.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.25)';
            }
        }, 350);

        // Función para limpiar el popup
        function closePopup() {
            if (overlay.parentNode) document.body.removeChild(overlay);
            if (message.parentNode) document.body.removeChild(message);
        }

        // Cerrar con click en overlay
        overlay.onclick = closePopup;

        // Manejar selección de archivo
        document.getElementById('selectFileBtn').onclick = function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/pdf,.pdf';
            input.style.display = 'none';
            
            input.onchange = function(event) {
                const file = event.target.files[0];
                if (file) {
                    console.log('[PDF.js Extension] Archivo seleccionado:', file.name, 'tipo:', file.type);
                    
                    // Aceptar cualquier archivo que el usuario seleccione como PDF
                    const blobURL = URL.createObjectURL(file);
                    console.log('[PDF.js Extension] Blob URL creado:', blobURL);
                    
                    // Configurar URL para PDF.js
                    window.PDFJSExtensionFileURL = blobURL;
                    document.title = `${file.name} - PDF.js Viewer`;
                    
                    // Remover popup
                    closePopup();
                    
                    // Configurar AppOptions y URL
                    setupFileForPDFJS(blobURL);
                    
                    // Cargar PDF
                    loadPDFWithDirectLoader(blobURL);
                } else {
                    console.log('[PDF.js Extension] No se seleccionó archivo');
                }
                
                // Limpiar input
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
            };
            
            // Añadir input al DOM temporalmente
            document.body.appendChild(input);
            input.click();
        };
        
        // Manejar cancelación
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.onclick = function() {
                closePopup();
                console.log('[PDF.js Extension] Selección de archivo cancelada');
            };
        }

        // Cerrar con tecla Escape
        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                closePopup();
                document.removeEventListener('keydown', handleKeyDown);
                console.log('[PDF.js Extension] Popup cerrado con Escape');
            }
        }
        document.addEventListener('keydown', handleKeyDown);
    }

    // Función para configurar el parámetro defaultUrl en AppOptions
    async function configureDefaultURL() {
        const { fileParam, openLocal, originalFile, autoLoad, fileName, blobURL, forceLocal, autoLocalSelect } = getURLParams();
        
        // Si es modo autoLoad (archivo arrastrado), cargar automáticamente
        if (autoLoad === 'true') {
            console.log('[PDF.js Extension] Modo autoLoad activado');
            
            if (blobURL) {
                console.log('[PDF.js Extension] Cargando automáticamente desde blobURL:', blobURL);
                
                // Configurar inmediatamente
                window.PDFJSExtensionFileURL = decodeURIComponent(blobURL);
                document.title = `${decodeURIComponent(fileName || 'PDF')} - PDF.js Viewer`;
                
                // Configurar AppOptions y URL
                setupFileForPDFJS(window.PDFJSExtensionFileURL);
                
                // Cargar inmediatamente sin esperar interacción
                setTimeout(() => {
                    forceLoadPDF(window.PDFJSExtensionFileURL);
                }, 100);
                
                return true;
            } else {
                console.log('[PDF.js Extension] Modo autoLoad pero sin blobURL, intentando cargar desde archivo original');
                // Fallback para archivos locales sin blob
                if (originalFile) {
                    return handleLocalFileAutoLoad(originalFile, fileName);
                }
            }
        }
        
        // Si es modo forceLocal (archivo local con contenido accesible)
        if (forceLocal === 'true') {
            console.log('[PDF.js Extension] Modo forceLocal activado');
            
            if (originalFile) {
                console.log('[PDF.js Extension] Intentando cargar archivo local forzadamente:', originalFile);
                
                // Intentar cargar directamente desde la URL original
                try {
                    window.PDFJSExtensionFileURL = decodeURIComponent(originalFile);
                    document.title = `${decodeURIComponent(fileName || 'PDF')} - PDF.js Viewer`;
                    
                    setupFileForPDFJS(window.PDFJSExtensionFileURL);
                    
                    setTimeout(() => {
                        forceLoadLocalPDF(window.PDFJSExtensionFileURL);
                    }, 100);
                    
                    return true;
                } catch (error) {
                    console.log('[PDF.js Extension] Error en forceLocal, fallback a autoLocalSelect');
                    return handleAutoLocalSelect(originalFile, fileName);
                }
            }
        }
        
        // Si es modo autoLocalSelect (selección automática para locales)
        if (autoLocalSelect === 'true') {
            console.log('[PDF.js Extension] Modo autoLocalSelect activado');
            // En lugar de intentar file picker automático, forzar carga directa
            return forceDirectLocalLoad(originalFile, fileName);
        }
        
        // Si es modo de archivo local
        if (openLocal === 'true') {
            console.log('[PDF.js Extension] Modo archivo local activado');
            
            // Mostrar siempre el popup para archivos locales
            // Chrome requiere activación de usuario para abrir file picker
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(() => showLocalFileSelector(originalFile), 100);
                });
            } else {
                setTimeout(() => showLocalFileSelector(originalFile), 100);
            }
            
            return true;
        }
        
        // Modo normal con parámetro file
        if (!fileParam) {
            console.warn('[PDF.js Extension] No se proporcionó parámetro file en la URL');
            // Configurar variables para evitar errores
            window.PDFJSExtensionFileURL = null;
            window.PDFJSExtensionOriginalURL = null;
            
            // Configurar AppOptions con URL vacía para evitar error de "no url parameter"
            if (window.AppOptions) {
                window.AppOptions.set('defaultUrl', '');
            }
            
            return false;
        }

        console.log('[PDF.js Extension] Configurando URL de archivo:', fileParam);

        // Decodificar la URL
        let decodedURL;
        try {
            decodedURL = decodeURIComponent(fileParam);
            console.log('[PDF.js Extension] URL decodificada:', decodedURL);
        } catch (e) {
            console.error('[PDF.js Extension] Error decodificando URL:', e);
            decodedURL = fileParam;
        }

        // Verificar si es una URL válida
        if (!isValidURL(decodedURL)) {
            console.error('[PDF.js Extension] URL de archivo inválida:', decodedURL);
            return false;
        }

        // Configurar AppOptions antes de que PDF.js se inicialice
        window.PDFJSExtensionFileURL = decodedURL;
        window.PDFJSExtensionOriginalURL = decodedURL;
        
        // También configuramos el objeto AppOptions si ya existe
        if (window.AppOptions) {
            window.AppOptions.set('defaultUrl', decodedURL);
            console.log('[PDF.js Extension] AppOptions.defaultUrl configurado');
        }

        // Establecer el título de la página con el nombre del archivo
        try {
            const url = new URL(decodedURL);
            const filename = url.pathname.split('/').pop() || 'PDF Document';
            document.title = `${filename} - PDF.js Viewer`;
        } catch (e) {
            document.title = 'PDF.js Viewer';
        }

        return true;
    }

    // Función para interceptar el fetch de archivos y manejar CORS/permisos
    function setupFetchInterception() {
        const originalFetch = window.fetch;
        
        window.fetch = function(resource, init) {
            console.log('[PDF.js Extension] Interceptando fetch para:', resource);
            
            // Para archivos PDF, añadir headers necesarios para CORS
            if (typeof resource === 'string' && resource.toLowerCase().includes('.pdf')) {
                init = init || {};
                init.mode = init.mode || 'cors';
                init.credentials = init.credentials || 'omit';
            }
            
            return originalFetch.apply(this, arguments);
        };
    }

    // Función para aplicar cambios mínimos y añadir chat
    function setupMinimalEnhancements() {
        console.log('[PDF.js Extension] Aplicando mejoras mínimas');
        
        // Cargar el CSS mínimo
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.type = 'text/css';
        css.href = chrome.runtime.getURL('modern-theme.css');
        
        if (document.head) {
            document.head.appendChild(css);
        } else {
            setTimeout(() => {
                if (document.head) document.head.appendChild(css);
            }, 100);
        }
        
        // Cargar librerías necesarias
        loadChatDependencies().then(() => {
            // Añadir chat cuando las dependencias estén listas
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', addDocumentChat);
            } else {
                addDocumentChat();
            }
        });
    }
    
    // Cargar dependencias del chat
    async function loadChatDependencies() {
        try {
            // Cargar WebLLM Loader
            const webllmScript = document.createElement('script');
            webllmScript.src = chrome.runtime.getURL('webllm-loader.js');
            webllmScript.onload = () => console.log('[PDF.js Extension] WebLLM Loader cargado');
            
            // Cargar Markdown Renderer  
            const markdownScript = document.createElement('script');
            markdownScript.src = chrome.runtime.getURL('markdown-renderer.js');
            markdownScript.onload = () => console.log('[PDF.js Extension] Markdown Renderer cargado');
            
            // Añadir scripts al head
            if (document.head) {
                document.head.appendChild(webllmScript);
                document.head.appendChild(markdownScript);
            } else {
                setTimeout(() => {
                    if (document.head) {
                        document.head.appendChild(webllmScript);
                        document.head.appendChild(markdownScript);
                    }
                }, 100);
            }
            
            // Esperar a que se carguen
            await new Promise(resolve => {
                let loaded = 0;
                const checkLoaded = () => {
                    loaded++;
                    if (loaded === 2) resolve();
                };
                webllmScript.onload = checkLoaded;
                markdownScript.onload = checkLoaded;
            });
            
            console.log('[PDF.js Extension] Dependencias del chat cargadas');
            
        } catch (error) {
            console.error('[PDF.js Extension] Error cargando dependencias:', error);
        }
    }

    // Función para añadir funcionalidad específica de extensión
    function setupExtensionFeatures() {
        // Añadir identificador de extensión al documento
        document.documentElement.setAttribute('data-pdf-extension', 'true');
        
        // Aplicar mejoras mínimas y chat
        setupMinimalEnhancements();
    }

    // Función para añadir chat con WebLLM
    function addDocumentChat() {
        console.log('[PDF.js Extension] Añadiendo chat del documento');
        
        // Crear HTML del chat (sin botón, ya está en la barra)
        const chatHTML = `
            <div id="documentChat">
                <div class="chat-header">
                    Inled AI - Análisis de documento
                    <button class="chat-close">×</button>
                </div>
                <div class="chat-messages" id="chatMessages">
                    <div class="chat-message assistant">
                        ¡Hola! Soy tu asistente para este documento PDF. Puedes preguntarme sobre el contenido, hacer resúmenes, o cualquier duda que tengas.
                    </div>
                </div>
                <div class="chat-input-container">
                    <input type="text" id="chatInput" placeholder="Escribe tu pregunta sobre el documento...">
                    <button id="chatSend"><i class="fas fa-paper-plane"></i></button>
                </div>
                <div class="progress-container" id="progressContainer" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <p class="progress-text" id="progressText">Cargando...</p>
                </div>
                <div class="chat-status" id="chatStatus">
                    <span class="loading-spinner"></span>Iniciando asistente...
                </div>
            </div>
        `;
        
        // Añadir al body
        if (document.body) {
            document.body.insertAdjacentHTML('beforeend', chatHTML);
            
            // Agregar botón de selección de texto
            const selectionButton = document.createElement('button');
            selectionButton.id = 'textSelectionButton';
            selectionButton.textContent = 'Preguntar a IA';
            document.body.appendChild(selectionButton);
            
            setupChatFunctionality();
            setupTextSelection();
        } else {
            setTimeout(() => {
                if (document.body) {
                    document.body.insertAdjacentHTML('beforeend', chatHTML);
                    
                    // Agregar botón de selección de texto
                    const selectionButton = document.createElement('button');
                    selectionButton.id = 'textSelectionButton';
                    selectionButton.textContent = 'Preguntar a IA';
                    document.body.appendChild(selectionButton);
                    
                    setupChatFunctionality();
                    setupTextSelection();
                }
            }, 100);
        }
    }

    // Configurar funcionalidad del chat
    function setupChatFunctionality() {
        const chatToggle = document.getElementById('aiChatToggle'); // Botón en la barra de herramientas
        const chatContainer = document.getElementById('documentChat');
        const chatClose = document.querySelector('.chat-close');
        const chatInput = document.getElementById('chatInput');
        const chatSend = document.getElementById('chatSend');
        const chatMessages = document.getElementById('chatMessages');
        const chatStatus = document.getElementById('chatStatus');
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        let isOpen = false;
        let webllm = null;
        let isInitialized = false;
        
        // Toggle del chat
        chatToggle.onclick = () => {
            isOpen = !isOpen;
            chatContainer.style.display = isOpen ? 'flex' : 'none';
            
            // Añadir clase activa al botón de la barra
            if (isOpen) {
                chatToggle.classList.add('active');
            } else {
                chatToggle.classList.remove('active');
            }
            
            if (isOpen && !isInitialized) {
                initializeWebLLM();
            }
        };
        
        // Cerrar chat
        chatClose.onclick = () => {
            isOpen = false;
            chatContainer.style.display = 'none';
            chatToggle.classList.remove('active');
        };
        
        // Enviar mensaje
        async function sendMessage() {
            const message = chatInput.value.trim();
            if (!message || !isInitialized) return;
            
            // Añadir mensaje del usuario
            addMessage(message, 'user');
            chatInput.value = '';
            chatSend.disabled = true;
            
            // Mostrar indicador de escritura
            showTypingIndicator();
            chatStatus.textContent = 'IA analizando...';
            
            try {
                // Indicar extracción de texto
                chatStatus.textContent = 'Extrayendo texto del PDF...';
                
                // Obtener contexto del PDF (ahora asíncrono)
                const pdfContext = await getPDFContext();
                
                // Indicar procesamiento
                chatStatus.textContent = 'Procesando con IA...';
                
                // Enviar a WebLLM
                await processWithWebLLM(message, pdfContext);
            } catch (error) {
                console.error('[PDF.js Extension] Error procesando mensaje:', error);
                hideTypingIndicator(); // Remover indicador de escritura en caso de error
                addMessage('❌ Error procesando tu consulta. Intenta de nuevo.', 'assistant');
                chatStatus.textContent = 'Error - Intenta de nuevo';
                chatSend.disabled = false;
            }
        }
        
        chatSend.onclick = sendMessage;
        chatInput.onkeypress = (e) => {
            if (e.key === 'Enter') sendMessage();
        };
        
        // Añadir mensaje al chat con soporte para Markdown
        // Añadir indicador de escritura
        function showTypingIndicator() {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'typing-indicator';
            typingDiv.id = 'typingIndicator';
            typingDiv.innerHTML = `
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
            
            chatMessages.appendChild(typingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Remover indicador de escritura
        function hideTypingIndicator() {
            const typingIndicator = document.getElementById('typingIndicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }

        function addMessage(text, sender) {
            // Remover indicador de escritura antes de añadir mensaje
            if (sender === 'assistant') {
                hideTypingIndicator();
            }
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${sender}`;
            
            if (sender === 'assistant' && window.MarkdownRenderer) {
                // Renderizar markdown para mensajes del asistente
                window.MarkdownRenderer.renderToElement(messageDiv, text);
            } else {
                // Texto plano para mensajes del usuario
                messageDiv.textContent = text;
            }
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Añadir animación de entrada
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(10px)';
            requestAnimationFrame(() => {
                messageDiv.style.transition = 'all 0.3s ease';
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            });
        }
        
        // Obtener contexto del PDF actual con contenido real
        async function getPDFContext() {
            let context = "Documento PDF";
            
            // Intentar obtener título del documento
            if (document.title && document.title !== 'PDF.js Viewer') {
                context += ` - ${document.title}`;
            }
            
            // Obtener número de páginas si está disponible
            const numPages = document.getElementById('numPages');
            const totalPages = numPages && numPages.textContent ? parseInt(numPages.textContent) : 0;
            if (totalPages) {
                context += ` (${totalPages} páginas)`;
            }
            
            // Obtener página actual
            const pageNumber = document.getElementById('pageNumber');
            if (pageNumber && pageNumber.value) {
                context += `, página actual: ${pageNumber.value}`;
            }
            
            // Estrategia inteligente según el tamaño del documento
            try {
                console.log('[PDF.js Extension] Iniciando extracción inteligente de texto...');
                
                if (totalPages > 10) {
                    // Documento largo: crear resumen inteligente
                    const summary = await createIntelligentSummary(totalPages);
                    context += summary;
                } else {
                    // Documento corto: extraer texto completo
                    const pdfText = await extractPDFText();
                    console.log('[PDF.js Extension] Texto extraído:', pdfText ? `${pdfText.length} caracteres` : 'vacío');
                    
                    if (pdfText && pdfText.length > 0) {
                        // Para documentos cortos, usar límite muy pequeño para evitar overflow
                        const maxLength = 800; // Reducido drasticamente
                        const truncatedText = pdfText.substring(0, maxLength);
                        context += `\n\nContenido: ${truncatedText}`;
                        if (pdfText.length > maxLength) {
                            context += " [...]";
                        }
                    }
                }
            } catch (error) {
                console.log('[PDF.js Extension] Error extrayendo texto:', error);
            }
            
            return context;
        }

        // Crear resumen inteligente para documentos largos
        async function createIntelligentSummary(totalPages) {
            chatStatus.textContent = 'Analizando documento extenso...';
            
            // Seleccionar solo páginas clave estratégicamente
            const keyPages = [1, totalPages]; // Solo primera y última página
            if (totalPages > 5) {
                keyPages.push(Math.floor(totalPages / 2)); // Página central
            }
            
            // Extraer solo información muy condensada
            if (window.PDFViewerApplication && window.PDFViewerApplication.pdfDocument) {
                const pdf = window.PDFViewerApplication.pdfDocument;
                let summary = `\nDocumento: ${totalPages} páginas. `;
                
                for (const pageNum of keyPages) {
                    try {
                        const page = await pdf.getPage(pageNum);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        
                        if (pageText.trim()) {
                            // Solo la primera línea significativa
                            const firstSentence = pageText.split(/[.\n!?]+/).find(sentence => 
                                sentence.trim().length > 15 && sentence.trim().length < 100
                            );
                            
                            if (firstSentence) {
                                summary += `P${pageNum}: ${firstSentence.trim()}. `;
                            }
                        }
                        
                        chatStatus.textContent = `Analizando página ${pageNum}...`;
                    } catch (pageError) {
                        console.log(`[PDF.js Extension] Error analizando página ${pageNum}:`, pageError);
                    }
                }
                
                summary += `(Usa "página X" para detalles específicos)`;
                
                // Guardar referencia para consultas específicas
                window.pdfFullDocument = { pdf, totalPages };
                
                return summary;
            }
            
            return `\nDocumento extenso: ${totalPages} páginas. (Usa "página X" para análisis específico)`;
        }
        
        // Función para extraer texto del PDF actual
        async function extractPDFText() {
            try {
                // Método 1: Usar PDFViewerApplication si está disponible
                if (window.PDFViewerApplication && window.PDFViewerApplication.pdfDocument) {
                    console.log('[PDF.js Extension] Extrayendo texto del PDF...');
                    const pdf = window.PDFViewerApplication.pdfDocument;
                    const currentPage = parseInt(document.getElementById('pageNumber')?.value || '1');
                    
                    // Extraer texto de la página actual y algunas adyacentes
                    const pagesToExtract = Math.min(3, pdf.numPages);
                    const startPage = Math.max(1, currentPage - 1);
                    const endPage = Math.min(pdf.numPages, startPage + pagesToExtract - 1);
                    
                    let allText = '';
                    
                    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                        try {
                            const page = await pdf.getPage(pageNum);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map(item => item.str).join(' ');
                            
                            if (pageText.trim()) {
                                allText += `\n--- Página ${pageNum} ---\n${pageText}\n`;
                            }
                        } catch (pageError) {
                            console.log(`[PDF.js Extension] Error extrayendo página ${pageNum}:`, pageError);
                        }
                    }
                    
                    return allText.trim();
                }
                
                // Método 2: Buscar en el DOM elementos de texto renderizado
                const textLayers = document.querySelectorAll('.textLayer');
                if (textLayers.length > 0) {
                    console.log('[PDF.js Extension] Extrayendo texto del DOM...');
                    let domText = '';
                    
                    textLayers.forEach((layer, index) => {
                        const pageText = Array.from(layer.querySelectorAll('span'))
                            .map(span => span.textContent)
                            .filter(text => text && text.trim())
                            .join(' ');
                        
                        if (pageText.trim()) {
                            domText += `\n--- Página visible ${index + 1} ---\n${pageText}\n`;
                        }
                    });
                    
                    return domText.trim();
                }
                
                return '';
                
            } catch (error) {
                console.error('[PDF.js Extension] Error extrayendo texto del PDF:', error);
                return '';
            }
        }
        
        // Inicializar WebLLM real
        async function initializeWebLLM() {
            console.log('[PDF.js Extension] Iniciando WebLLM real');
            
            try {
                // Mostrar barra de progreso
                progressContainer.style.display = 'block';
                chatStatus.style.display = 'none';
                progressText.textContent = 'Iniciando carga de WebLLM...';
                progressFill.style.width = '0%';
                
                // Verificar que WebLLMLoader esté disponible
                if (typeof window.WebLLMLoader === 'undefined') {
                    throw new Error('WebLLMLoader no disponible');
                }
                
                // Cargar WebLLM con callback de progreso
                webllm = await window.WebLLMLoader.load((progress) => {
                    console.log('[PDF.js Extension] Progress:', progress);
                    
                    // Actualizar texto de progreso
                    if (progress.text) {
                        progressText.textContent = progress.text;
                    }
                    
                    // Calcular porcentaje de progreso
                    let percentage = 0;
                    if (progress.progress !== undefined) {
                        percentage = Math.round(progress.progress * 100);
                    } else if (progress.text) {
                        // Estimar progreso basado en el texto
                        if (progress.text.includes('Iniciando')) percentage = 10;
                        else if (progress.text.includes('Cargando módulo')) percentage = 25;
                        else if (progress.text.includes('Inicializando')) percentage = 50;
                        else if (progress.text.includes('Descargando')) percentage = 75;
                        else if (progress.text.includes('Finalizing')) percentage = 90;
                        else if (progress.text.includes('Ready')) percentage = 100;
                    }
                    
                    // Actualizar barra de progreso
                    progressFill.style.width = `${percentage}%`;
                    
                    // Actualizar texto con porcentaje
                    progressText.textContent = `${progress.text || 'Cargando...'} (${percentage}%)`;
                });
                
                // Completar progreso
                progressFill.style.width = '100%';
                progressText.textContent = 'WebLLM cargado exitosamente (100%)';
                
                // Ocultar progreso después de un momento
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    chatStatus.style.display = 'block';
                    chatStatus.textContent = 'IA lista - Modelo cargado';
                }, 1500);
                
                isInitialized = true;
                chatSend.disabled = false;
                
                addMessage('¡Hola! 👋 Soy **Inled AI** y estoy aquí para ayudarte con el documento que estás viendo.\n\n### 🚀 **Capacidades:**\n\n• **Analizar profundamente** el contenido del PDF 📄\n• **Chat libre** sobre cualquier tema del documento 💬\n• **Selección de texto** - Selecciona texto y pregúntame 🎯\n\n### **Cómo interactuar:**\n\n• **Chat libre:** Pregunta cualquier cosa sobre el documento\n• **Selecciona texto:** Aparecerá un botón "Inled AI"\n• **Comandos útiles:** "resumen", "explica esto", etc.\n\n### **Estoy listo para analizar:**\n\nEste documento y responder **cualquier pregunta** que tengas. ¡Prueba seleccionando texto o escribiendo directamente! ✨\n\n¿Qué te gustaría saber? 🤔', 'assistant');
                
                console.log('[PDF.js Extension] Inled AI inicializado correctamente');
                
            } catch (error) {
                console.error('[PDF.js Extension] WebLLM falló:', error);
                
                // Ocultar progreso en caso de error
                progressContainer.style.display = 'none';
                chatStatus.style.display = 'block';
                
                // Mostrar error honesto, no simulador
                showWebLLMError(error);
            }
        }
        
        // Mostrar error cuando WebLLM falla
        function showWebLLMError(error) {
            isInitialized = false;
            chatStatus.textContent = '❌ WebLLM no disponible';
            chatSend.disabled = true;
            
            const errorMessage = `## ❌ WebLLM No Disponible

### **Estado:** IA Local Fallida

**Error:** ${error.message || 'Error desconocido cargando WebLLM'}

### **Posibles causas:**
• **Memoria insuficiente** - WebLLM requiere ~2GB RAM
• **Navegador no compatible** - Requiere Chrome/Edge moderno con compatibilidad WebGPU
• **Conexión lenta** - Descarga del modelo interrumpida
• **Recursos del sistema** - CPU/GPU ocupados

### **Soluciones:**
• **Cierra otras pestañas** para liberar memoria
• **Recarga la página** e intenta de nuevo
• **Espera unos minutos** y reintenta
• **Verifica conexión** a internet

**WebLLM requiere recursos significativos para funcionar correctamente.**`;

            addMessage(errorMessage, 'assistant');
        }
        
        // Procesar mensaje solo con WebLLM real
        async function processWithWebLLM(userMessage, pdfContext) {
            try {
                chatStatus.textContent = 'IA escribiendo respuesta...';
                
                if (webllm && isInitialized) {
                    // Solo WebLLM real
                    console.log('[PDF.js Extension] Usando WebLLM real con contenido del documento');
                    
                    // Crear prompt inteligente basado en el contenido real del PDF
                    const aiPrompt = await createIntelligentPrompt(userMessage, pdfContext);
                    
                    const response = await webllm.chat.completions.create({
                        messages: [
                            {
                                role: "system", 
                                content: `Eres un asistente de IA experto en análisis de documentos PDF. 

INSTRUCCIONES IMPORTANTES:
- SIEMPRE responde en ESPAÑOL
- Analiza el contenido real del documento proporcionado
- Responde en formato Markdown estructurado y claro
- Si hay contenido específico del PDF, refiérete a él directamente con citas
- Sé preciso, directo y útil en tus respuestas
- Usa emojis para mejorar la legibilidad
- Mantén un tono profesional pero accesible
- Si te preguntan sobre el contenido, cita partes específicas del texto`
                            },
                            {
                                role: "user", 
                                content: aiPrompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 768
                    });
                    
                    const aiResponse = response.choices[0].message.content;
                    addMessage(aiResponse, 'assistant');
                    
                    chatStatus.textContent = 'WebLLM listo';
                    
                } else {
                    // No hay WebLLM disponible
                    hideTypingIndicator(); // Remover indicador si no hay WebLLM
                    const errorMessage = `## ❌ WebLLM No Disponible

**Error:** La IA no está inicializada correctamente.

### 💡 **Soluciones:**
• **Recarga la página** para reiniciar WebLLM
• **Verifica que tienes suficiente memoria** (~2GB)
• **Espera a que termine la inicialización** si está en progreso

**No se proporcionan respuestas simuladas.**`;

                    addMessage(errorMessage, 'assistant');
                    chatStatus.textContent = '❌ IA no disponible';
                }
                
            } catch (error) {
                console.error('[PDF.js Extension] Error procesando mensaje:', error);
                
                // Error específico de WebLLM
                const errorMessage = `## ⚠️ Error de WebLLM

**Error:** ${error.message || 'Error desconocido'}

### 🔄 **Soluciones:**
• **Recarga la página** para reiniciar la IA
• **Libera memoria** cerrando otras pestañas
• **Verifica conexión** e intenta de nuevo

**La IA requiere recursos significativos para funcionar.**`;

                addMessage(errorMessage, 'assistant');
                chatStatus.textContent = 'Error en IA';
                
            } finally {
                hideTypingIndicator(); // Asegurar que se remueva el indicador
                chatSend.disabled = false;
            }
        }
        
        // Crear prompt inteligente basado en el contenido del documento
        async function createIntelligentPrompt(userMessage, pdfContext) {
            // Detectar si el usuario solicita una página específica
            const pageMatch = userMessage.match(/página\s+(\d+)|page\s+(\d+)/i);
            if (pageMatch && window.pdfFullDocument) {
                const requestedPage = parseInt(pageMatch[1] || pageMatch[2]);
                const specificPageContent = await getSpecificPageContent(requestedPage);
                if (specificPageContent) {
                    return `📄 **ANÁLISIS DE PÁGINA ESPECÍFICA**\n\n**Página solicitada:** ${requestedPage}\n\n**Contenido de la página:**\n${specificPageContent}\n\n**Consulta del usuario:** ${userMessage}\n\n**INSTRUCCIONES:**\n- Analiza específicamente el contenido de la página ${requestedPage}\n- Responde basándote únicamente en la información de esta página\n- Usa formato Markdown con estructura clara\n- Incluye emojis relevantes para mejor legibilidad\n\n**RESPUESTA:**`;
                }
            }
            
            const hasContent = pdfContext.includes('Contenido del documento:') || pdfContext.includes('DOCUMENTO EXTENSO');
            
            let prompt = `📄 **DOCUMENTO PDF ANÁLISIS**\n\n`;
            
            if (hasContent) {
                prompt += `**Contexto del documento:**\n${pdfContext}\n\n`;
                prompt += `**Consulta específica del usuario:** ${userMessage}\n\n`;
                prompt += `**INSTRUCCIONES:**
- Analiza el contenido del documento proporcionado
- Responde específicamente basándote en la información disponible
- Si la pregunta es sobre contenido específico, cita partes relevantes
- Si es sobre resumen, usa la información mostrada
- Para documentos extensos, si necesitas más detalle de una página específica, sugiere al usuario que mencione "página X"
- Usa formato Markdown con estructura clara
- Incluye emojis relevantes para mejor legibilidad\n\n`;
            } else {
                prompt += `**Información básica del documento:**\n${pdfContext}\n\n`;
                prompt += `**Consulta del usuario:** ${userMessage}\n\n`;
                prompt += `**INSTRUCCIONES:**
- Proporciona ayuda general sobre navegación y funciones del visor
- Si se solicita análisis de contenido específico, explica cómo acceder a esa información
- Usa formato Markdown estructurado
- Mantén respuestas útiles y prácticas\n\n`;
            }
            
            prompt += `**RESPUESTA:**`;
            
            return prompt;
        }

        // Obtener contenido de una página específica
        async function getSpecificPageContent(pageNumber) {
            if (!window.pdfFullDocument) {
                return null;
            }
            
            const { pdf, totalPages } = window.pdfFullDocument;
            
            if (pageNumber < 1 || pageNumber > totalPages) {
                return `Error: La página ${pageNumber} no existe. El documento tiene ${totalPages} páginas.`;
            }
            
            try {
                chatStatus.textContent = `Extrayendo página ${pageNumber}...`;
                
                const page = await pdf.getPage(pageNumber);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                
                if (pageText.trim()) {
                    return `--- PÁGINA ${pageNumber} (COMPLETA) ---\n${pageText}`;
                } else {
                    return `La página ${pageNumber} no contiene texto extraíble (posiblemente sea una imagen).`;
                }
            } catch (error) {
                console.error(`[PDF.js Extension] Error extrayendo página ${pageNumber}:`, error);
                return `Error extrayendo el contenido de la página ${pageNumber}.`;
            }
        }
        
        // Generar respuesta inteligente con análisis de contenido cuando está disponible
        async function generateContentAwareResponse(userMessage, pdfContext) {
            const message = userMessage.toLowerCase();
            const hasContent = pdfContext.includes('Contenido del documento:');
            
            // Si tenemos contenido real del PDF, intentar analizarlo
            if (hasContent) {
                const content = pdfContext.split('Contenido del documento:')[1];
                
                if (message.includes('resumen') || message.includes('resúmene') || message.includes('resume')) {
                    return await generateContentSummary(content, pdfContext);
                }
                
                if (message.includes('buscar') || message.includes('encuentra') || message.includes('dónde')) {
                    return await generateSearchGuidance(message, content, pdfContext);
                }
                
                if (message.includes('explicar') || message.includes('explica') || message.includes('qué es')) {
                    return await generateContentExplanation(message, content, pdfContext);
                }
                
                // Respuesta general con análisis de contenido
                return await generateGeneralContentResponse(message, content, pdfContext);
            }
            
            // Fallback al método original si no hay contenido
            return generateIntelligentResponse(userMessage, pdfContext);
        }
        
        // Generar resumen basado en el contenido real del PDF
        async function generateContentSummary(content, pdfContext) {
            const lines = content.split('\n').filter(line => line.trim());
            const pages = content.split('--- Página').filter(section => section.trim());
            
            let summary = `## 📄 Resumen del Documento\n\n`;
            
            // Información básica
            const basicInfo = pdfContext.split('Contenido del documento:')[0];
            summary += `**Información básica:** ${basicInfo}\n\n`;
            
            // Análisis de contenido
            summary += `### 📊 Análisis del Contenido:\n\n`;
            
            if (pages.length > 1) {
                summary += `• **Páginas analizadas:** ${pages.length}\n`;
            }
            
            // Extraer palabras clave más comunes
            const allText = content.toLowerCase();
            const words = allText.split(/\s+/).filter(word => word.length > 4);
            const wordFreq = {};
            words.forEach(word => {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            });
            
            const topWords = Object.entries(wordFreq)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([word]) => word);
            
            if (topWords.length > 0) {
                summary += `• **Palabras clave frecuentes:** ${topWords.join(', ')}\n`;
            }
            
            // Estructura del documento
            summary += `\n### 📋 Estructura Detectada:\n\n`;
            
            pages.forEach((page, index) => {
                if (page.trim()) {
                    const pageLines = page.split('\n').filter(line => line.trim());
                    const pageContent = pageLines.slice(0, 2).join(' ').substring(0, 100);
                    summary += `• **Página ${index + 1}:** ${pageContent}...\n`;
                }
            });
            
            summary += `\n### 🔍 Para más detalles:\n\n`;
            summary += `• Pregunta sobre **temas específicos** encontrados\n`;
            summary += `• Usa **Ctrl+F** para buscar términos en el documento\n`;
            summary += `• Navega con **← →** para explorar todas las páginas\n`;
            
            return summary;
        }
        
        // Generar guía de búsqueda basada en contenido
        async function generateSearchGuidance(userQuery, content, pdfContext) {
            const searchTerms = userQuery.split(' ').filter(word => 
                word.length > 3 && 
                !['buscar', 'encuentra', 'dónde', 'está', 'como'].includes(word.toLowerCase())
            );
            
            let guidance = `## 🔍 Guía de Búsqueda\n\n`;
            
            if (searchTerms.length > 0) {
                guidance += `**Términos buscados:** ${searchTerms.join(', ')}\n\n`;
                
                // Buscar en el contenido
                const foundTerms = [];
                const contentLower = content.toLowerCase();
                
                searchTerms.forEach(term => {
                    const termLower = term.toLowerCase();
                    if (contentLower.includes(termLower)) {
                        foundTerms.push(term);
                        
                        // Encontrar contexto
                        const index = contentLower.indexOf(termLower);
                        const start = Math.max(0, index - 50);
                        const end = Math.min(content.length, index + 50);
                        const context = content.substring(start, end);
                        
                        guidance += `### ✅ Encontrado: "${term}"\n`;
                        guidance += `**Contexto:** ...${context}...\n\n`;
                    }
                });
                
                if (foundTerms.length === 0) {
                    guidance += `### ❌ No encontrado en el contenido visible\n\n`;
                    guidance += `**Sugerencias:**\n`;
                    guidance += `• Usa **Ctrl+F** para buscar en todo el documento\n`;
                    guidance += `• Prueba con **sinónimos** o términos relacionados\n`;
                    guidance += `• Navega a **otras páginas** del documento\n\n`;
                }
            }
            
            guidance += `### 🔧 Herramientas de Búsqueda:\n\n`;
            guidance += `• **Ctrl+F**: Búsqueda rápida en la página actual\n`;
            guidance += `• **F3**: Buscar siguiente resultado\n`;
            guidance += `• **Shift+F3**: Buscar resultado anterior\n`;
            guidance += `• **Escape**: Cerrar búsqueda\n`;
            
            return guidance;
        }
        
        // Generar explicación basada en contenido específico
        async function generateContentExplanation(userQuery, content, pdfContext) {
            let explanation = `## 🧠 Análisis del Contenido\n\n`;
            
            // Extraer el tema que se quiere explicar
            const queryWords = userQuery.toLowerCase().split(' ');
            const topicIndex = Math.max(
                queryWords.indexOf('explicar'),
                queryWords.indexOf('explica'),
                queryWords.indexOf('qué'),
                queryWords.indexOf('que')
            );
            
            let topic = '';
            if (topicIndex >= 0 && topicIndex < queryWords.length - 1) {
                topic = queryWords.slice(topicIndex + 1).join(' ');
            }
            
            explanation += `**Tema consultado:** "${topic || userQuery}"\n\n`;
            
            // Buscar información relevante en el contenido
            const contentLower = content.toLowerCase();
            const topicLower = topic.toLowerCase();
            
            if (topic && contentLower.includes(topicLower)) {
                explanation += `### 📖 Información encontrada:\n\n`;
                
                // Extraer párrafos que contienen el tema
                const sentences = content.split(/[.!?]+/).filter(s => 
                    s.toLowerCase().includes(topicLower) && s.trim().length > 20
                );
                
                sentences.slice(0, 3).forEach((sentence, index) => {
                    explanation += `${index + 1}. ${sentence.trim()}.\n\n`;
                });
                
            } else {
                explanation += `### 💡 Análisis general del documento:\n\n`;
                
                // Proporcionar análisis general si no se encuentra el tema específico
                const paragraphs = content.split('\n').filter(p => p.trim().length > 50);
                
                if (paragraphs.length > 0) {
                    explanation += `**Contenido principal:**\n`;
                    explanation += `${paragraphs[0].substring(0, 200)}...\n\n`;
                }
                
                explanation += `**Para información específica sobre "${topic}":**\n`;
                explanation += `• Usa **Ctrl+F** para buscar el término exacto\n`;
                explanation += `• Navega por las páginas para encontrar secciones relevantes\n`;
                explanation += `• Reformula tu pregunta con términos más específicos\n\n`;
            }
            
            explanation += `### 🔍 Exploración adicional:\n\n`;
            explanation += `• **Páginas:** Navega con ← → para ver todo el contenido\n`;
            explanation += `• **Búsqueda:** Usa Ctrl+F para términos específicos\n`;
            explanation += `• **Zoom:** Ajusta con + - para mejor lectura\n`;
            
            return explanation;
        }
        
        // Generar respuesta general con análisis de contenido
        async function generateGeneralContentResponse(userQuery, content, pdfContext) {
            let response = `## 💭 Análisis de tu Consulta\n\n`;
            
            response += `**Tu pregunta:** "${userQuery}"\n\n`;
            
            // Análisis básico del contenido disponible
            const wordCount = content.split(/\s+/).length;
            const pages = content.split('--- Página').length - 1;
            
            response += `### 📊 Documento actual:\n\n`;
            response += `• **Páginas analizadas:** ${pages}\n`;
            response += `• **Palabras extraídas:** ~${wordCount}\n\n`;
            
            // Búsqueda de términos relacionados en la consulta
            const queryWords = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const foundWords = queryWords.filter(word => 
                content.toLowerCase().includes(word)
            );
            
            if (foundWords.length > 0) {
                response += `### ✅ Términos relacionados encontrados:\n\n`;
                foundWords.forEach(word => {
                    response += `• **${word}** aparece en el documento\n`;
                });
                response += `\n`;
            }
            
            response += `### 💡 Puedo ayudarte con:\n\n`;
            response += `• **"resumen"** - Análisis completo del contenido\n`;
            response += `• **"buscar [término]"** - Encontrar información específica\n`;
            response += `• **"explicar [tema]"** - Análisis detallado de temas\n`;
            response += `• **"ayuda"** - Funciones del visor PDF\n\n`;
            
            response += `### 🔧 Funciones útiles:\n\n`;
            response += `• **Ctrl+F:** Buscar en el documento\n`;
            response += `• **← →:** Navegar páginas\n`;
            response += `• **+ -:** Ajustar zoom\n`;
            
            return response;
        }
        
        // Generar respuesta inteligente con formato Markdown
        function generateIntelligentResponse(userMessage, pdfContext) {
            const message = userMessage.toLowerCase();
            
            if (message.includes('resumen') || message.includes('resúmene') || message.includes('resume')) {
                return `📄 **Resumen del documento**: ${pdfContext}
                
Para explorar el contenido:
• Navega por las páginas con ← →
• Usa Ctrl+F para buscar términos específicos
• Ajusta el zoom para mejor lectura

¿Hay alguna sección específica que te interese?`;
            }
            
            if (message.includes('página') || message.includes('pagina')) {
                const pageMatch = message.match(/página?\s*(\d+)/);
                if (pageMatch) {
                    return `📍 **Página ${pageMatch[1]}**: Puedes ir directamente escribiendo ${pageMatch[1]} en el campo de número de página (al lado de los botones ← →) y presionando Enter.

También puedes usar:
• Botones ← → para navegar paso a paso
• Ctrl+G para ir a una página específica`;
                }
                return `📍 **Navegación de páginas**:
• Botones ← → para página anterior/siguiente
• Campo numérico para ir a página específica
• Ctrl+G para "Go to page"
• Page Up/Page Down en el teclado`;
            }
            
            if (message.includes('buscar') || message.includes('search') || message.includes('encontrar')) {
                return `🔍 **Búsqueda en el documento**:
• **Ctrl+F**: Abrir búsqueda rápida
• **F3**: Buscar siguiente
• **Shift+F3**: Buscar anterior
• **Escape**: Cerrar búsqueda

La búsqueda resalta todas las coincidencias en el documento.`;
            }
            
            if (message.includes('zoom') || message.includes('grande') || message.includes('pequeño')) {
                return `🔍 **Control de zoom**:
• **Botones + -**: Aumentar/reducir zoom
• **Ctrl + rueda ratón**: Zoom con scroll
• **Ctrl + 0**: Ajustar a la página
• **Menú desplegable**: Porcentajes preestablecidos

También puedes usar Ctrl + = y Ctrl + - desde el teclado.`;
            }
            
            if (message.includes('imprimir') || message.includes('print')) {
                return `🖨️ **Imprimir documento**:
• **Ctrl+P**: Abrir diálogo de impresión
• Selecciona rango de páginas si es necesario
• Ajusta configuración de papel y calidad

El visor mantendrá la calidad original del PDF.`;
            }
            
            if (message.includes('descargar') || message.includes('download') || message.includes('guardar')) {
                return `💾 **Descargar/Guardar**:
• **Ctrl+S**: Guardar una copia
• Botón de descarga en la barra superior
• Click derecho → "Guardar como"

El archivo se guardará en tu carpeta de Descargas.`;
            }
            
            if (message.includes('ayuda') || message.includes('help') || message.includes('comandos')) {
                return `🔧 **Atajos y funciones principales**:

**Navegación:**
• ← → : Páginas anterior/siguiente
• Ctrl+G: Ir a página
• Home/End: Primera/última página

**Visualización:**
• Ctrl + = / -: Zoom in/out
• Ctrl + 0: Ajustar a página
• F11: Pantalla completa

**Búsqueda:**
• Ctrl+F: Buscar texto
• F3: Siguiente resultado

**Archivo:**
• Ctrl+P: Imprimir
• Ctrl+S: Guardar copia`;
            }
            
            if (message.includes('atajos') || message.includes('shortcuts') || message.includes('teclado')) {
                return `⌨️ **Atajos de teclado**:
• **Ctrl+F**: Buscar
• **Ctrl+P**: Imprimir  
• **Ctrl+S**: Guardar
• **Ctrl+G**: Ir a página
• **Ctrl + = / -**: Zoom
• **Ctrl + 0**: Ajustar zoom
• **F3**: Buscar siguiente
• **F11**: Pantalla completa
• **Home/End**: Primera/última página
• **Espacio/Shift+Espacio**: Scroll página`;
            }
            
            if (message.includes('gracias') || message.includes('thanks')) {
                return `😊 ¡De nada! Estoy aquí para ayudarte con el visor PDF. 

¿Necesitas ayuda con alguna función específica?`;
            }
            
            if (message.includes('hola') || message.includes('hello') || message.includes('hi')) {
                return `👋 ¡Hola! Soy tu asistente para el visor PDF.

Puedo ayudarte con:
• Navegación por el documento
• Funciones de búsqueda y zoom
• Atajos de teclado
• Impresión y descarga

¿En qué te puedo ayudar?`;
            }
            
            // Respuesta genérica más útil
            return `🤔 Preguntaste sobre "${userMessage}". 

Puedo ayudarte con:
• **"ayuda"** - Ver todos los comandos
• **"buscar"** - Cómo buscar en el documento
• **"página X"** - Ir a una página específica
• **"zoom"** - Controles de zoom
• **"atajos"** - Atajos de teclado

¿Qué necesitas saber?`;
        }
    }
    
    // Configurar funcionalidad de selección de texto
    function setupTextSelection() {
        console.log('[PDF.js Extension] Configurando selección de texto...');
        
        const selectionButton = document.getElementById('textSelectionButton');
        let currentSelectedText = '';
        let selectionTimeout = null;
        
        // Manejar selección de texto en el documento
        document.addEventListener('mouseup', handleTextSelection);
        document.addEventListener('keyup', handleTextSelection);
        
        // Ocultar botón cuando se hace clic fuera
        document.addEventListener('click', (e) => {
            if (e.target !== selectionButton && !e.target.closest('#documentChat')) {
                hideSelectionButton();
            }
        });
        
        function handleTextSelection() {
            // Limpiar timeout anterior
            if (selectionTimeout) {
                clearTimeout(selectionTimeout);
            }
            
            // Pequeño delay para asegurar que la selección esté completa
            selectionTimeout = setTimeout(() => {
                const selection = window.getSelection();
                const selectedText = selection.toString().trim();
                
                if (selectedText && selectedText.length > 3) {
                    currentSelectedText = selectedText;
                    showSelectionButton(selection);
                } else {
                    hideSelectionButton();
                }
            }, 100);
        }
        
        function showSelectionButton(selection) {
            if (selection.rangeCount === 0) return;
            
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Posicionar el botón cerca de la selección
            const buttonX = Math.min(rect.left + (rect.width / 2) - 75, window.innerWidth - 160);
            const buttonY = rect.top - 45;
            
            selectionButton.style.left = Math.max(10, buttonX) + 'px';
            selectionButton.style.top = Math.max(10, buttonY) + 'px';
            selectionButton.style.display = 'block';
            selectionButton.classList.add('show');
            
            console.log('[PDF.js Extension] Botón de selección mostrado para:', currentSelectedText.substring(0, 50));
        }
        
        function hideSelectionButton() {
            selectionButton.style.display = 'none';
            selectionButton.classList.remove('show');
            currentSelectedText = '';
        }
        
        // Manejar click en el botón de selección
        selectionButton.addEventListener('click', () => {
            if (currentSelectedText) {
                console.log('[PDF.js Extension] Enviando texto seleccionado a IA:', currentSelectedText);
                
                // Abrir chat si no está abierto
                const chatContainer = document.getElementById('documentChat');
                const chatToggle = document.getElementById('aiChatToggle');
                
                if (chatContainer.style.display !== 'flex') {
                    chatContainer.style.display = 'flex';
                    chatToggle.classList.add('active');
                }
                
                // Enviar texto seleccionado con contexto
                const prompt = `Analiza este texto del documento: "${currentSelectedText}"`;
                const chatInput = document.getElementById('chatInput');
                
                if (chatInput) {
                    chatInput.value = prompt;
                    
                    // Trigger send message
                    const event = new KeyboardEvent('keypress', { key: 'Enter' });
                    chatInput.dispatchEvent(event);
                }
                
                // Ocultar botón
                hideSelectionButton();
                
                // Limpiar selección
                window.getSelection().removeAllRanges();
            }
        });
        
        console.log('[PDF.js Extension] Selección de texto configurada correctamente');
    }

    // Función para manejar errores específicos de la extensión
    function setupErrorHandling() {
        window.addEventListener('error', function(event) {
            if (event.error && event.error.message && 
                (event.error.message.includes('Failed to fetch') || 
                 event.error.message.includes('CORS'))) {
                console.warn('[PDF.js Extension] Error de red detectado. Esto puede deberse a restricciones CORS.');
            }
        });
        
        // Interceptar errores de PDF.js específicos
        window.addEventListener('unhandledrejection', function(event) {
            if (event.reason && event.reason.message && 
                event.reason.message.includes('PDF')) {
                console.warn('[PDF.js Extension] Error de PDF detectado:', event.reason.message);
            }
        });
    }

    // Función para añadir botón de apertura de archivo si no hay parámetros
    function addOpenFileButton() {
        // Solo añadir si no hay parámetros de archivo
        const { fileParam, openLocal } = getURLParams();
        
        if (!fileParam && !openLocal) {
            console.log('[PDF.js Extension] No hay parámetros de archivo, añadiendo botón de apertura');
            
            // Esperar a que el DOM esté listo
            function addButton() {
                const toolbar = document.getElementById('toolbarViewerLeft');
                if (toolbar) {
                    const openBtn = document.createElement('button');
                    openBtn.innerHTML = '📁 Abrir PDF';
                    openBtn.style.cssText = `
                        background: #0060df;
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        margin-right: 10px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    `;
                    
                    openBtn.onclick = function() {
                        showLocalFileSelector();
                    };
                    
                    toolbar.insertBefore(openBtn, toolbar.firstChild);
                    console.log('[PDF.js Extension] Botón de apertura añadido');
                } else {
                    setTimeout(addButton, 100);
                }
            }
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', addButton);
            } else {
                addButton();
            }
        }
    }

    // Interceptar la creación de AppOptions para configurar defaultUrl
    function interceptAppOptions() {
        // Guardar una referencia al objeto AppOptions original
        let originalAppOptions = null;
        
        // Crear un proxy para interceptar el acceso a AppOptions
        Object.defineProperty(window, 'AppOptions', {
            get: function() {
                return originalAppOptions;
            },
            set: function(value) {
                originalAppOptions = value;
                console.log('[PDF.js Extension] AppOptions detectado, configurando defaultUrl');
                
                // Configurar defaultUrl si tenemos una URL de archivo
                const fileURL = window.PDFJSExtensionFileURL;
                if (fileURL && originalAppOptions && originalAppOptions.set) {
                    originalAppOptions.set('defaultUrl', fileURL);
                    console.log('[PDF.js Extension] defaultUrl configurado en AppOptions:', fileURL);
                }
            },
            configurable: true
        });
    }

    // Inicializar la extensión
    async function initializeExtension() {
        console.log('[PDF.js Extension] Inicializando extensión');
        
        // Configurar la URL del archivo desde los parámetros
        await configureDefaultURL();
        
        // Interceptar AppOptions
        interceptAppOptions();
        
        // Añadir botón de apertura si es necesario
        addOpenFileButton();
        
        // Configurar otras funcionalidades
        setupFetchInterception();
        setupExtensionFeatures();
        setupErrorHandling();
        
        console.log('[PDF.js Extension] Extensión inicializada correctamente');
    }

    // Función auxiliar para configurar archivo en PDF.js
    function setupFileForPDFJS(blobURL) {
        // Configurar AppOptions si existe
        if (window.AppOptions) {
            window.AppOptions.set('defaultUrl', blobURL);
            window.AppOptions.set('file', blobURL);
            console.log('[PDF.js Extension] AppOptions configurado con blob URL');
        }
        
        // Configurar parámetros de URL para que PDF.js los detecte
        const currentURL = new URL(window.location);
        currentURL.searchParams.set('file', blobURL);
        history.replaceState(null, '', currentURL.toString());
    }

    // Función auxiliar para cargar PDF con direct loader
    function loadPDFWithDirectLoader(blobURL) {
        function tryLoadPDF() {
            if (window.PDFJSExtensionDirectLoader) {
                console.log('[PDF.js Extension] Usando direct loader para cargar PDF');
                try {
                    window.PDFJSExtensionDirectLoader.loadPDF(blobURL);
                } catch (error) {
                    console.error('[PDF.js Extension] Error con direct loader:', error);
                    fallbackLoad();
                }
            } else {
                console.log('[PDF.js Extension] Direct loader no disponible, usando fallback');
                fallbackLoad();
            }
        }
        
        function fallbackLoad() {
            if (window.PDFViewerApplication && window.PDFViewerApplication.open) {
                console.log('[PDF.js Extension] Cargando PDF con PDFViewerApplication');
                try {
                    window.PDFViewerApplication.open(blobURL);
                } catch (error) {
                    console.error('[PDF.js Extension] Error abriendo PDF:', error);
                }
            } else {
                console.log('[PDF.js Extension] PDFViewerApplication no disponible aún, reintentando...');
                setTimeout(tryLoadPDF, 100);
            }
        }
        
        // Intentar inmediatamente y luego con delay
        tryLoadPDF();
        setTimeout(tryLoadPDF, 1000);
    }

    // Función para forzar la carga de PDF sin interacción de usuario
    function forceLoadPDF(fileURL) {
        console.log('[PDF.js Extension] Forzando carga de PDF:', fileURL);
        
        // Método 1: Usar direct loader agresivamente
        const maxAttempts = 10;
        let attempts = 0;
        
        function attemptLoad() {
            attempts++;
            console.log(`[PDF.js Extension] Intento de carga forzada ${attempts}/${maxAttempts}`);
            
            if (window.PDFJSExtensionDirectLoader) {
                try {
                    window.PDFJSExtensionDirectLoader.loadPDF(fileURL);
                    console.log('[PDF.js Extension] ✅ Carga forzada exitosa con direct loader');
                    return;
                } catch (error) {
                    console.log('[PDF.js Extension] Error en carga forzada, intentando método 2');
                }
            }
            
            // Método 2: Interceptar completamente el viewer
            if (window.PDFViewerApplication) {
                try {
                    // Forzar cierre de documento actual
                    if (window.PDFViewerApplication.pdfDocument) {
                        window.PDFViewerApplication.close();
                    }
                    
                    // Forzar apertura del nuevo archivo
                    window.PDFViewerApplication.open(fileURL);
                    console.log('[PDF.js Extension] ✅ Carga forzada exitosa con PDFViewerApplication');
                    return;
                } catch (error) {
                    console.log('[PDF.js Extension] Error con PDFViewerApplication, continuando...');
                }
            }
            
            // Método 3: Interceptar y reemplazar la inicialización completa
            if (window.webViewerLoad) {
                try {
                    window.webViewerLoad();
                    console.log('[PDF.js Extension] ✅ Carga forzada exitosa con webViewerLoad');
                    return;
                } catch (error) {
                    console.log('[PDF.js Extension] Error con webViewerLoad');
                }
            }
            
            // Reintentar si no hemos alcanzado el máximo
            if (attempts < maxAttempts) {
                setTimeout(attemptLoad, 200 * attempts); // Delay incremental
            } else {
                console.error('[PDF.js Extension] ❌ No se pudo forzar la carga después de', maxAttempts, 'intentos');
            }
        }
        
        // Comenzar intentos inmediatamente
        attemptLoad();
    }

    // Función para manejar autoLoad de archivos locales
    function handleLocalFileAutoLoad(originalFile, fileName) {
        console.log('[PDF.js Extension] Manejando autoLoad para archivo local:', originalFile);
        
        // Por ahora, para archivos file:// necesitamos mostrar el popup
        // ya que no podemos acceder directamente al archivo
        setTimeout(() => showLocalFileSelector(originalFile), 100);
        
        return true;
    }

    // Función para forzar carga de archivos locales
    function forceLoadLocalPDF(fileURL) {
        console.log('[PDF.js Extension] Forzando carga de archivo local:', fileURL);
        
        // Método 1: Intentar usar la URL file:// directamente con PDF.js
        if (window.pdfjsLib) {
            try {
                console.log('[PDF.js Extension] Intentando cargar file:// con pdfjsLib');
                
                const loadingTask = window.pdfjsLib.getDocument({
                    url: fileURL,
                    cMapUrl: 'cmaps/',
                    cMapPacked: true,
                    enableXfa: true,
                    verbosity: 0,
                    withCredentials: false
                });
                
                loadingTask.promise.then(function(pdf) {
                    console.log('[PDF.js Extension] ✅ Archivo local cargado exitosamente');
                    
                    if (window.PDFViewerApplication) {
                        if (window.PDFViewerApplication.pdfDocument) {
                            window.PDFViewerApplication.close();
                        }
                        
                        window.PDFViewerApplication.pdfDocument = pdf;
                        
                        if (window.PDFViewerApplication.pdfViewer) {
                            window.PDFViewerApplication.pdfViewer.setDocument(pdf);
                        }
                        
                        // Actualizar UI
                        updateLocalPDFViewer(pdf);
                    }
                }).catch(function(error) {
                    console.log('[PDF.js Extension] Error cargando archivo local:', error);
                    fallbackToFileSelector();
                });
                
                return;
            } catch (error) {
                console.log('[PDF.js Extension] Error con pdfjsLib:', error);
            }
        }
        
        // Método 2: Usar fetch con file://
        fetch(fileURL)
            .then(response => response.blob())
            .then(blob => {
                console.log('[PDF.js Extension] ✅ Archivo local obtenido via fetch');
                const blobURL = URL.createObjectURL(blob);
                window.PDFJSExtensionFileURL = blobURL;
                setupFileForPDFJS(blobURL);
                forceLoadPDF(blobURL);
            })
            .catch(error => {
                console.log('[PDF.js Extension] Error con fetch:', error);
                fallbackToFileSelector();
            });
        
        function fallbackToFileSelector() {
            console.log('[PDF.js Extension] Fallback: mostrando selector de archivos');
            const fileName = decodeURIComponent(fileURL).split('/').pop();
            setTimeout(() => showLocalFileSelector(fileURL), 100);
        }
    }

    // Función para forzar carga directa de archivos locales sin file picker
    function forceDirectLocalLoad(originalFile, fileName) {
        console.log('[PDF.js Extension] Forzando carga directa de archivo local:', originalFile);
        
        const decodedFile = decodeURIComponent(originalFile);
        const displayName = decodeURIComponent(fileName || decodedFile.split('/').pop() || 'PDF');
        
        console.log('[PDF.js Extension] Intentando múltiples métodos de carga directa...');
        
        // Configurar inmediatamente para evitar carga del PDF por defecto
        window.PDFJSExtensionFileURL = decodedFile;
        document.title = `${displayName} - PDF.js Viewer`;
        setupFileForPDFJS(decodedFile);
        
        // Método 1: Usar XMLHttpRequest (más permisivo que fetch)
        function tryXHRLoad() {
            console.log('[PDF.js Extension] Método 1: Intentando XMLHttpRequest');
            
            const xhr = new XMLHttpRequest();
            xhr.open('GET', decodedFile, true);
            xhr.responseType = 'blob';
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    console.log('[PDF.js Extension] ✅ Archivo obtenido via XHR');
                    const blobURL = URL.createObjectURL(xhr.response);
                    window.PDFJSExtensionFileURL = blobURL;
                    setupFileForPDFJS(blobURL);
                    forceLoadPDF(blobURL);
                    return;
                }
                tryMethod2();
            };
            
            xhr.onerror = function() {
                console.log('[PDF.js Extension] XHR falló, probando método 2');
                tryMethod2();
            };
            
            xhr.send();
        }
        
        // Método 2: Crear un iframe oculto para acceder al archivo
        function tryMethod2() {
            console.log('[PDF.js Extension] Método 2: Intentando iframe oculto');
            
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = decodedFile;
            
            iframe.onload = function() {
                try {
                    console.log('[PDF.js Extension] ✅ Archivo cargado en iframe');
                    // Intentar extraer contenido del iframe
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    
                    if (iframeDoc && iframeDoc.body) {
                        // Si el iframe contiene el PDF, usar su contenido
                        console.log('[PDF.js Extension] Contenido del iframe accesible');
                        
                        // Intentar usar la URL del iframe directamente
                        forceLoadLocalPDF(decodedFile);
                        
                        document.body.removeChild(iframe);
                        return;
                    }
                } catch (e) {
                    console.log('[PDF.js Extension] Error accediendo al iframe:', e);
                }
                
                document.body.removeChild(iframe);
                tryMethod3();
            };
            
            iframe.onerror = function() {
                console.log('[PDF.js Extension] Iframe falló, probando método 3');
                document.body.removeChild(iframe);
                tryMethod3();
            };
            
            // Esperar a que body esté disponible
            if (document.body) {
                document.body.appendChild(iframe);
            } else {
                setTimeout(() => {
                    if (document.body) {
                        document.body.appendChild(iframe);
                    } else {
                        tryMethod3();
                    }
                }, 100);
            }
        }
        
        // Método 3: Forzar carga directa con PDF.js
        function tryMethod3() {
            console.log('[PDF.js Extension] Método 3: Forzando carga directa con PDF.js');
            
            // Configurar variables de bypass antes de intentar cargar
            window.PDFJSExtensionFileURL = decodedFile;
            
            // Intentar cargar directamente con pdfjsLib
            setTimeout(() => {
                if (window.pdfjsLib) {
                    console.log('[PDF.js Extension] Usando pdfjsLib directamente');
                    
                    const loadingTask = window.pdfjsLib.getDocument({
                        url: decodedFile,
                        cMapUrl: 'cmaps/',
                        cMapPacked: true,
                        enableXfa: true,
                        verbosity: 0,
                        disableRange: true,
                        disableStream: true
                    });
                    
                    loadingTask.promise.then(function(pdf) {
                        console.log('[PDF.js Extension] ✅ PDF cargado directamente');
                        
                        if (window.PDFViewerApplication) {
                            if (window.PDFViewerApplication.pdfDocument) {
                                window.PDFViewerApplication.close();
                            }
                            
                            window.PDFViewerApplication.pdfDocument = pdf;
                            
                            if (window.PDFViewerApplication.pdfViewer) {
                                window.PDFViewerApplication.pdfViewer.setDocument(pdf);
                            }
                            
                            updateLocalPDFViewer(pdf);
                        }
                    }).catch(function(error) {
                        console.log('[PDF.js Extension] Error con pdfjsLib:', error);
                        tryMethod4();
                    });
                } else {
                    tryMethod4();
                }
            }, 500);
        }
        
        // Método 4: Mostrar popup como último recurso
        function tryMethod4() {
            console.log('[PDF.js Extension] Método 4: Mostrando popup como último recurso');
            
            if (document.body) {
                showEnhancedLocalFileSelector(originalFile, displayName);
            } else {
                setTimeout(() => {
                    if (document.body) {
                        showEnhancedLocalFileSelector(originalFile, displayName);
                    }
                }, 100);
            }
        }
        
        // Comenzar con el primer método
        tryXHRLoad();
        
        return true;
    }

    // Función mejorada para mostrar selector cuando todos los métodos automáticos fallan
    function showEnhancedLocalFileSelector(originalFile, displayName) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 9999;
        `;
        
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 3px solid #ff6b6b;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            font-family: Arial, sans-serif;
            box-shadow: 0 10px 20px rgba(0,0,0,0.5);
            z-index: 10000;
            min-width: 450px;
        `;
        
        message.innerHTML = `
            <h2 style="color: #ff6b6b; margin-top: 0;">🚫 Restricción de Seguridad</h2>
            <p style="font-size: 16px; margin: 15px 0;"><strong>Archivo detectado:</strong> ${displayName}</p>
            <p style="color: #666; margin: 15px 0;">Chrome bloquea el acceso automático a archivos locales. Debes seleccionar el archivo manualmente.</p>
            <button id="forceSelectBtn" style="background: #ff6b6b; color: white; border: none; padding: 15px 30px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; margin: 10px;">
                📂 Seleccionar Archivo
            </button>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(message);
        
        // Auto-focus
        setTimeout(() => {
            const btn = document.getElementById('forceSelectBtn');
            if (btn) btn.focus();
        }, 100);
        
        // Manejar selección
        document.getElementById('forceSelectBtn').onclick = function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/pdf,.pdf';
            input.style.display = 'none';
            
            input.onchange = function(event) {
                const file = event.target.files[0];
                if (file) {
                    const blobURL = URL.createObjectURL(file);
                    window.PDFJSExtensionFileURL = blobURL;
                    document.title = `${file.name} - PDF.js Viewer`;
                    
                    document.body.removeChild(overlay);
                    document.body.removeChild(message);
                    
                    setupFileForPDFJS(blobURL);
                    forceLoadPDF(blobURL);
                }
                
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
            };
            
            document.body.appendChild(input);
            input.click();
        };
    }

    // Función para manejar selección automática de archivos locales (función original mantenida por compatibilidad)
    function handleAutoLocalSelect(originalFile, fileName) {
        console.log('[PDF.js Extension] Manejando autoLocalSelect');
        
        function createAutoSelector() {
            // Verificar que document.body existe
            if (!document.body) {
                console.log('[PDF.js Extension] document.body no disponible, esperando...');
                setTimeout(createAutoSelector, 100);
                return;
            }
            
            // Crear mensaje inmediato que se abre automáticamente
            const message = document.createElement('div');
            message.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #007bff;
                color: white;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                z-index: 10000;
            `;
            
            const fileNameDisplay = decodeURIComponent(fileName || originalFile?.split('/').pop() || 'PDF');
            message.innerHTML = `
                <h3>🎯 Archivo Detectado: ${fileNameDisplay}</h3>
                <p>Abriendo selector automáticamente...</p>
            `;
            
            document.body.appendChild(message);
        
            // Crear input file inmediatamente y hacer clic
            setTimeout(() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/pdf,.pdf';
                input.style.display = 'none';
                
                input.onchange = function(event) {
                    const file = event.target.files[0];
                    if (file) {
                        console.log('[PDF.js Extension] ✅ Archivo seleccionado automáticamente:', file.name);
                        
                        const blobURL = URL.createObjectURL(file);
                        window.PDFJSExtensionFileURL = blobURL;
                        document.title = `${file.name} - PDF.js Viewer`;
                        
                        // Remover mensaje
                        if (message.parentNode) {
                            document.body.removeChild(message);
                        }
                        
                        setupFileForPDFJS(blobURL);
                        forceLoadPDF(blobURL);
                    } else {
                        // Si no selecciona archivo, mostrar popup normal
                        if (message.parentNode) {
                            document.body.removeChild(message);
                        }
                        showLocalFileSelector(originalFile);
                    }
                    
                    if (input.parentNode) {
                        input.parentNode.removeChild(input);
                    }
                };
                
                document.body.appendChild(input);
                input.click();
            }, 1000); // Delay para que el usuario vea el mensaje
        }
        
        // Iniciar el proceso
        createAutoSelector();
        
        return true;
    }

    // Función auxiliar para actualizar UI con archivo local
    function updateLocalPDFViewer(pdf) {
        console.log('[PDF.js Extension] Actualizando UI para archivo local');
        
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
        
        console.log('[PDF.js Extension] ✅ Archivo local completamente funcional');
    }

    // Ejecutar inicialización inmediatamente (antes de que PDF.js se cargue)
    initializeExtension();

})();