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
- La cuadrícula pinta lotes de 36 tarjetas. Un centinela al final, observado con 600 px de margen inferior, pide el siguiente lote antes de llegar al fondo. Cada tarjeta solo carga su imagen (`loading="lazy"` y `decoding="async"`). La especie y la línea evolutiva se piden al abrir la ficha.
- Las imágenes son el arte oficial o el sprite frontal. La animación depende del tipo (fuego, agua, planta, eléctrico u otra).
- La barra `Capturados: N / total` se guarda en `localStorage` con la clave `pokemundo_caught`.
- El grito y la reacción del escenario solo ocurren al tocar o hacer clic sobre el Pokémon dentro de la ficha. Abrir la tarjeta no reproduce sonido. «Escuchar explicación» solo lee el texto en español.
- La cabecera es azul profundo y eléctrico, con acentos naranja en la pestaña activa, el botón de explicación y la barra de capturados.
- La cabecera muestra «¡Bienvenido, Aldo!».
- La X de la ficha y la de los popups del mapa miden 42×42 px, con fondo naranja, borde claro, aspa blanca gruesa y sombra. «Escuchar explicación», «Marcar capturado», «Radar Salvaje», «Ver ficha» y el selector de capa son más grandes, con borde grueso y un estado presionado marcado.
- Leaflet recalcula el tamaño al cambiar de pestaña, al redimensionar la ventana y si cambia el contenedor.

## Línea evolutiva

- La ficha muestra «Línea evolutiva» con mini-cards: arte oficial, número, nombre, marca «Actual» y ✓ si ese Pokémon está capturado.
- Al abrir la ficha se consulta PokéAPI (`pokemon-species` y después `evolution-chain`). La cadena queda en memoria, así que el resto de la familia no vuelve a pedirla.
- Mientras llega se muestra «Cargando evolución…». Si no evoluciona, el texto es «Este Pokémon no tiene evoluciones.» Si la red falla, hay un aviso breve.
- Tocar otra mini-card abre esa ficha en silencio. El grito sigue sonando solo al tocar la imagen grande del modal. «Escuchar explicación» lee únicamente la descripción en español.

## Mapa Mundial

- Capas sin claves privadas: Calles con el mapa de calles de Esri y Satélite con Esri World Imagery. Si un servidor falla, Calles pasa a OpenStreetMap y Satélite al segundo servidor de Esri.
- 59 avistamientos fijos repartidos por América, Europa, África, Asia y Oceanía.
- Cada marcador muestra la bandera (emoji regional), el código del país como respaldo, el nombre del país y un botón para abrir la ficha. Abrir la ficha no reproduce el grito.
- Radar Salvaje elige otro Pokémon y mueve un poco las coordenadas dentro de un país de la lista. El aviso superior y el popup repiten bandera, país y el botón de la ficha.

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
5. En Mapa Mundial cambia entre Calles y Satélite, abre un marcador y comprueba bandera, país y «Ver ficha» (sin grito). Pulsa Radar Salvaje y revisa el aviso superior.
6. Vuelve a Pokédex y regresa al mapa: el mapa ocupa todo el recuadro.
7. Abre Bulbasaur: la línea muestra tres etapas y «Actual» en la primera. Toca Ivysaur: cambia la ficha sin grito. Abre Kyogre: aparece el aviso de que no tiene evoluciones.
8. En la Pokédex baja con el scroll: los siguientes Pokémon aparecen antes de tocar el fondo. Abrir uno sigue en silencio y el grito solo suena al tocar su imagen.
9. La X de la ficha se ve grande y naranja. En el mapa, la X del popup, Radar Salvaje y el selector de capa también se distinguen al tocarlos.
