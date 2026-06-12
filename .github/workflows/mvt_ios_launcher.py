import multiprocessing

if __name__ == "__main__":
    # CRÍTICO en Windows: cuando PyInstaller empaqueta una app que usa
    # `multiprocessing`, los procesos worker se crean relanzando el propio
    # .exe con argumentos especiales (p.ej. `--multiprocessing-fork <handle>`).
    # `freeze_support()` intercepta esa invocación, ejecuta la lógica del
    # worker y termina, ANTES de que Click vea sys.argv. Sin esto, Click
    # falla con `No such option: --multiprocessing-fork` y los workers se
    # acumulan como procesos huérfanos. No-op en macOS/Linux.
    multiprocessing.freeze_support()

    from mvt.ios.cli import cli

    cli()
