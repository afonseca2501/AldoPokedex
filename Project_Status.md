# PokéMundo Dex

Estado: base modular lista para seguir agregando funciones.

## Árbol

```text
AldoPokedex/
├── index.html
├── manifest.json     # app instalable, ventana sin barra del navegador
├── sw.js             # no guarda copias viejas de la app
├── icons/            # íconos PNG de la Pokébola
├── image_aldo.webp
├── Aldo2.webp        # Aldo recortado, a la derecha de Mis Pokémon
├── css/
│   └── styles.css
├── js/
│   ├── main.js       # pestañas y arranque
│   ├── pokedex.js    # catálogo, búsqueda, filtros, capturas y ficha
│   ├── team.js       # colección, Pokémon principal y comida
│   ├── audio.js      # grito del Pokémon y lectura en español, separados
│   ├── welcome.js    # saludo de Aldo y precarga de sprites
│   └── map.js        # mapa Leaflet, capas, hábitats y radar
├── Project_Status.md
└── .cursorrules
```

## Comportamiento que se conserva

- Los seis Pokémon clave aparecen al instante. El catálogo completo de PokéAPI entra en páginas de 100, con respaldo local si la red falla.
- La cuadrícula pinta lotes de 36 tarjetas. Un centinela al final, observado con 600 px de margen inferior, pide el siguiente lote antes de llegar al fondo. Cada tarjeta solo carga su imagen (`loading="lazy"` y `decoding="async"`). La especie y la línea evolutiva se piden al abrir la ficha.
- La cuadrícula, el mapa y las mini-cartas usan el arte oficial o el sprite frontal, imágenes estables para que el scroll siga ligero. En la ficha grande se intenta primero el sprite animado (Showdown de PokéAPI, luego la versión animada de Blanco y Negro y, si hay nombre, el GIF de Pokémon Showdown). Si no existe, tarda más de 2,5 s o falla, se queda el arte oficial y después el sprite frontal, sin un icono de imagen rota.
- La barra se guarda en `localStorage` con la clave `pokemundo_caught`. La insignia de la cabecera muestra «¡Llevas N!», el porcentaje, `N / total` y una barra gruesa. Como está dentro de la cabecera fija, sigue visible al bajar por la Pokédex.
- La pestaña «Mis Pokémon» lista los capturados. El equipo de 3 se guarda en `pokemundo_team` (`slots` y `focus`). Si no existe, arranca con `pokemundo_partner` y completa los huecos con los capturados de número más bajo. Si se suelta uno, su espacio lo ocupa otro atrapado. En el bloque solo hay una fila de 3 columnas con esos Pokémon, sin un dibujo repetido debajo. Debajo van el nombre, los tipos, el Nivel, las barras y el menú, más `Aldo2.webp` a la derecha, sin cortarse (`calc(100dvh - 256px)`). Tocar otro espacio lo pone a comer, en silencio. El grito sale solo al tocar el dibujo del que ya come. La comida se arrastra con el dedo (`pointer` y `touch-action: none`): sigue el dedo, el destino se ilumina al acercarse y, si se suelta lejos, vuelve a su sitio. Un toque corto también alimenta. En Tu colección, «Sumar» llena un hueco, «Cambiar» reemplaza al que come si el equipo está lleno, «En equipo» y «Come ahora» solo cambian el foco. «Este» alimenta al enfocado; «El equipo» alimenta a los tres. El cuadro toma el color del tipo principal del que come y un segundo brillo de otro tipo del equipo; el texto sigue claro. Aldo se balancea unos segundos al abrir la pestaña y salta al comer, sin sonido. El menú sigue con Baya, Fruta, Verdura, Galleta, Snack, Jugo, Agua y Batido. Cada toque sube las barras, siempre en positivo, y guarda el nivel en `pokemundo_care`. «Ver ficha» abre la ficha en silencio. Si no hay capturas, hay botones a la Pokédex y al Mapa.
- En la ficha hay tres Pokébolas que giran: la clásica roja, la Super Ball azul y roja, y la Ultra Ball negra y amarilla. Al tocar una, esa bola queda abajo del escenario. Se arrastra hacia arriba o se pulsa «¡Lanzar!». Al chocar hay un destello, el Pokémon entra en la bola, la bola tiembla y sale «¡Atrapado!» con estrellas y un tono suave. Ese tono no es el grito ni la lectura en español. Recién entonces se guarda la captura, sube la barra y se marca la tarjeta. Si ya estaba atrapado, «Soltar» pregunta dentro de la ficha, con «Soltar» y «Cancelar». Al confirmar, el aviso dice que regresó a su hábitat, sin el cuadro del navegador ni un sonido extra.
- Los tipos usan sus colores clásicos en tarjetas, ficha y línea evolutiva. La ficha tiene «Escuchar» y el selector de Pokébolas. La X de la ficha se queda visible.
- El grito y un salto de reacción solo ocurren al tocar o hacer clic sobre el Pokémon dentro de la ficha. El archivo es el `.ogg` de PokeAPI/cries: primero `latest/{id}.ogg` y, si ese no existe o no se puede reproducir, `legacy/{id}.ogg`. Si faltan los dos, o el número no es válido, no suena nada y la ficha sigue usable. Abrir la tarjeta no reproduce sonido. «Escuchar» solo lee el texto en español y no lanza el grito.
- La cabecera es azul profundo y eléctrico, con acentos naranja en la pestaña activa, el botón de explicación y la barra de capturados.
- La cabecera muestra «¡Bienvenido, Aldo!».
- La X de la ficha y la de los popups del mapa miden 42×42 px, con fondo naranja, borde claro, aspa blanca gruesa y sombra. «Escuchar explicación», «Marcar capturado», «Radar Salvaje», «Ver ficha» y el selector de capa son más grandes, con borde grueso y un estado presionado marcado.
- La ficha mide como máximo `min(920px, 84vw)` de ancho y `min(640px, 82dvh)` de alto, sin scroll. Detrás hay un velo oscuro semitransparente, con un desenfoque leve, y la ficha lleva una sombra fuerte para flotar sobre la cuadrícula, que sigue viéndose. Desde 768 px, la columna izquierda va centrada en este orden: número naranja, nombre grande, Tipo, descripción, línea evolutiva y Débil contra. Debajo siguen «Escuchar» y las Pokébolas. A la derecha queda el escenario. En pantallas angostas el mismo orden de textos se mantiene y el escenario sigue visible en medio. La descripción se ve en dos líneas; el texto completo sigue en la ficha para «Escuchar».
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

