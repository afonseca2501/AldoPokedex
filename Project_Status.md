# PokéMundo Dex

Estado: base modular lista para seguir agregando funciones.

## Árbol

```text
AldoPokedex/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js       # pestañas y arranque
│   ├── pokedex.js    # catálogo, búsqueda, filtros, capturas y ficha
│   ├── audio.js      # grito del Pokémon y lectura en español, separados
│   └── map.js        # mapa Leaflet, capas, hábitats y radar
├── Project_Status.md
└── .cursorrules
```

## Comportamiento que se conserva

- Los seis Pokémon clave aparecen al instante. El catálogo completo de PokéAPI entra en páginas de 100, con respaldo local si la red falla.
- Las imágenes son el arte oficial o el sprite frontal. La animación depende del tipo (fuego, agua, planta, eléctrico u otra).
- La barra `Capturados: N / total` se guarda en `localStorage` con la clave `pokemundo_caught`.
- El grito y la reacción del escenario solo ocurren al tocar o hacer clic sobre el Pokémon dentro de la ficha. Abrir la tarjeta no reproduce sonido. «Escuchar explicación» solo lee el texto en español.
- La cabecera es azul profundo y eléctrico, con acentos naranja en la pestaña activa, el botón de explicación y la barra de capturados.
- La cabecera muestra «¡Bienvenido, Aldo!».
- Leaflet recalcula el tamaño al cambiar de pestaña, al redimensionar la ventana y si cambia el contenedor.

## Mapa Mundial

- Selector de capa: Mapa estándar (OpenStreetMap) o Satélite (Esri).
- Hábitats en varios continentes y océanos. Cada marcador abre la ficha.
- Radar Salvaje coloca un Pokémon al azar en el mapa.

## Arrancar en local

Hay que usar un servidor. Los módulos no cargan si se abre el archivo directo.

```bash
cd ~/Desktop/AldoPokedex
python3 -m http.server 8765
```

Abre http://127.0.0.1:8765/

## Qué probar primero

1. Los seis clave salen al momento y luego el texto pasa a «Catálogo completo».
2. Abre un Pokémon desde la lista: la ficha aparece en silencio. Toca la imagen y entonces suena el grito. «Escuchar explicación» solo lee en español.
3. Confirma el encabezado azul, el texto «¡Bienvenido, Aldo!» y la barra de capturados en naranja.
4. Marca capturado y recarga: la barra y la marca siguen ahí.
5. En Mapa Mundial cambia entre Satélite y Mapa estándar, abre un hábitat y pulsa Radar Salvaje.
6. Vuelve a Pokédex y regresa al mapa: el mapa ocupa todo el recuadro.
