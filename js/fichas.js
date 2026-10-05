/* LUBPOINT · Fichas de producto
   Lo que se ve al abrir "Ver producto" en la tienda. La clave es el código del producto
   en el sistema; las variantes (fragancias, modelos) comparten la ficha del producto.
     d   = bajada corta, debajo del título
     det = "Cómo es": los datos concretos
     con = "Va bien con": en qué situación o con qué otro producto se usa */
window.LUBPOINT_FICHAS = {
  // ---------------------------------------------------------------- Aceites
  "001": {
    d: "El clásico mineral 20W-50 para motores nafteros de uso diario.",
    det: ["Mineral multigrado 20W-50", "Motores nafteros de alto kilometraje", "Buena protección en climas cálidos", "Cambio según el manual del vehículo"],
    con: "Cambio de filtro de aceite y control de niveles."
  },
  "002": {
    d: "Mineral multigrado 15W-40, para nafteros y diésel livianos.",
    det: ["Mineral multigrado 15W-40", "Nafta y diésel liviano", "Arranque en frío más suave que un 20W-50", "Cambio según el manual del vehículo"],
    con: "Filtro de aceite y filtro de aire en el mismo service."
  },
  "003": {
    d: "Monogrado SAE 40 para motores antiguos o de trabajo pesado.",
    det: ["Monogrado SAE 40", "Motores antiguos y de uso exigente", "No recomendado para arranques en frío extremo", "Consultanos si no estás seguro"],
    con: "Motores que lo piden por manual. Consultanos antes."
  },
  "004": {
    d: "Multigrado 10W-40: fluye rápido en frío y aguanta el calor.",
    det: ["Multigrado 10W-40", "Autos nafteros de uso urbano", "Mejor arranque en frío", "Cambio según el manual del vehículo"],
    con: "Service completo: filtro de aceite, aire y habitáculo."
  },
  "005": {
    d: "Para motos 4 tiempos: motor, caja y embrague en el mismo circuito.",
    det: ["Motos 4T", "Apto para embrague húmedo", "Protege motor y caja", "Cambio más frecuente que en auto"],
    con: "Lubricante de cadena y filtro de nafta."
  },
  "006": {
    d: "Para motores 2 tiempos. Se mezcla con la nafta, por litro.",
    det: ["Motores 2T", "Se mezcla con la nafta", "Respetá la proporción del manual", "Venta por litro"],
    con: "Motos y maquinaria chica de 2 tiempos."
  },
  "007": {
    d: "Envase original YPF Elaion para motos 4 tiempos.",
    det: ["Envase original YPF", "Motos 4T", "Apto para embrague húmedo", "Marca de primera línea"],
    con: "Service de moto: aceite, filtro y cadena."
  },

  // ---------------------------------------------------------------- Líquidos y refrigerantes
  "100": {
    d: "Agua desmineralizada verde claro, por litro, para completar nivel.",
    det: ["1 litro", "Sin minerales: no genera incrustaciones", "Para completar nivel", "No reemplaza al refrigerante con aditivos"],
    con: "Controlar mangueras y tapa de radiador."
  },
  "101": {
    d: "Agua desmineralizada pura, la de completar radiador o batería.",
    det: ["1 litro", "Sin minerales ni aditivos", "Radiador y batería", "Para completar, no para reemplazar el refrigerante"],
    con: "Revisión de batería y nivel de refrigerante."
  },
  "102": {
    d: "Refrigerante verde listo para usar, bidón para cambio completo.",
    det: ["5 litros, listo para usar", "Con aditivos anticorrosivos", "Protege contra herrumbre y depósitos", "No mezclar colores distintos de refrigerante"],
    con: "Cambio completo de refrigerante en el taller."
  },
  "103": {
    d: "Refrigerante rosa de larga vida, bidón de 5 litros.",
    det: ["5 litros, listo para usar", "Aditivos de larga duración", "Para vehículos que piden refrigerante rosa", "No mezclar colores distintos de refrigerante"],
    con: "Vehículos que exigen refrigerante rosa de fábrica."
  },
  "104": {
    d: "Líquido de frenos de 350 cc: el tamaño para cambio completo.",
    det: ["350 cc", "Cambio y purgado del sistema", "Reemplazo cada 2 años o según manual", "No guardes el sobrante: absorbe humedad"],
    con: "Purgado de frenos y revisión de pastillas."
  },
  "105": {
    d: "Líquido de frenos de 180 cc, práctico para completar nivel.",
    det: ["180 cc", "Para completar nivel", "Reemplazo cada 2 años o según manual", "Cuidá la pintura: no lo derrames sobre la carrocería"],
    con: "Control de nivel en el service."
  },
  "106": {
    d: "Envase chico de 100 cc, para tener en la moto o el baúl.",
    det: ["100 cc", "Para emergencias y completar nivel", "Reemplazo cada 2 años o según manual", "Envase sellado: una vez abierto, usalo"],
    con: "Kit de emergencia del baúl."
  },
  "107": {
    d: "Infla y sella el neumático en el momento, para salir del paso.",
    det: ["300 g", "Sella pinchazos de hasta unos 4 mm", "Infla y sella en un solo paso", "Solución temporal: después pasá por el taller"],
    con: "Baúl del auto o mochila de la moto."
  },
  "108": {
    d: "Refrigerante verde claro con aditivos, bidón de 5 litros.",
    det: ["5 litros, listo para usar", "Con aditivos anticorrosivos", "Cambio completo de refrigerante", "No mezclar colores distintos de refrigerante"],
    con: "Cambio completo de refrigerante en el taller."
  },
  "109": {
    d: "Agua desmineralizada con aditivos, bidón de 5 litros.",
    det: ["5 litros", "Desmineralizada, con aditivos", "No deja incrustaciones", "Para cambio o relleno generoso"],
    con: "Relleno del circuito después de una reparación."
  },

  // ---------------------------------------------------------------- Limpieza y cuidado
  "149": {
    d: "Lubrica y protege bisagras, cerraduras, cables y guías.",
    det: ["235 cc en aerosol", "Resiste agua y humedad", "Bisagras, cerraduras, guías y cables", "No usar sobre cintas de freno"],
    con: "Mantenimiento general del auto y la moto."
  },
  "150": {
    d: "Penetra entre los eslabones y no sale volando al andar.",
    det: ["250 cc en aerosol", "Cadenas con y sin O-ring", "Aplicar con la cadena limpia y tibia", "Dejar actuar unos minutos antes de salir"],
    con: "Service de moto, junto con el cambio de aceite."
  },
  "151": {
    d: "Para esos días en que el motor se hace rogar.",
    det: ["400 cc en aerosol", "Ayuda en arranques difíciles", "Aplicar en la toma de aire, a chorros cortos", "Uso ocasional: no es una solución de fondo"],
    con: "Invierno, motores parados mucho tiempo."
  },
  "152": {
    d: "Retiene el polvo fino sin ahogar el paso de aire del filtro.",
    det: ["210 cc en aerosol", "Filtros de espuma", "Aplicar con el filtro limpio y seco", "Dejar secar antes de montar"],
    con: "Limpieza del filtro de aire de la moto."
  },
  "153": {
    d: "Lava sin atacar la pintura ni sacarle la cera.",
    det: ["500 cc, rinde varios lavados", "No daña la pintura ni el encerado", "Diluir en balde según envase", "Lavar a la sombra y con la chapa fría"],
    con: "Guante de microfibra y revitalizador de cubiertas."
  },
  "154": {
    d: "Espuma activa que levanta la mugre sin empapar la tela.",
    det: ["420 cc en aerosol", "Tapizados de tela y alfombras", "Aplicar, cepillar y retirar con paño", "Probar primero en una zona poco visible"],
    con: "Limpieza a fondo del interior."
  },
  "155": {
    d: "Devuelve el negro profundo y repele el polvo.",
    det: ["500 cc", "Cubiertas, alfombras y gomas", "Deja terminación satinada", "No aplicar sobre la banda de rodamiento"],
    con: "El toque final después de lavar el auto."
  },
  "156": {
    d: "Unos pocos disparos y el auto queda con olor a nuevo.",
    det: ["60 ml con atomizador", "Varias fragancias disponibles", "Aplicar sobre alfombras, no sobre tableros", "Rinde semanas con uso normal"],
    con: "Después de limpiar tapizados y alfombras."
  },
  "157": {
    d: "Limpia el tablero, da brillo parejo y deja perfume.",
    det: ["250 cc", "Tablero, molduras y plásticos interiores", "Varias fragancias disponibles", "No usar sobre el volante ni los pedales"],
    con: "Limpieza de interior, junto al aromatizante."
  },
  "158": {
    d: "Fragancias de larga duración en atomizador de 50 ml.",
    det: ["50 ml con atomizador", "Varias fragancias disponibles", "Aplicar sobre alfombras o filtro de cabina", "Concentrado: poca cantidad rinde mucho"],
    con: "Auto de trabajo o de uso diario."
  },
  "159": {
    d: "Para lavar o secar sin rayar la pintura.",
    det: ["Microfibra de alta densidad", "No raya la pintura", "Lavable y reutilizable", "Enjuagalo seguido mientras lavás"],
    con: "Shampoo para auto y lavalustre."
  },
  "160": {
    d: "Lava y encera en el mismo paso, para cuando hay poco tiempo.",
    det: ["500 cc", "Lava y da brillo a la vez", "Diluir en balde según envase", "Ideal para mantenimiento entre encerados"],
    con: "Guante de microfibra y revitalizador de cubiertas."
  },

  // ---------------------------------------------------------------- Accesorios
  "200": {
    d: "Mejora el agarre y tapa el volante gastado por el sol.",
    det: ["Ecocuero cosido", "Medida estándar", "Se coloca a presión, sin herramientas", "Mejora el agarre en verano"],
    con: "Autos con volante gastado o recalentado."
  },
  "201": {
    d: "Adhesivo instantáneo en gel: no chorrea ni se escapa.",
    det: ["Fórmula en gel, no chorrea", "Pega plástico, goma, metal y cerámica", "Fragua en segundos", "No apto para polietileno ni telgopor"],
    con: "Arreglos rápidos de molduras y plásticos."
  },
  "202": {
    d: "Manguera de combustible 6x9 mm, cortada a tu medida.",
    det: ["Medida 6x9 mm", "Venta por metro", "Apta para combustible", "Se corta en el momento"],
    con: "Filtro de nafta y abrazaderas."
  },
  "203": {
    d: "La medida fina, 3x6 mm, para motos y equipos chicos.",
    det: ["Medida 3x6 mm", "Venta por metro", "Motos y maquinaria chica", "Se corta en el momento"],
    con: "Filtro de nafta universal de moto."
  },
  "204": {
    d: "Luz de acento para el interior, el baúl o el motor.",
    det: ["Venta por unidad", "12V", "Autoadhesiva", "Consultá largo y color disponible"],
    con: "Tuneo de interior y luz de baúl."
  },
  "205": {
    d: "Cuida la pintura del tanque del roce de la campera y el cierre.",
    det: ["Resina con relieve", "Adhesivo de alta adherencia", "Varios diseños disponibles", "Colocar sobre la pintura limpia y seca"],
    con: "Motos nuevas, antes del primer rayón."
  },
  "206": {
    d: "El repuesto que conviene tener siempre en la guantera.",
    det: ["12V", "Luz de posición", "Repuesto universal", "Consultá el modelo exacto que lleva tu vehículo"],
    con: "Revisión de luces antes de viajar."
  },
  "207": {
    d: "Mucha más luz que un halógeno, con ventilación integrada.",
    det: ["Zócalo H4, alta y baja", "22.000 lúmenes", "Disipación por ventilador", "Verificá que tu vehículo acepte LED"],
    con: "Manejo nocturno y rutas sin iluminación."
  },
  "208": {
    d: "LED de vidrio para posición, en varios colores.",
    det: ["12V", "Varios colores", "Consumo mínimo", "Reemplazo directo del foco de vidrio"],
    con: "Cambio de luces de posición."
  },

  // ---------------------------------------------------------------- Neumáticos y cámaras
  "250": {
    d: "La medida más usada en la rueda trasera de las 110.",
    det: ["Medida 2.50-17", "Motos 110 cc", "Dibujo de calle", "Consultanos por la colocación"],
    con: "Cámara rodado 17 y colocación en el local."
  },
  "251": {
    d: "Un escalón más ancha que la 2.50, para motos de calle.",
    det: ["Medida 2.75-17", "Motos de calle", "Dibujo de calle", "Consultanos por la colocación"],
    con: "Cámara rodado 17 y colocación en el local."
  },
  "252": {
    d: "Medida típica de scooters y ciclomotores.",
    det: ["Medida 2.75-14", "Scooters y ciclomotores", "Dibujo de calle", "Consultanos por la colocación"],
    con: "Cámara rodado 14 y colocación en el local."
  },
  "253": {
    d: "Cámara de butilo para rodado 17, con válvula de goma.",
    det: ["Rodado 17", "Goma de butilo", "Válvula de goma", "Revisá la medida exacta de tu cubierta"],
    con: "Cambio de cubierta o reparación de pinchazo."
  },
  "254": {
    d: "La que llevan la mayoría de los scooters, rodado 14.",
    det: ["Rodado 14", "Goma de butilo", "Scooters y ciclomotores", "Revisá la medida exacta de tu cubierta"],
    con: "Cambio de cubierta de scooter."
  },
  "255": {
    d: "Cámara de butilo para rodado 18, con válvula de goma.",
    det: ["Rodado 18", "Goma de butilo", "Válvula de goma", "Revisá la medida exacta de tu cubierta"],
    con: "Cambio de cubierta o reparación de pinchazo."
  },

  // ---------------------------------------------------------------- Repuestos de motor
  "300": {
    d: "Saca el ruido metálico del arranque: tensa la cadena de distribución.",
    det: ["Motores 110 cc", "Tensor automático", "Se cambia junto con la cadena", "Colocación en el taller"],
    con: "Cadena de distribución y juego de juntas."
  },
  "301": {
    d: "Cable de acelerador completo, con funda y terminales.",
    det: ["Osaka / Smash 110", "Funda y terminales incluidos", "Largo original", "Colocación en el taller"],
    con: "Service de moto y ajuste de carburador."
  },
  "302": {
    d: "El repuesto de mantenimiento del freno de tambor.",
    det: ["Osaka 110", "Freno de tambor", "Juego completo", "Revisá también el resorte y la campana"],
    con: "Service de frenos de la moto."
  },
  "303": {
    d: "La pieza que manda la chispa a la bujía.",
    det: ["Smash / Titan 150", "Con cable y capuchón", "Repuesto directo", "Si la moto corta a alta vuelta, suele ser esto"],
    con: "Fallas de encendido y cortes a alta vuelta."
  },
  "304": {
    d: "Cambia la relación y el empuje de la moto.",
    det: ["Gilera Smash 125", "Centro grande", "Acero templado", "Se cambia junto con la cadena y la corona"],
    con: "Kit de transmisión: cadena, piñón y corona."
  },
  "305": {
    d: "Palanca de cambio con goma antideslizante.",
    det: ["Osaka 35 mm", "Modelo Wave", "Con goma antideslizante", "Montaje directo"],
    con: "Reemplazo después de una caída."
  },
  "306": {
    d: "Ordena la carga y evita que se queme el sistema eléctrico.",
    det: ["Motores 110 cc", "Sistema trifásico", "Protege la batería", "Si la batería hierve o no carga, revisalo"],
    con: "Batería nueva y revisión eléctrica."
  },
  "307": {
    d: "La unidad que maneja el encendido de la moto.",
    det: ["Conector de 5 pines", "Encendido electrónico", "Repuesto universal 110", "Verificá el conector antes de comprar"],
    con: "Diagnóstico de fallas de encendido."
  },
  "308": {
    d: "Tambor de contacto con llaves, juego completo.",
    det: ["Osaka / Gilera Smash 110", "Incluye llaves", "Juego completo", "Colocación en el taller"],
    con: "Pérdida de llaves o cerradura forzada."
  },
  "309": {
    d: "Todas las juntas que se cambian al abrir el motor.",
    det: ["Juego completo", "Motores 110 cc", "Se cambian siempre al abrir el motor", "Colocación en el taller"],
    con: "Rectificación o reparación de motor."
  },
  "310": {
    d: "Los sellos que evitan las pérdidas de aceite.",
    det: ["Motores 110 cc", "Juego de retenes", "Evitan pérdidas de aceite", "Cambiar con el motor abierto"],
    con: "Juego de juntas y reparación de motor."
  },
  "311": {
    d: "Cadena de distribución de 84 eslabones para motores 110.",
    det: ["25H · 84 eslabones", "Motores 110 cc", "Cambiar junto con el tensor", "Colocación en el taller"],
    con: "Tensor de distribución y juego de juntas."
  },
  "312": {
    d: "Juego de válvulas de admisión y escape para 110.",
    det: ["Motores 110 cc", "Admisión y escape", "Acero templado", "Requiere asentado en el taller"],
    con: "Rectificación de tapa de cilindro."
  },
  "313": {
    d: "Válvula individual para motores 150 varilleros.",
    det: ["Motores 150 varilleros", "Unidad", "Acero templado", "Requiere asentado en el taller"],
    con: "Rectificación de tapa de cilindro."
  },
  "314": {
    d: "Juego de válvulas para motores 150 cadeneros, tipo CG.",
    det: ["Motores 150 cadeneros", "Tipo CG / Titan", "Admisión y escape", "Requiere asentado en el taller"],
    con: "Rectificación de tapa de cilindro."
  },

  // ---------------------------------------------------------------- Rodamientos
  "350": {
    d: "Una de las medidas más usadas en ruedas y ejes de moto.",
    det: ["Medida 6203", "17 x 40 x 12 mm", "Sellado a ambos lados", "Se cambian de a pares"],
    con: "Cambio de cubierta o ruido en la rueda."
  },
  "351": {
    d: "Medida reforzada, para ejes que trabajan más exigidos.",
    det: ["Medida 6301", "12 x 37 x 12 mm", "Sellado a ambos lados", "Se cambian de a pares"],
    con: "Service de ruedas y ejes."
  },

  // ---------------------------------------------------------------- Accesorios moto
  "400": {
    d: "Par de espejos con rosca estándar, listos para montar.",
    det: ["Par completo", "Osaka 110", "Rosca estándar", "Verificá el sentido de rosca de tu moto"],
    con: "Reemplazo después de una caída."
  },
  "401": {
    d: "Tapa el asiento gastado y aguanta sol y lluvia.",
    det: ["Smash 110", "Material resistente al sol", "Se coloca con elástico", "Mejora el agarre al andar"],
    con: "Motos que duermen a la intemperie."
  },
  "402": {
    d: "Para que la campera y el cierre no marquen la pintura.",
    det: ["Motos 150 cc", "Adhesivo de alta adherencia", "Protege la pintura", "Colocar sobre superficie limpia y seca"],
    con: "Motos nuevas, antes del primer rayón."
  },
  "403": {
    d: "Transparente, para ver cuándo está sucio y cambiarlo a tiempo.",
    det: ["Universal para moto", "Cuerpo transparente", "Se monta en la manguera de nafta", "Cambiar cuando se ve sucio"],
    con: "Manguera de nafta 3x6 y service de moto."
  },
  "404": {
    d: "Cadena con funda de tela: ata la moto sin rayar la pintura.",
    det: ["Cadena con funda de tela", "La funda no raya la pintura", "Incluye candado", "Pasala por la rueda y un punto fijo"],
    con: "Estacionar en la calle o el trabajo."
  },
  "405": {
    d: "Liviana y flexible, cómoda de llevar todos los días.",
    det: ["Cable trenzado de acero", "Liviana y flexible", "Incluye candado", "Para paradas cortas"],
    con: "Paradas cortas y mandados."
  },
  "406": {
    d: "Con recubrimiento que cuida la pintura de la moto.",
    det: ["Acero con recubrimiento", "No raya la pintura", "Incluye candado", "Para paradas cortas"],
    con: "Paradas cortas y mandados."
  },
  "407": {
    d: "Batería 12V 5Ah lista para instalar en motos 110.",
    det: ["12V · 5Ah", "Motos 110 cc", "Lista para instalar", "Respetá la polaridad al conectarla"],
    con: "Revisión del regulador de carga."
  },
  "408": {
    d: "Se cambia junto con el piñón y la corona, siempre en juego.",
    det: ["Cadena de transmisión", "Se cambia con piñón y corona", "Consultá paso y cantidad de eslabones", "Lubricar seguido alarga su vida"],
    con: "Piñón, corona y lubricante de cadena."
  }
};
