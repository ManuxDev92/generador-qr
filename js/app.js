// QR Studio — app.js
// Lógica para generar y descargar códigos QR desde una URL
// Usa el servicio público de api.qrserver.com para crear el PNG.

(function(){
    
    const form = document.getElementById('qr-form');
    const inputUrl = document.getElementById('qr-url');
    const sizeSel = document.getElementById('qr-size');
    const marginInput = document.getElementById('qr-margin');
    const levelSel = document.getElementById('qr-level');
    const errorEl = document.getElementById('url-error');
    const preview = document.getElementById('qr-preview');
    const btnGenerate = document.getElementById('btn-generate');
    const btnDownload = document.getElementById('btn-download');
    const btnClear = document.getElementById('btn-clear');

    let lastQRBlobUrl = null; // para liberar URL cuando regeneramos
    let lastQRDirectUrl = null; // URL directa del servicio (fallback para descargar)

    function isValidUrl(value){
        try{
        const u = new URL(value);
        return u.protocol === 'http:' || u.protocol === 'https:';
        }catch(e){
        return false;
        }
    }

    function setBusy(state){
        preview.setAttribute('aria-busy', String(state));
        btnGenerate.disabled = state;
        btnDownload.disabled = true;
    }

    function clearPreview(){
        if(lastQRBlobUrl){
        URL.revokeObjectURL(lastQRBlobUrl);
        lastQRBlobUrl = null;
        }
        preview.innerHTML = '';
        btnDownload.disabled = true;
    }

    function buildQRUrl(data, size, margin, ecc){
        const base = 'https://api.qrserver.com/v1/create-qr-code/';
        const params = new URLSearchParams({
        data,
        size: `${size}x${size}`,
        margin: String(margin),
        ecc
        });
        return `${base}?${params.toString()}`;
    }

    function suggestFileName(input){
        try{
        const u = new URL(input);
        const host = u.hostname.replace(/^www\./,'');
        const path = u.pathname.replace(/\/+$/,'').split('/').filter(Boolean).pop();
        const cleanPath = path ? `-${path}` : '';
        return `qr-${host}${cleanPath}.png`.toLowerCase().replace(/[^a-z0-9.-]+/g,'-');
        }catch{ return 'qr-code.png'; }
    }

    async function generateQR(evt){
        evt.preventDefault();
        const value = inputUrl.value.trim();

        // Validación básica
        if(!isValidUrl(value)){
        errorEl.textContent = 'Ingresa un enlace válido que comience con http:// o https://';
        inputUrl.focus();
        return;
        }
        errorEl.textContent = '';

        const size = Number(sizeSel.value) || 256;
        const margin = Number(marginInput.value) || 2;
        const level = levelSel.value || 'M';

        // Construye URL del servicio
        const directUrl = buildQRUrl(value, size, margin, level);
        lastQRDirectUrl = directUrl;

        // Limpia previa
        clearPreview();
        setBusy(true);

        // Muestra vista previa mientras descargamos blob para habilitar descarga
        const img = document.createElement('img');
        img.alt = 'Código QR generado';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = directUrl;
        preview.appendChild(img);

        // Intenta obtener blob para descarga directa (con nombre)
        try{
        const res = await fetch(directUrl, { mode: 'cors', cache: 'no-store' });
        if(!res.ok) throw new Error('Error al generar el QR');
        const blob = await res.blob();
        if(lastQRBlobUrl) URL.revokeObjectURL(lastQRBlobUrl);
        lastQRBlobUrl = URL.createObjectURL(blob);
        btnDownload.disabled = false;
        btnDownload.dataset.filename = suggestFileName(value);
        }catch(err){
        // Si falla CORS, aún mostramos la imagen y dejamos un fallback
        console.warn('Fallo al obtener blob; se usará descarga alternativa:', err);
        btnDownload.disabled = false; // permitimos abrir en nueva pestaña
        btnDownload.dataset.fallback = '1';
        btnDownload.dataset.filename = suggestFileName(value);
        }finally{
        setBusy(false);
        }
    }

    async function handleDownload(){
        if(btnDownload.dataset.fallback === '1' || !lastQRBlobUrl){
        // Fallback: abrir la imagen en otra pestaña (usuario puede guardar como PNG)
        window.open(lastQRDirectUrl, '_blank');
        return;
        }
        const a = document.createElement('a');
        a.href = lastQRBlobUrl;
        a.download = btnDownload.dataset.filename || 'qr-code.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function handleClear(){
        form.reset();
        errorEl.textContent = '';
        clearPreview();
        inputUrl.focus();
    }

    // Eventos
    form.addEventListener('submit', generateQR);
    btnDownload.addEventListener('click', handleDownload);
    btnClear.addEventListener('click', handleClear);

    // Accesibilidad: limpiar mensaje de error al teclear
    inputUrl.addEventListener('input', () => { errorEl.textContent = ''; });
})();
