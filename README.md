# PDF.js Viewer Extension para Chrome

Esta extensión reemplaza el visor de PDF nativo de Chrome con el visor PDF.js, proporcionando una experiencia de visualización mejorada con todas las características avanzadas de PDF.js.

## Características

- **Reemplazo completo del visor nativo**: Intercepta automáticamente todos los archivos PDF
- **Funcionalidad completa de PDF.js**: Todas las características del visor original se mantienen
- **Soporte para URLs y archivos locales**: Funciona con PDFs de cualquier fuente
- **Interfaz familiar**: Mantiene la interfaz conocida de PDF.js
- **Sin configuración adicional**: Funciona inmediatamente después de la instalación

## Instalación

### Método 1: Instalación manual (Developer Mode)

1. **Abrir Chrome** y navegar a `chrome://extensions/`

2. **Activar el modo desarrollador** haciendo clic en el interruptor "Developer mode" en la esquina superior derecha

3. **Cargar la extensión**:
   - Haz clic en "Load unpacked" (Cargar extensión sin empaquetar)
   - Selecciona la carpeta que contiene esta extensión (`pdfjs-5.4.54-dist`)
   - La extensión aparecerá en la lista con el nombre "PDF.js Viewer Extension"

4. **Verificar instalación**:
   - La extensión debe aparecer activa
   - Puedes ver el ícono en la barra de herramientas de Chrome

### Método 2: Instalación como .crx (Recomendado para distribución)

1. **Empaquetar la extensión**:
   - En `chrome://extensions/` con modo desarrollador activado
   - Haz clic en "Pack extension"
   - Selecciona la carpeta de la extensión
   - Chrome generará un archivo `.crx`

2. **Instalar el .crx**:
   - Arrastra el archivo `.crx` a la ventana de `chrome://extensions/`
   - Confirma la instalación

## Uso

### Automático
Una vez instalada, la extensión trabajará automáticamente:

- **Navegación web**: Cualquier PDF que encuentres en sitios web se abrirá con PDF.js
- **Archivos locales**: Al detectar un archivo PDF local, la extensión te pedirá que selecciones el archivo manualmente (por restricciones de seguridad del navegador)
- **Enlaces directos**: Los enlaces que apunten a archivos PDF se redirigirán automáticamente

### Manual
También puedes usar el visor directamente:

1. Navega a `chrome-extension://[ID-DE-LA-EXTENSION]/web/viewer.html?file=[URL-DEL-PDF]`
2. Reemplaza `[URL-DEL-PDF]` con la URL del archivo que quieres ver

## Funcionalidades Incluidas

### Visualización
- Zoom avanzado con múltiples opciones
- Rotación de páginas
- Modos de visualización (página única, continuo, etc.)
- Presentación a pantalla completa

### Navegación
- Miniaturas de páginas
- Índice/esquema del documento
- Búsqueda de texto avanzada
- Ir a página específica

### Herramientas de Edición
- Resaltado de texto
- Anotaciones y comentarios
- Herramientas de dibujo
- Firma digital
- Agregar sellos e imágenes

### Funciones Avanzadas
- Propiedades del documento
- Información de capas
- Archivos adjuntos
- Modo de lectura optimizado

## Desinstalación

1. Ve a `chrome://extensions/`
2. Busca "PDF.js Viewer Extension"
3. Haz clic en "Remove" (Eliminar)
4. Confirma la eliminación

Chrome volverá a usar su visor nativo después de la desinstalación.

## Solución de Problemas

### La extensión no intercepta PDFs
- Verifica que la extensión esté habilitada en `chrome://extensions/`
- Recarga la página web que contiene el PDF
- Reinicia el navegador

### Error de CORS o acceso
- Algunos PDFs pueden requerir permisos especiales
- La extensión funciona mejor con PDFs de fuentes confiables
- Para archivos locales, asegúrate de que Chrome tenga permisos de archivo

### El visor no carga correctamente
- Verifica que todos los archivos de la extensión estén presentes
- Revisa la consola del navegador (F12) para errores
- Reinstala la extensión si persisten los problemas

## Archivos de la Extensión

```
pdfjs-5.4.54-dist/
├── manifest.json              # Configuración de la extensión
├── content-script.js          # Script para interceptar PDFs
├── extension-init.js          # Inicialización de la extensión
├── web/
│   ├── viewer.html           # Interfaz principal del visor
│   ├── viewer.mjs            # Lógica principal de PDF.js
│   ├── viewer.css            # Estilos del visor
│   └── locale/               # Archivos de idioma
├── build/
│   └── pdf.mjs              # Motor de renderizado PDF
└── README.md                # Este archivo
```

## Compatibilidad

- **Chrome**: Versión 88 o superior
- **Chromium**: Versiones basadas en Chromium 88+
- **Manifest V3**: Compatible con las últimas especificaciones
- **Archivos PDF**: PDF 1.0 a 2.0 y la mayoría de extensiones

## Licencia

Esta extensión se basa en PDF.js de Mozilla, bajo la Licencia Apache 2.0.

## Soporte

Para reportar problemas o solicitar funcionalidades:
- Verifica la consola del navegador para errores
- Incluye la versión de Chrome y detalles del PDF problemático
- Proporciona pasos para reproducir el problema