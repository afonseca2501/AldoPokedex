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
- La cuadrícula, el mapa y las mini-cartas usan el arte oficial o el sprite frontal, imágenes estables para que el scroll siga ligero. En la ficha grande se intenta primero el sprite animado (Showdown de PokéAPI, luego la versión animada de Blanco y Negro y, si hay nombre, el GIF de Pokémon Showdown). Si no existe, tarda más de 2,5 s o falla, se queda el arte oficial y después el sprite frontal, sin un icono de imagen rota.
- La barra se guarda en `localStorage` con la clave `pokemundo_caught`. El texto principal es «¡Llevas N!» y el total fino queda al lado.
- Los tipos usan sus colores clásicos en tarjetas, ficha y línea evolutiva. Los botones de la ficha dicen «Escuchar» y «¡Atrapar!». La X de la ficha se queda visible al bajar.
- El grito y un salto de reacción solo ocurren al tocar o hacer clic sobre el Pokémon dentro de la ficha. Abrir la tarjeta no reproduce sonido. «Escuchar» solo lee el texto en español.
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
- Cada lugar usa la imagen del Pokémon (arte oficial, sprite si falla y una pokébola de respaldo) dentro de un recuadro azul y naranja de 56 px. Al tocarlo, el mapa se acerca y ese recuadro crece. Si ya está capturado, lleva una pokébola.
- El popup y el radar muestran la bandera grande, el código del país como respaldo, el nombre del país y un botón para abrir la ficha. Abrir la ficha no reproduce el grito.
- Radar Salvaje elige otro Pokémon, lo dibuja con su imagen y mueve un poco las coordenadas dentro de un país de la lista.

## Arrancar en local

Hay que usar un servidor. Los módulos no cargan si se abre el archivo directo.

```bash
cd ~/Desktop/AldoPokedex
python3 -m http.server 8765
```

Abre http://127.0.0.1:8765/

## Qué probar primero

1. Los seis clave salen al momento y luego el texto pasa a «Catálogo completo».
2. Abre un Pokémon desde la lista: la ficha aparece en silencio y, si existe, el dibujo grande pasa al sprite animado. Si no existe, se queda la imagen oficial. Toca la imagen: suena el grito y el Pokémon da un salto. «Escuchar» solo lee en español. «¡Atrapar!» suma uno a «¡Llevas N!».
3. Confirma el encabezado azul, el texto «¡Bienvenido, Aldo!» y la barra de capturados en naranja.
4. Marca capturado y recarga: la barra y la marca siguen ahí.
5. En Mapa Mundial toca un marcador: el mapa se acerca, ese Pokémon crece, y ves bandera, país y «Ver ficha», sin grito. Si ya lo atrapaste, el marcador lleva una pokébola.
6. Vuelve a Pokédex y regresa al mapa: el mapa ocupa todo el recuadro.
7. Abre Bulbasaur: la línea muestra tres etapas y «Actual» en la primera. Toca Ivysaur: cambia la ficha sin grito. Abre Kyogre: aparece el aviso de que no tiene evoluciones.
8. En la Pokédex baja con el scroll: los siguientes Pokémon aparecen antes de tocar el fondo. Abrir uno sigue en silencio y el grito solo suena al tocar su imagen.
9. La X de la ficha se ve grande y naranja. En el mapa, la X del popup, Radar Salvaje y el selector de capa también se distinguen al tocarlos.
