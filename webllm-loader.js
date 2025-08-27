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
        chat: chatWithModel,
        getSystemCapabilities: detectSystemCapabilities
    };
    
    // Función para detectar capacidades del sistema
    async function detectSystemCapabilities() {
        const capabilities = {
            hasGPU: false,
            gpuTier: 0,
            memoryGB: 0,
            cores: navigator.hardwareConcurrency || 4,
            webGLSupport: false,
            webGPUSupport: false,
            recommendedModel: 'cpu-optimized'
        };
        
        try {
            // Detectar memoria aproximada
            if ('memory' in performance) {
                capabilities.memoryGB = Math.round(performance.memory.jsHeapSizeLimit / (1024 ** 3));
            } else {
                // Estimación basada en otras señales
                capabilities.memoryGB = capabilities.cores >= 8 ? 8 : 4;
            }
            
            // Detectar soporte WebGL
            const canvas = document.createElement('canvas');
            const webglContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            capabilities.webGLSupport = !!webglContext;
            
            if (webglContext) {
                // Obtener información del renderer GPU
                const debugInfo = webglContext.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const renderer = webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    const vendor = webglContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    
                    console.log('[PDF.js Extension] GPU detectada:', renderer, vendor);
                    
                    // Clasificar GPU por potencia aproximada
                    if (renderer.toLowerCase().includes('nvidia')) {
                        capabilities.hasGPU = true;
                        capabilities.gpuTier = renderer.includes('RTX') || renderer.includes('GTX') ? 3 : 2;
                    } else if (renderer.toLowerCase().includes('amd') || renderer.toLowerCase().includes('radeon')) {
                        capabilities.hasGPU = true;
                        capabilities.gpuTier = renderer.includes('RX') ? 3 : 2;
                    } else if (renderer.toLowerCase().includes('intel')) {
                        capabilities.hasGPU = true;
                        capabilities.gpuTier = renderer.includes('Arc') ? 2 : 1;
                    } else if (renderer.toLowerCase().includes('apple') || renderer.toLowerCase().includes('metal')) {
                        capabilities.hasGPU = true;
                        capabilities.gpuTier = renderer.includes('M1') || renderer.includes('M2') || renderer.includes('M3') ? 3 : 2;
                    }
                }
            }
            
            // Detectar soporte WebGPU
            if ('gpu' in navigator) {
                try {
                    const adapter = await navigator.gpu.requestAdapter();
                    capabilities.webGPUSupport = !!adapter;
                    if (adapter) {
                        capabilities.hasGPU = true;
                        capabilities.gpuTier = Math.max(capabilities.gpuTier, 2);
                    }
                } catch (e) {
                    console.log('[PDF.js Extension] WebGPU no disponible:', e);
                }
            }
            
            // Seleccionar modelo recomendado basado en capacidades
            if (capabilities.hasGPU && capabilities.memoryGB >= 6) {
                if (capabilities.gpuTier >= 3) {
                    capabilities.recommendedModel = 'gpu-high-performance';
                } else {
                    capabilities.recommendedModel = 'gpu-balanced';
                }
            } else if (capabilities.memoryGB >= 4 && capabilities.cores >= 6) {
                capabilities.recommendedModel = 'cpu-balanced';
            } else {
                capabilities.recommendedModel = 'cpu-lite';
            }
            
        } catch (error) {
            console.log('[PDF.js Extension] Error detectando capacidades:', error);
        }
        
        return capabilities;
    }
    
    // Función para seleccionar modelos óptimos basados en capacidades
    function selectOptimalModels(availableModelIds, capabilities) {
        let modelPreferences = [];
        
        console.log(`[PDF.js Extension] Seleccionando modelos para: ${capabilities.recommendedModel} (GPU: ${capabilities.hasGPU}, RAM: ${capabilities.memoryGB}GB, Cores: ${capabilities.cores})`);
        
        switch (capabilities.recommendedModel) {
            case 'gpu-high-performance':
                modelPreferences = [
                    "Llama-3.2-3B-Instruct-q4f16_1-MLC",
                    "Qwen2.5-3B-Instruct-q4f16_1-MLC",
                    "Phi-3.5-mini-instruct-q4f16_1-MLC",
                    "gemma-2-2b-it-q4f16_1-MLC"
                ];
                break;
                
            case 'gpu-balanced':
                modelPreferences = [
                    "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
                    "Phi-3.5-mini-instruct-q4f16_1-MLC",
                    "gemma-2-2b-it-q4f16_1-MLC",
                    "Qwen2-1.5B-Instruct-q4f16_1-MLC"
                ];
                break;
                
            case 'cpu-balanced':
                modelPreferences = [
                    "Phi-3-mini-4k-instruct-q4f16_1-MLC-1k",
                    "Qwen2-1.5B-Instruct-q4f16_1-MLC",
                    "gemma-2b-it-q4f16_1-MLC-1k",
                    "Qwen2-0.5B-Instruct-q0f32-MLC"
                ];
                break;
                
            case 'cpu-lite':
            default:
                modelPreferences = [
                    "Qwen2-0.5B-Instruct-q0f32-MLC",
                    "SmolLM-135M-Instruct-q0f32-MLC",
                    "Phi-3-mini-4k-instruct-q4f16_1-MLC-1k",
                    "gemma-2b-it-q4f16_1-MLC-1k"
                ];
                break;
        }
        
        // Filtrar modelos que realmente existen
        let availablePreferred = modelPreferences.filter(modelId => 
            availableModelIds.includes(modelId)
        );
        
        // Si no hay modelos preferidos disponibles, usar cualquier modelo pequeño
        if (availablePreferred.length === 0) {
            const smallModels = availableModelIds.filter(id => 
                id.includes('0.5B') || id.includes('1B') || id.includes('1.5B') || 
                id.includes('2b') || id.includes('mini') || id.includes('1k')
            );
            
            availablePreferred = smallModels.slice(0, 3);
        }
        
        // Último recurso: usar los primeros modelos disponibles
        if (availablePreferred.length === 0) {
            availablePreferred = availableModelIds.slice(0, 2);
        }
        
        return availablePreferred;
    }
    
    // Función principal para cargar WebLLM con detección de recursos
    async function loadWebLLM(progressCallback = null) {
        if (isLoaded) return engine;
        if (isLoading) {
            return new Promise(resolve => loadCallbacks.push(resolve));
        }
        
        isLoading = true;
        
        try {
            console.log('[PDF.js Extension] Iniciando WebLLM con detección de recursos...');
            
            if (progressCallback) progressCallback({ text: 'Detectando capacidades del sistema...', progress: 0.05 });
            
            // Detectar capacidades del sistema
            const systemCapabilities = await detectSystemCapabilities();
            console.log('[PDF.js Extension] Capacidades detectadas:', systemCapabilities);
            
            if (progressCallback) {
                const statusText = systemCapabilities.hasGPU ? 
                    'GPU detectada - Cargando WebLLM optimizado...' : 
                    'Solo CPU disponible - Cargando WebLLM ligero...';
                progressCallback({ text: statusText, progress: 0.1 });
            }
            
            // Cargar WebLLM desde archivo local con configuración optimizada
            try {
                engine = await loadLocalWebLLM(progressCallback, systemCapabilities);
                isLoaded = true;
                console.log('[PDF.js Extension] WebLLM cargado exitosamente con capacidades:', systemCapabilities);
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
    
    // Cargar WebLLM desde archivo local con optimizaciones
    async function loadLocalWebLLM(progressCallback, systemCapabilities = null) {
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
        
        // Seleccionar modelo basado en capacidades del sistema
        let modelsToTry = [];
        
        if (systemCapabilities) {
            modelsToTry = selectOptimalModels(availableModelIds, systemCapabilities);
        } else {
            // Fallback a selección tradicional
            if (availableModelIds.length > 0) {
                const preferredModels = [
                    "Phi-3-mini-4k-instruct-q4f16_1-MLC-1k",
                    "gemma-2b-it-q4f16_1-MLC-1k",
                    "Qwen2-0.5B-Instruct-q0f32-MLC"
                ];
                
                modelsToTry = preferredModels.filter(modelId => 
                    availableModelIds.includes(modelId)
                );
                
                if (modelsToTry.length === 0) {
                    modelsToTry = availableModelIds.slice(0, 3);
                }
            } else {
                modelsToTry = [
                    "Phi-3-mini-4k-instruct-q4f16_1-MLC-1k",
                    "gemma-2b-it-q4f16_1-MLC-1k"
                ];
            }
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
                
                // Configurar engine según capacidades del sistema
                const engineConfig = {
                    initProgressCallback: wrappedProgressCallback,
                    logLevel: "INFO"
                };
                
                // Optimizaciones específicas según el hardware
                if (systemCapabilities) {
                    if (!systemCapabilities.hasGPU) {
                        // Configuración optimizada para CPU
                        engineConfig.useWebGPU = false;
                        engineConfig.numThreads = Math.min(systemCapabilities.cores, 4); // Evitar saturación
                        engineConfig.memoryLimit = Math.floor(systemCapabilities.memoryGB * 0.3 * 1024); // 30% de RAM en MB
                        console.log(`[PDF.js Extension] Configuración CPU: threads=${engineConfig.numThreads}, memLimit=${engineConfig.memoryLimit}MB`);
                    } else {
                        // Permitir WebGPU si está disponible
                        engineConfig.useWebGPU = systemCapabilities.webGPUSupport;
                        engineConfig.numThreads = Math.min(systemCapabilities.cores, 8);
                        console.log(`[PDF.js Extension] Configuración GPU: WebGPU=${engineConfig.useWebGPU}, threads=${engineConfig.numThreads}`);
                    }
                }
                
                engine = await CreateMLCEngine(modelId, engineConfig);
                
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
    
    // Función de chat optimizada con control de recursos
    async function chatWithModel(message, options = {}) {
        if (!engine) {
            throw new Error('WebLLM no está cargado');
        }
        
        // Obtener capacidades del sistema si están disponibles
        const capabilities = await detectSystemCapabilities();
        
        // Configurar opciones de chat optimizadas según el hardware
        const chatOptions = {
            messages: [{ role: "user", content: message }],
            temperature: options.temperature || 0.7,
            ...options
        };
        
        // Ajustar max_tokens según las capacidades del sistema
        if (!options.max_tokens) {
            if (capabilities.hasGPU) {
                chatOptions.max_tokens = 1024; // GPU puede manejar más tokens
            } else if (capabilities.memoryGB >= 6) {
                chatOptions.max_tokens = 768;  // CPU con buena RAM
            } else {
                chatOptions.max_tokens = 512;  // CPU con RAM limitada
            }
        }
        
        // Para CPU, reducir la complejidad cuando sea necesario
        if (!capabilities.hasGPU) {
            chatOptions.temperature = Math.min(chatOptions.temperature, 0.5); // Menos creatividad = menos compute
            
            // Agregar throttling para evitar saturación en sistemas de baja potencia
            if (capabilities.cores <= 4 && capabilities.memoryGB <= 4) {
                console.log('[PDF.js Extension] Sistema de baja potencia detectado - aplicando throttling');
                await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa antes de procesar
            }
        }
        
        console.log(`[PDF.js Extension] Procesando chat con ${chatOptions.max_tokens} tokens máximos (GPU: ${capabilities.hasGPU})`);
        
        const response = await engine.chat.completions.create(chatOptions);
        return response.choices[0].message.content;
    }
    
    
    // Funciones de simulación removidas - solo WebLLM real
    
})();