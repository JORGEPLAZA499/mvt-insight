import multiprocessing
import os
import sys
from pathlib import Path


def _ensure_cache_dirs() -> None:
    """Garantiza una carpeta de caché escribible para MVT/tldextract.

    Sin esto, tldextract (dependencia transitiva de mvt-ios) intenta usar
    una ruta dentro del bundle de PyInstaller o un perfil con nombres
    cortos tipo `C:\\Users\\GAMING~1\\AppData\\...` que no existe y emite:
        Failed fetching 'https://publicsuffix.org/list/public_suffix_list.dat'.
        Reason: [Errno 2] No such file or directory: '...'
    """
    if sys.platform.startswith("win"):
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        cache_root = Path(base) / "MvtInsight" / "mvt-ios-cache"
    elif sys.platform == "darwin":
        cache_root = Path.home() / "Library" / "Caches" / "MvtInsight" / "mvt-ios-cache"
    else:
        xdg = os.environ.get("XDG_CACHE_HOME") or str(Path.home() / ".cache")
        cache_root = Path(xdg) / "MvtInsight" / "mvt-ios-cache"

    tld_cache = cache_root / "tldextract"
    try:
        tld_cache.mkdir(parents=True, exist_ok=True)
    except Exception:
        # Última red de seguridad: usar /tmp o %TEMP%.
        import tempfile
        tld_cache = Path(tempfile.gettempdir()) / "mvt-ios-tldextract"
        tld_cache.mkdir(parents=True, exist_ok=True)
        cache_root = tld_cache.parent

    os.environ.setdefault("TLDEXTRACT_CACHE", str(tld_cache))
    os.environ.setdefault("XDG_CACHE_HOME", str(cache_root))


def _patch_tldextract() -> None:
    """Fuerza a tldextract a usar el snapshot embebido en el paquete.

    El binario PyInstaller no puede descargar ni escribir la Public Suffix
    List en runtime en entornos Windows con perfiles de nombre corto
    (`GAMING~1`) o sin permisos sobre la carpeta temporal. Eso provoca:
        Failed fetching 'https://publicsuffix.org/list/public_suffix_list.dat'
    y, en algunas versiones, rompe el análisis.

    Sustituimos el extractor por defecto por uno configurado con
    `suffix_list_urls=()` y `fallback_to_snapshot=True` para que use
    siempre el snapshot incluido en el paquete y nunca toque la red ni
    el disco para la PSL.
    """
    try:
        import tldextract  # type: ignore

        original_tld_extract = tldextract.TLDExtract
        offline_defaults = {
            "suffix_list_urls": (),
            "fallback_to_snapshot": True,
            "cache_dir": os.environ.get("TLDEXTRACT_CACHE"),
        }

        def _offline_kwargs(kwargs: dict) -> dict:
            merged = dict(kwargs)
            # Forzamos modo offline incluso si una dependencia crea nuevas
            # instancias de TLDExtract con los valores por defecto.
            merged["suffix_list_urls"] = ()
            merged["fallback_to_snapshot"] = True
            if os.environ.get("TLDEXTRACT_CACHE"):
                merged["cache_dir"] = os.environ["TLDEXTRACT_CACHE"]
            return {key: value for key, value in merged.items() if value is not None}

        def _build_extractor(*args, **kwargs):
            patched_kwargs = _offline_kwargs(kwargs)
            for _ in range(4):
                try:
                    return original_tld_extract(*args, **patched_kwargs)
                except TypeError as exc:
                    # Eliminar kwargs no soportados por esta versión y reintentar.
                    msg = str(exc)
                    removed = False
                    for key in list(patched_kwargs.keys()):
                        if key in msg:
                            patched_kwargs.pop(key, None)
                            removed = True
                    if not removed:
                        raise
            return original_tld_extract(*args, **patched_kwargs)

        extractor = _build_extractor(**offline_defaults)

        # Precalienta el snapshot antes de importar MVT. Si PyInstaller no lo
        # incluyó, el fallo aparece aquí y no en mitad del análisis.
        try:
            extractor("https://example.com")
        except Exception:
            pass

        # Reemplaza la función y extractor por defecto ya existentes.
        try:
            tldextract.extract = extractor  # type: ignore[attr-defined]
        except Exception:
            pass
        try:
            tldextract.TLD_EXTRACTOR = extractor  # type: ignore[attr-defined]
        except Exception:
            pass

        # Reemplaza también el constructor para cubrir instancias futuras
        # creadas por MVT/iOSbackup después de importar sus módulos.
        try:
            tldextract.TLDExtract = _build_extractor  # type: ignore[assignment]
        except Exception:
            pass
    except Exception:
        # Si tldextract no está disponible o falla el parche, seguimos:
        # peor caso volvemos al comportamiento previo.
        pass





if __name__ == "__main__":
    # CRÍTICO en Windows: cuando PyInstaller empaqueta una app que usa
    # `multiprocessing`, los procesos worker se crean relanzando el propio
    # .exe con argumentos especiales (p.ej. `--multiprocessing-fork <handle>`).
    # `freeze_support()` intercepta esa invocación, ejecuta la lógica del
    # worker y termina, ANTES de que Click vea sys.argv. Sin esto, Click
    # falla con `No such option: --multiprocessing-fork` y los workers se
    # acumulan como procesos huérfanos. No-op en macOS/Linux.
    multiprocessing.freeze_support()

    # Debe ocurrir ANTES de importar mvt/tldextract para que la variable
    # TLDEXTRACT_CACHE sea respetada al construir el extractor por defecto.
    _ensure_cache_dirs()

    # Parchea tldextract para no depender de descargar la PSL en runtime.
    _patch_tldextract()

    from mvt.ios.cli import cli

    cli()
