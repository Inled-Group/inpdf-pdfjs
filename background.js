// Background script simplificado para PDF.js Extension
console.log('[PDF.js Extension] Background script cargado');

// Manejar mensajes básicos de la extensión
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[PDF.js Extension] Mensaje recibido:', request);
    
    if (request.type === 'ping') {
        sendResponse({ success: true, message: 'Background script activo' });
        return false;
    }
    
    // Para otros mensajes
    sendResponse({ success: false, error: 'Tipo de mensaje no soportado' });
    return false;
});