// Renderizador de Markdown simple para el chat
// Convierte markdown básico a HTML

(function() {
    'use strict';
    
    console.log('[PDF.js Extension] Markdown Renderer cargado');
    
    // API pública
    window.MarkdownRenderer = {
        render: renderMarkdown,
        renderToElement: renderToElement
    };
    
    // Función principal para renderizar markdown
    function renderMarkdown(markdown) {
        if (!markdown || typeof markdown !== 'string') {
            return '';
        }
        
        let html = markdown;
        
        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');
        
        // Code inline
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Lists
        html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
        html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
        html = html.replace(/^• (.*$)/gim, '<li>$1</li>');
        
        // Wrap consecutive <li> items in <ul>
        html = html.replace(/(<li>.*<\/li>)/gs, (match) => {
            if (!match.includes('<ul>')) {
                return '<ul>' + match + '</ul>';
            }
            return match;
        });
        
        // Line breaks - preservar saltos de línea múltiples
        html = html.replace(/\n\n/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');
        
        // Wrap in paragraphs si no hay otros elementos de bloque
        if (!html.includes('<h1>') && !html.includes('<h2>') && !html.includes('<h3>') && !html.includes('<ul>')) {
            html = '<p>' + html + '</p>';
        }
        
        // Limpiar paragraphs vacíos
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p><br><\/p>/g, '');
        
        return html;
    }
    
    // Renderizar markdown directamente en un elemento DOM
    function renderToElement(element, markdown) {
        if (!element) return;
        
        const html = renderMarkdown(markdown);
        element.innerHTML = html;
        
        // Añadir estilos al elemento
        addMarkdownStyles(element);
    }
    
    // Añadir estilos CSS para markdown
    function addMarkdownStyles(element) {
        const style = `
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
        `;
        
        element.style.cssText += style;
        
        // Estilos para elementos internos
        const styles = document.createElement('style');
        styles.textContent = `
            .chat-message.assistant h1,
            .chat-message.assistant h2,
            .chat-message.assistant h3 {
                margin: 0.8em 0 0.4em 0;
                color: #2c3e50;
                font-weight: 600;
            }
            
            .chat-message.assistant h1 {
                font-size: 1.2em;
                border-bottom: 2px solid #3498db;
                padding-bottom: 0.3em;
            }
            
            .chat-message.assistant h2 {
                font-size: 1.1em;
                color: #2980b9;
            }
            
            .chat-message.assistant h3 {
                font-size: 1em;
                color: #34495e;
            }
            
            .chat-message.assistant p {
                margin: 0.6em 0;
            }
            
            .chat-message.assistant ul {
                margin: 0.5em 0;
                padding-left: 1.2em;
            }
            
            .chat-message.assistant li {
                margin: 0.3em 0;
                list-style-type: disc;
            }
            
            .chat-message.assistant strong {
                color: #2c3e50;
                font-weight: 600;
            }
            
            .chat-message.assistant em {
                color: #7f8c8d;
                font-style: italic;
            }
            
            .chat-message.assistant code {
                background: #ecf0f1;
                padding: 0.2em 0.4em;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                color: #e74c3c;
            }
            
            .chat-message.assistant a {
                color: #3498db;
                text-decoration: none;
            }
            
            .chat-message.assistant a:hover {
                text-decoration: underline;
            }
            
            .chat-message.assistant br {
                line-height: 1.8;
            }
        `;
        
        if (!document.head.querySelector('#markdown-styles')) {
            styles.id = 'markdown-styles';
            document.head.appendChild(styles);
        }
    }
    
})();