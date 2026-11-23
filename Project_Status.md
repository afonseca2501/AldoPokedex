# PokéMundo Dex

Estado: listo para probar en local.

## Estructura

- `index.html` — página, pestañas, buscador, mapa y ficha.
- `styles.css` — aspecto de la Pokédex, la barra de capturados y el mapa.
- `app.js` — catálogo, audio, capturas y Leaflet.
- Se retiró `gemini-code-1795408545716.html`; era el mismo archivo en un solo bloque.

## Comportamiento

- Al abrir se ven al instante Bulbasaur, Charmander, Squirtle, Pikachu, Kyogre y Avalugg.
- Después se pide el catálogo de PokéAPI en páginas de 100, hasta el total que devuelva la API (formas recientes incluidas). Las tarjetas se añaden por tandas para no congelar la pantalla.
- Las imágenes son PNG oficiales. Si faltan, se usa el sprite estático y, en último caso, una imagen local. No hay GIFs externos.
- El grito suena solo al abrir la ficha o al tocar el escenario del Pokémon.
- «Escuchar explicación» solo lee el texto en español (`es-ES`).
- La barra superior muestra capturados, total y porcentaje. Se guarda en `localStorage` (`pokemundo_caught`).
- El mapa se recalcula al cambiar de pestaña, al redimensionar la ventana y cuando cambia el tamaño del contenedor.

## Probar en local

```bash
cd ~/Desktop/AldoPokedex
python3 -m http.server 8765
```

Abre http://127.0.0.1:8765/

1. Comprueba que primero aparecen los seis Pokémon clave y el texto pasa a «Catálogo completo».
2. Abre uno: debe sonar el grito. «Escuchar explicación» solo lee la descripción en español. Tocar la imagen vuelve a sonar el grito.
3. Marca capturado y mira la barra `Capturados: N / total`.
4. Cambia a Mapa Mundial y vuelve a Pokédex: el mapa debe ocupar todo el recuadro, sin franja gris.
