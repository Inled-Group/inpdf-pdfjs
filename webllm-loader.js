// WebLLM Loader - Carga WebLLM de forma local para evitar problemas de CSP
// Basado en @mlc-ai/web-llm pero simplificado

(function() {
    'use strict';
    
    console.log('[PDF.js Extension] WebLLM Loader iniciando');
    
    // Configuración básica de WebLLM
    const WEBLLM_CONFIG = {
        modelUrl: 'https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC/resolve/main/',
        modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        wasmUrl: 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.46/lib/'
    };
    
    // Estado del cargador
    let isLoading = false;
    let isLoaded = false;
    let engine = null;
    let loadCallbacks = [];
    
    // API pública
    window.WebLLMLoader = {
        load: loadWebLLM,
        isReady: () => isLoaded,
        getEngine: () => engine,
        chat: chatWithModel
    };
    
    // Función principal para cargar WebLLM local real
    async function loadWebLLM(progressCallback = null) {
        if (isLoaded) return engine;
        if (isLoading) {
            return new Promise(resolve => loadCallbacks.push(resolve));
        }
        
        isLoading = true;
        
        try {
            console.log('[PDF.js Extension] Iniciando WebLLM real local...');
            
            if (progressCallback) progressCallback({ text: 'Cargando WebLLM local...', progress: 0.1 });
            
            // Cargar WebLLM desde archivo local
            try {
                engine = await loadLocalWebLLM(progressCallback);
                isLoaded = true;
                console.log('[PDF.js Extension] WebLLM real cargado exitosamente');
            } catch (webllmError) {
                console.error('[PDF.js Extension] WebLLM falló:', webllmError);
                
                if (progressCallback) progressCallback({ text: 'Error: WebLLM no pudo cargar', progress: 0.5 });
                
                throw webllmError; // Propagar el error
            }
            
            // Resolver callbacks pendientes
            loadCallbacks.forEach(callback => callback(engine));
            loadCallbacks = [];
            
            if (progressCallback) progressCallback({ text: 'IA lista para análisis', progress: 1.0 });
            
            return engine;
            
        } catch (error) {
            console.error('[PDF.js Extension] Error cargando WebLLM:', error);
            
            if (progressCallback) progressCallback({ text: 'WebLLM falló completamente', progress: 0.1 });
            
            // No usar simulador falso - propagar error
            isLoaded = false;
            throw error;
        } finally {
            isLoading = false;
        }
    }
    
    // Cargar WebLLM desde archivo local
    async function loadLocalWebLLM(progressCallback) {
        if (progressCallback) progressCallback({ text: 'Importando módulo WebLLM local...', progress: 0.2 });
        
        // Cargar desde archivo local
        const webllmUrl = chrome.runtime.getURL('lib/webllm.js');
        console.log('[PDF.js Extension] Cargando WebLLM desde:', webllmUrl);
        
        const module = await import(webllmUrl);
        const { CreateMLCEngine, prebuiltAppConfig } = module;
        
        if (!CreateMLCEngine) {
            throw new Error('CreateMLCEngine no encontrado en módulo local');
        }
        
        // Obtener modelos disponibles desde la configuración
        console.log('[PDF.js Extension] Consultando modelos disponibles...');
        if (progressCallback) progressCallback({ text: 'Consultando modelos disponibles...', progress: 0.3 });
        
        let availableModelIds = [];
        try {
            if (prebuiltAppConfig && prebuiltAppConfig.model_list) {
                availableModelIds = prebuiltAppConfig.model_list.map(model => model.model_id);
                console.log('[PDF.js Extension] Modelos disponibles:', availableModelIds);
            }
        } catch (configError) {
            console.log('[PDF.js Extension] No se pudo obtener lista de modelos:', configError);
        }
        
        if (progressCallback) progressCallback({ text: 'Inicializando modelo Llama local...', progress: 0.4 });
        
        // Crear progress wrapper para WebLLM
        const wrappedProgressCallback = (info) => {
            if (progressCallback) {
                let progress = 0.4; // Base progress from loading module
                let text = 'Inicializando modelo...';
                
                if (info.progress !== undefined) {
                    // WebLLM progress is from 0-1, we map it to 0.4-0.9
                    progress = 0.4 + (info.progress * 0.5);
                }
                
                if (info.text) {
                    text = info.text;
                } else if (info.timeElapsed !== undefined) {
                    text = `Descargando modelo Llama... ${Math.round(progress * 100)}%`;
                }
                
                progressCallback({ text, progress });
            }
        };
        
        // Seleccionar modelo óptimo para documentos - usar IDs reales del WebLLM
        let modelsToTry = [];
        
        if (availableModelIds.length > 0) {
            // Usar modelos rápidos para análisis de documentos en español
            const preferredModels = [
                "Phi-3-mini-4k-instruct-q4f16_1-MLC-1k",
                "Phi-3-mini-4k-instruct-q4f32_1-MLC-1k",
                "gemma-2b-it-q4f16_1-MLC-1k",
                "gemma-2b-it-q4f32_1-MLC-1k",
                "Qwen2-0.5B-Instruct-q0f32-MLC",
                "Qwen2-1.5B-Instruct-q4f16_1-MLC"
            ];
            
            // Encontrar modelos que realmente existen
            modelsToTry = preferredModels.filter(modelId => 
                availableModelIds.includes(modelId)
            );
            
            // Si no encontramos matches, usar cualquier modelo pequeño disponible
            if (modelsToTry.length === 0) {
                modelsToTry = availableModelIds.filter(id => 
                    id.includes('1k') || id.includes('0.5B') || id.includes('1.1B') || id.includes('2b')
                ).slice(0, 3);
            }
            
            // Último recurso: usar los primeros 3 modelos disponibles
            if (modelsToTry.length === 0) {
                modelsToTry = availableModelIds.slice(0, 3);
            }
        } else {
            // Fallback a modelos rápidos conocidos
            modelsToTry = [
                "Phi-3-mini-4k-instruct-q4f16_1-MLC-1k",
                "gemma-2b-it-q4f16_1-MLC-1k",
                "Qwen2-0.5B-Instruct-q0f32-MLC"
            ];
        }
        
        console.log('[PDF.js Extension] Modelos a probar:', modelsToTry);
        
        // Intentar cargar modelos en orden de preferencia
        let engine = null;
        let lastError = null;
        
        for (let i = 0; i < modelsToTry.length; i++) {
            const modelId = modelsToTry[i];
            try {
                console.log(`[PDF.js Extension] Intentando modelo ${i+1}/${modelsToTry.length}: ${modelId}`);
                if (progressCallback) progressCallback({ 
                    text: `Probando modelo ${modelId.split('-')[0]}...`, 
                    progress: 0.4 + (i * 0.1) 
                });
                
                engine = await CreateMLCEngine(modelId, {
                    initProgressCallback: wrappedProgressCallback,
                    logLevel: "INFO"
                });
                
                console.log(`[PDF.js Extension] ✅ Modelo ${modelId} cargado exitosamente`);
                break;
                
            } catch (modelError) {
                console.log(`[PDF.js Extension] ❌ Modelo ${modelId} falló:`, modelError.message);
                lastError = modelError;
                continue;
            }
        }
        
        if (!engine) {
            throw new Error(`No se pudo cargar ningún modelo disponible. Modelos probados: ${modelsToTry.join(', ')}. Último error: ${lastError?.message}`);
        }
        
        if (progressCallback) progressCallback({ text: 'WebLLM local inicializado', progress: 1.0 });
        
        return engine;
    }
    
    // Nota: El método iframe fue removido debido a restricciones CSP de Chrome
    // Las extensiones no pueden usar 'unsafe-inline' por políticas de seguridad
    
    // Cargar via dynamic import directo con mejor manejo de errores
    async function loadViaDynamicImport(progressCallback) {
        if (progressCallback) progressCallback({ text: 'Verificando conexión a internet...', progress: 0.25 });
        
        // Verificar conectividad primero (con timeout rápido)
        try {
            await Promise.race([
                fetch('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.46/package.json', { 
                    method: 'HEAD',
                    mode: 'cors'
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout verificando conectividad')), 5000)
                )
            ]);
        } catch (networkError) {
            console.log('[PDF.js Extension] Sin conexión a CDN o timeout:', networkError);
            if (progressCallback) progressCallback({ 
                text: 'Sin conexión estable - usando simulador local', 
                progress: 0.3 
            });
            throw new Error('No hay conexión estable para descargar WebLLM');
        }
        
        if (progressCallback) progressCallback({ text: 'Descargando WebLLM desde CDN...', progress: 0.3 });
        
        // Intentar cargar desde diferentes CDNs con timeout
        const urls = [
            'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.46/lib/index.js',
            'https://unpkg.com/@mlc-ai/web-llm@0.2.46/lib/index.js'
        ];
        
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            try {
                if (progressCallback) progressCallback({ 
                    text: `Conectando a CDN ${i + 1}/${urls.length}...`, 
                    progress: 0.35 + (i * 0.05)
                });
                
                // Cargar módulo con timeout
                const module = await Promise.race([
                    import(url),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout importando módulo')), 30000)
                    )
                ]);
                
                const { CreateMLCEngine } = module;
                
                if (!CreateMLCEngine) {
                    throw new Error('CreateMLCEngine no encontrado en el módulo');
                }
                
                if (progressCallback) progressCallback({ text: 'Módulo descargado, inicializando WebLLM...', progress: 0.5 });
                
                // Crear progress wrapper para WebLLM con mejor mapeo
                const wrappedProgressCallback = (info) => {
                    if (progressCallback) {
                        let progress = 0.5; // Base progress from loading module
                        let text = 'Inicializando modelo de IA...';
                        
                        if (info.progress !== undefined) {
                            // WebLLM progress is from 0-1, we map it to 0.5-0.95
                            progress = 0.5 + (info.progress * 0.45);
                        }
                        
                        // Mejorar mensajes de progreso
                        if (info.text) {
                            text = info.text;
                        } else if (info.timeElapsed !== undefined) {
                            text = `Descargando modelo Llama... ${Math.round(progress * 100)}%`;
                        } else if (progress > 0.7) {
                            text = `Inicializando IA... ${Math.round(progress * 100)}%`;
                        }
                        
                        progressCallback({ text, progress });
                    }
                };
                
                if (progressCallback) progressCallback({ text: 'Creando motor de IA...', progress: 0.55 });
                
                // Crear engine con timeout más largo
                const engine = await Promise.race([
                    CreateMLCEngine("Llama-3.2-1B-Instruct-q4f16_1-MLC", {
                        initProgressCallback: wrappedProgressCallback
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout creando WebLLM engine')), 120000)
                    )
                ]);
                
                if (progressCallback) progressCallback({ text: 'WebLLM listo para usar', progress: 1.0 });
                
                return engine;
                
            } catch (error) {
                console.log(`[PDF.js Extension] Error con ${url}:`, error);
                
                if (progressCallback) progressCallback({ 
                    text: `Error con CDN ${i + 1}: ${error.message}`, 
                    progress: 0.4 + (i * 0.05)
                });
                
                if (i === urls.length - 1) {
                    // Last URL failed
                    if (progressCallback) progressCallback({ 
                        text: 'No se pudo cargar WebLLM - preparando simulador...', 
                        progress: 0.45 
                    });
                    throw error;
                }
                
                // Esperar un poco antes del siguiente intento
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
        }
        
        throw new Error('No se pudo cargar WebLLM desde ningún CDN disponible');
    }
    
    // Solo WebLLM real - sin simuladores falsos
    
    // Función de chat simplificada
    async function chatWithModel(message, options = {}) {
        if (!engine) {
            throw new Error('WebLLM no está cargado');
        }
        
        const chatOptions = {
            messages: [{ role: "user", content: message }],
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 512,
            ...options
        };
        
        const response = await engine.chat.completions.create(chatOptions);
        return response.choices[0].message.content;
    }
    
    
    // Funciones de simulación removidas - solo WebLLM real
    
})();