## App instalable

- `manifest.json` se llama AldoPokedex, abre en `standalone` desde `/` y usa azul `#1d4ed8` con fondo `#0f172a`.
- Los íconos PNG están en `icons/`: 192, 512, una versión con margen para máscara y el de iOS.
- `sw.js` no guarda `index.html`, `css` ni `js`. PokéAPI, los mapas y el audio siguen yendo a la red.

## Arrancar en local

Hay que usar un servidor. Los módulos no cargan si se abre el archivo directo.

```bash
cd ~/Desktop/AldoPokedex
python3 -m http.server 8765
```

Abre http://127.0.0.1:8765/

En Chrome, con el sitio abierto, usa el icono de instalar de la barra de direcciones o el menú (Instalar página como app). La ventana queda sin pestañas ni dirección.

## Qué probar primero

1. Los seis clave salen al momento y luego el texto pasa a «Catálogo completo».
2. Abre un Pokémon desde la lista: la ficha aparece en silencio y, si existe, el dibujo grande pasa al sprite animado. Si no existe, se queda la imagen oficial. Toca la imagen: suena el grito (`latest` y, si ese `.ogg` falla, `legacy`) y el Pokémon da un salto. «Escuchar» solo lee en español, sin grito. Toca una de las tres Pokébolas, arrástrala hacia arriba o pulsa «¡Lanzar!». Al acertar aparece «¡Atrapado!» y «¡Llevas N!» suma uno.
3. Confirma el encabezado azul, el texto «¡Bienvenido, Aldo!» y la insignia de capturados. Baja por la lista: «¡Llevas N!» y la barra siguen arriba, sin tapar las tarjetas.
4. Abre «Mis Pokémon»: solo ves 3 Pokémon en una fila, sin otro dibujo repetido debajo. Arrastra una comida hasta el que está marcado: se ilumina, suben las barras y Aldo salta, sin grito. Si la sueltas lejos, la comida vuelve sola. Un toque corto en la comida también alimenta. El grito suena solo al tocar el dibujo del que ya come.
5. Marca capturado y recarga: la barra, la colección y el Pokémon principal siguen ahí.
6. En Mapa Mundial toca un marcador: el mapa se acerca, ese Pokémon crece, y ves bandera, país y «Ver ficha», sin grito. Si ya lo atrapaste, el marcador lleva una pokébola.
7. Vuelve a Pokédex y regresa al mapa: el mapa ocupa todo el recuadro.
8. Abre Bulbasaur: la línea muestra tres etapas y «Actual» en la primera. Toca Ivysaur: cambia la ficha sin grito. Abre Kyogre: aparece el aviso de que no tiene evoluciones.
9. En la Pokédex baja con el scroll: los siguientes Pokémon aparecen antes de tocar el fondo. Abrir uno sigue en silencio y el grito solo suena al tocar su imagen.
10. La X de la ficha se ve grande y naranja. En el mapa, la X del popup, Radar Salvaje y el selector de capa también se distinguen al tocarlos.
11. En una ventana ancha, la ficha es más pequeña que la pantalla. El fondo se oscurece un poco y la ficha flota con sombra, pero se sigue viendo la Pokédex. A la izquierda están el nombre, Tipo, Débil contra, la descripción y la evolución. A la derecha, el Pokémon. Las tres Pokébolas giran; al tocar una se puede lanzar. No hay scroll dentro de la ficha.
