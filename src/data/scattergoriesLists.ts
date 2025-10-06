// Listas de categorías para Scattergories (originales traducidas al español)

export interface ScattergoriesList {
  id: number;
  name: string;
  categories: string[];
}

export interface ScattergoriesVersion {
  id: string;
  name: string;
  lists: ScattergoriesList[];
}

// VERSIÓN ORIGINAL 1988
const ORIGINAL_1988: ScattergoriesList[] = [
  {
    id: 1,
    name: "Lista 1",
    categories: [
      "Nombre de chico",
      "Ciudades de España",
      "Cosas que están frías",
      "Material escolar",
      "Equipos deportivos profesionales",
      "Insectos",
      "Comidas de desayuno",
      "Muebles",
      "Programas de TV",
      "Cosas encontradas en el océano",
      "Presidentes",
      "Nombres de productos"
    ]
  },
  {
    id: 2,
    name: "Lista 2",
    categories: [
      "Verduras",
      "Provincias",
      "Cosas que tiras a la basura",
      "Ocupaciones",
      "Electrodomésticos",
      "Personajes de dibujos animados",
      "Tipos de bebida",
      "Grupos musicales",
      "Nombres de tiendas",
      "Cosas en un partido de fútbol",
      "Árboles",
      "Rasgos de personalidad"
    ]
  },
  {
    id: 3,
    name: "Lista 3",
    categories: [
      "Prendas de vestir",
      "Postres",
      "Partes de un coche",
      "Cosas encontradas en un mapa",
      "Atletas",
      "Palabras de 4 letras",
      "Cosas en una nevera",
      "Animales de granja",
      "Nombres de calles",
      "Cosas en la playa",
      "Colores",
      "Herramientas"
    ]
  },
  {
    id: 4,
    name: "Lista 4",
    categories: [
      "Deportes",
      "Títulos de canciones",
      "Partes del cuerpo",
      "Comidas étnicas",
      "Cosas que gritas",
      "Pájaros",
      "Nombre de chica",
      "Formas de ir de aquí a allá",
      "Cosas en una cocina",
      "Villanos / monstruos",
      "Flores",
      "Cosas que reemplazas"
    ]
  },
  {
    id: 5,
    name: "Lista 5",
    categories: [
      "Sándwiches",
      "Cosas en un catálogo",
      "Líderes mundiales / políticos",
      "Asignaturas escolares",
      "Excusas para llegar tarde",
      "Sabores de helado",
      "Cosas que saltan / rebotan",
      "Estrellas de televisión",
      "Cosas en un parque",
      "Ciudades extranjeras",
      "Piedras / gemas",
      "Instrumentos musicales"
    ]
  },
  {
    id: 6,
    name: "Lista 6",
    categories: [
      "Cosas que son pegajosas",
      "Premios / ceremonias",
      "Coches",
      "Especias / hierbas",
      "Malos hábitos",
      "Cosméticos / artículos de tocador",
      "Celebridades",
      "Utensilios de cocina",
      "Reptiles / anfibios",
      "Parques",
      "Actividades de ocio",
      "Cosas a las que eres alérgico"
    ]
  },
  {
    id: 7,
    name: "Lista 7",
    categories: [
      "Personajes ficticios",
      "Platos del menú",
      "Revistas",
      "Capitales",
      "Tipos de caramelos",
      "Cosas para las que ahorras",
      "Calzado",
      "Algo que mantienes oculto",
      "Cosas en una maleta",
      "Cosas con cola",
      "Equipamiento deportivo",
      "Crímenes"
    ]
  },
  {
    id: 8,
    name: "Lista 8",
    categories: [
      "Apodos",
      "Cosas en el cielo",
      "Ingredientes de pizza",
      "Universidades",
      "Peces",
      "Países",
      "Cosas que tienen manchas",
      "Figuras históricas",
      "Algo que te da miedo",
      "Unidades de medida",
      "Cosas en esta habitación",
      "Títulos de libros"
    ]
  },
  {
    id: 9,
    name: "Lista 9",
    categories: [
      "Restaurantes",
      "Gente famosa (negativa)",
      "Frutas",
      "Cosas en un botiquín",
      "Juguetes",
      "Tareas domésticas",
      "Masas de agua",
      "Autores",
      "Disfraces de Halloween",
      "Armas",
      "Cosas que son redondas",
      "Palabras asociadas con ejercicio"
    ]
  },
  {
    id: 10,
    name: "Lista 10",
    categories: [
      "Héroes",
      "Regalos / presentes",
      "Términos cariñosos",
      "Tipos de bailes",
      "Cosas que son negras",
      "Vehículos",
      "Lugares tropicales",
      "Carreras universitarias",
      "Productos lácteos",
      "Cosas en una tienda de souvenirs",
      "Cosas en tu bolso / cartera",
      "Récords mundiales"
    ]
  },
  {
    id: 11,
    name: "Lista 11",
    categories: [
      "Comida para bebés",
      "Dúos y tríos famosos",
      "Cosas encontradas en un escritorio",
      "Lugares de vacaciones",
      "Enfermedades",
      "Palabras asociadas con dinero",
      "Cosas en una máquina expendedora",
      "Títulos de películas",
      "Juegos",
      "Cosas que llevas puestas",
      "Cervezas",
      "Cosas en un circo"
    ]
  },
  {
    id: 12,
    name: "Lista 12",
    categories: [
      "Mujeres famosas",
      "Medicina / drogas",
      "Cosas hechas de metal",
      "Aficiones",
      "Gente en uniforme",
      "Cosas que enchufas",
      "Animales",
      "Idiomas",
      "Nombres bíblicos",
      "Comida basura",
      "Cosas que crecen",
      "Empresas"
    ]
  }
];

// EDICIÓN 2003
const EDITION_2003: ScattergoriesList[] = [
  {
    id: 13,
    name: "Lista 13",
    categories: [
      "Cosas en un picnic",
      "Cosas que son suaves",
      "Cosas en una película de ciencia ficción",
      "Cosas en la Casa Blanca",
      "Cosas con las que juegan los niños",
      "Cosas en una boda",
      "Lugares calientes",
      "Cosas en el espacio exterior",
      "Encontrado en una residencia universitaria",
      "Cosas en un restaurante",
      "Cantantes famosos",
      "Cosas en un parque de atracciones"
    ]
  },
  {
    id: 14,
    name: "Lista 14",
    categories: [
      "Llevado por encima de la cintura",
      "Cosas que son brillantes",
      "Cosas que tienen números",
      "Encontrado en un gimnasio",
      "Cosas en un safari",
      "Formas de decir hola y adiós",
      "Cosas de los años sesenta",
      "Cosas navideñas",
      "Cosas en una oficina",
      "Cosas en pares o conjuntos",
      "Cosas en una autopista",
      "Cosas en Las Vegas"
    ]
  },
  {
    id: 15,
    name: "Lista 15",
    categories: [
      "Cosas en un zoo",
      "Cosas con motores",
      "Cosas que vuelan",
      "Encontrado en una barra de ensaladas",
      "Palabras que terminan en 'mente'",
      "Cosas en una excursión",
      "Cosas en un hotel",
      "Comidas saludables",
      "Encontrado en un aula",
      "Cosas de fiesta",
      "Razones para faltar al trabajo",
      "Títulos que tiene la gente"
    ]
  },
  {
    id: 16,
    name: "Lista 16",
    categories: [
      "Cosas en un desierto",
      "Cosas en una novela de misterio",
      "Jerga de ordenadores",
      "Cosas ruidosas",
      "Tipos de sopas / guisos",
      "Términos matemáticos",
      "Cosas subterráneas",
      "Cosas del Salvaje Oeste",
      "Cosas en un aeropuerto",
      "Palabras con letras dobles",
      "Encontrado en Nueva York",
      "Cosas en cuentos de hadas"
    ]
  }
];

// REFILL #1
const REFILL_1: ScattergoriesList[] = [
  {
    id: 17,
    name: "Animales",
    categories: [
      "De TV, películas y libros",
      "Animales peligrosos",
      "Animales que nadan",
      "Criaturas de cuatro patas",
      "Cosas que comen los animales",
      "Mascotas",
      "Animales encontrados en tierras extranjeras",
      "Ruidos de animales",
      "En el zoo",
      "Mascotas",
      "Animales que anuncian productos",
      "Animales que vuelan"
    ]
  },
  {
    id: 18,
    name: "Gente famosa",
    categories: [
      "Estrellas de cine (vivas)",
      "Estrellas de cine (fallecidas)",
      "Figuras políticas",
      "Personalidades deportivas",
      "Símbolos sexuales",
      "Presentadores / periodistas",
      "Cantantes",
      "Artistas",
      "Celebridades que te gustaría conocer",
      "Niños",
      "Estrellas que aparecen en TV y películas",
      "Líderes militares"
    ]
  },
  {
    id: 19,
    name: "Los cinco sentidos",
    categories: [
      "Cosas que huelen mal",
      "Cosas que no puedes ver",
      "Cosas que no quieres oír",
      "Cosas que se sienten suaves",
      "Cosas que saben picantes",
      "Cosas que huelen bien",
      "Cosas que son rojas",
      "Cosas que nunca has probado",
      "Cosas que son ruidosas",
      "Cosas que no deberías tocar",
      "Cosas que ves en una ciudad",
      "Cosas que se sienten calientes"
    ]
  },
  {
    id: 20,
    name: "Comida y bebida",
    categories: [
      "Productos agrícolas",
      "Cócteles",
      "Mariscos",
      "Alimentos bajos en calorías",
      "Comida encontrada en una delicatessen",
      "Cereales de desayuno",
      "Cualquier comida o bebida verde",
      "Refrescos",
      "Cosas asquerosas para comer o beber",
      "Aperitivos",
      "Alimentos fritos",
      "En una lista de vinos"
    ]
  },
  {
    id: 21,
    name: "Tipos de comida",
    categories: [
      "Comida italiana",
      "Comida rápida",
      "Tipos de sopa",
      "Snacks",
      "Comida que comes cruda",
      "Comida encontrada en una cazuela",
      "Comida en un carnaval o feria",
      "Comida saludable",
      "Comida enlatada",
      "Comida china",
      "Encontrado en una barra de ensaladas",
      "Comida mexicana"
    ]
  },
  {
    id: 22,
    name: "Gente",
    categories: [
      "Gente que admiras",
      "Apellidos",
      "Gente que hace trabajos peligrosos",
      "Parejas",
      "Gente que va de puerta en puerta",
      "Nacionalidades",
      "Gente que trabaja de noche",
      "Nombres de personas usados en canciones",
      "Gente que evitas",
      "Alguien de tu pasado",
      "Títulos que tiene la gente",
      "Gente que trabaja sola"
    ]
  },
  {
    id: 23,
    name: "Lugares",
    categories: [
      "En Europa",
      "Lugares de luna de miel",
      "Climas fríos",
      "Lugares donde no querrías vivir",
      "Islas",
      "En América del Norte",
      "En tu ciudad natal",
      "Con gran altitud",
      "No en el planeta Tierra",
      "En la revista National Geographic",
      "Lugares ficticios",
      "Climas cálidos"
    ]
  },
  {
    id: 24,
    name: "Popurrí",
    categories: [
      "Cosas encontradas en el agua",
      "Regalos para novios",
      "Atracciones turísticas",
      "Razones para llamar al 112",
      "Cosas que llevas",
      "Cosas de una papelería",
      "Razones para dejar tu trabajo",
      "Cosas que se llevan de cintura para arriba",
      "Cosas que son blancas",
      "Cosas encontradas en un sótano",
      "Cosas con rayas",
      "Cosas para las que necesitas entradas"
    ]
  },
  {
    id: 25,
    name: "Días escolares",
    categories: [
      "Términos matemáticos",
      "Cosas que haces en sala de estudio",
      "Cosas encontradas en una taquilla",
      "Cosas que estudias en historia",
      "Términos científicos",
      "Actividades extraescolares",
      "Razones para ir a dirección",
      "Razones para estar ausente",
      "Cosas en un aula",
      "Cosas que estudias en geografía",
      "Cosas que haces en clase de gimnasia",
      "Encontrado en la cafetería"
    ]
  },
  {
    id: 26,
    name: "Deportes",
    categories: [
      "Nombres de equipos",
      "Jugados en interior",
      "Jugados al aire libre",
      "Libros, películas o programas de TV sobre deportes",
      "Términos deportivos",
      "Atletas femeninas",
      "Eventos deportivos",
      "Nombre de un jugador de fútbol",
      "Nombre de un jugador de baloncesto",
      "Cosas que gritas a los árbitros",
      "Eventos olímpicos",
      "Atletas que hacen anuncios"
    ]
  },
  {
    id: 27,
    name: "Televisión",
    categories: [
      "Programas de TV cancelados",
      "Películas en TV",
      "Programas de TV infantiles",
      "Programas de comedia",
      "Series de TV de larga duración",
      "Programas que no te gustan",
      "Cosas vendidas en anuncios",
      "Nombres de personajes de TV",
      "Estrellas femeninas",
      "Estrellas masculinas",
      "Cosas que haces mientras ves TV",
      "Programas de TV diurnos"
    ]
  },
  {
    id: 28,
    name: "Palabras",
    categories: [
      "Palabras que terminan en 'mente'",
      "Sustantivos",
      "Verbos de acción",
      "Abreviaturas",
      "Palabras extranjeras",
      "Palabras de 5 letras",
      "Palabras que terminan en 'ando'",
      "Palabras con letra doble",
      "Palabras dichas con ira",
      "Adjetivos",
      "Palabras que terminan en 'ado'",
      "Palabras de 3 letras"
    ]
  }
];

// SCATTERGORIES JUNIOR
const JUNIOR: ScattergoriesList[] = [
  {
    id: 29,
    name: "Junior 1: Diversión navideña",
    categories: [
      "Cosas de Navidad",
      "Cosas de vacaciones de verano",
      "Cosas de vacaciones de invierno",
      "Cosas de Halloween",
      "Comida o bebida navideña",
      "Cosas de San Valentín"
    ]
  },
  {
    id: 30,
    name: "Junior 2: Comida y bebida",
    categories: [
      "Cosas en una pelea de comida",
      "Cosas que comes o bebes en el almuerzo",
      "Cosas en una hamburguesa",
      "Cosas asquerosas para comer o beber",
      "Cosas ricas que mamá no quiere que comas",
      "Cosas que comes con los dedos"
    ]
  },
  {
    id: 31,
    name: "Junior 3: Animales",
    categories: [
      "Animales salvajes",
      "Cosas que das de comer a tu mascota",
      "Nombres para un perro o gato",
      "Animales que son malas mascotas",
      "Animales que vuelan o nadan",
      "Animales de peluche"
    ]
  },
  {
    id: 32,
    name: "Junior 4: En la escuela",
    categories: [
      "Cosas que haces en el recreo",
      "Razones por las que no hiciste los deberes",
      "Nombre de un compañero de clase",
      "Excusas para salir del aula",
      "Algo que estudias",
      "Lugares para ir en excursiones"
    ]
  },
  {
    id: 33,
    name: "Junior 5: Diversión de fin de semana",
    categories: [
      "Cosas de picnic",
      "Cosas que llevas el fin de semana",
      "Películas",
      "Cosas en un partido de béisbol",
      "Cosas en un parque de atracciones",
      "Cosas en el centro comercial"
    ]
  },
  {
    id: 34,
    name: "Junior 6: Tu ciudad",
    categories: [
      "Nombres de calles",
      "Cosas en una biblioteca",
      "Cosas en un parque de bomberos",
      "Gente en tu vecindario",
      "Lugares para comer",
      "Cosas en una comisaría"
    ]
  },
  {
    id: 35,
    name: "Junior 7: Después del colegio",
    categories: [
      "Actividades al aire libre",
      "Snacks después del colegio",
      "Programas de TV",
      "Juguetes o juegos",
      "Lugares después del colegio",
      "Tareas del hogar"
    ]
  },
  {
    id: 36,
    name: "Junior 8: Vacaciones",
    categories: [
      "Cosas que traes",
      "Lugares a los que te gustaría ir",
      "Cosas de las que tomas fotos",
      "Algo en la playa",
      "Cosas de campamento",
      "Visto desde la ventana del coche"
    ]
  },
  {
    id: 37,
    name: "Junior 9: Diversión con palabras",
    categories: [
      "Palabras cortas",
      "Palabras largas",
      "Palabras sobre dinero",
      "Palabras de acción",
      "Palabras sobre deportes",
      "Palabras sobre música"
    ]
  },
  {
    id: 38,
    name: "Junior 10: Todo sobre ti",
    categories: [
      "Una persona que te gusta",
      "Algo que odias hacer",
      "Algo que deseas",
      "Algo en lo que eres bueno",
      "Algo que es asqueroso",
      "Algo que te hace feliz"
    ]
  },
  {
    id: 39,
    name: "Junior 11: Variado A",
    categories: [
      "Cosas en un desfile",
      "Formas de ganar dinero",
      "Canciones o cantantes",
      "Formas de molestar a la niñera",
      "Algo que da miedo",
      "Algo en tu habitación"
    ]
  },
  {
    id: 40,
    name: "Junior 12: Variado B",
    categories: [
      "Alguien genial",
      "Cosas en una fiesta de cumpleaños",
      "Cosas que hacen ruido",
      "Cosas rápidas",
      "Cosas en una boda",
      "Lugares o cosas en un mapa"
    ]
  }
];

// REFILL #2
const REFILL_2: ScattergoriesList[] = [
  {
    id: 41,
    name: "Lista 19",
    categories: [
      "Cosas que vuelan",
      "Cosas que pican",
      "Países",
      "Bebidas",
      "Juegos de mesa",
      "Tipos de transporte",
      "Profesiones",
      "Cosas que encuentras en un museo",
      "Marcas de ropa",
      "Cosas de madera",
      "Palabras largas",
      "Cosas en una playa"
    ]
  },
  {
    id: 42,
    name: "Lista 20",
    categories: [
      "Cosas que huelen bien",
      "Tipos de edificios",
      "Frutas y verduras",
      "Cosas que compras en la farmacia",
      "Películas",
      "Deportes de exterior",
      "Instrumentos musicales",
      "Tipos de vehículos",
      "Programas de TV",
      "Cosas en el cielo",
      "Cosas frías",
      "Nombres de celebridades"
    ]
  },
  {
    id: 43,
    name: "Lista 21",
    categories: [
      "Juegos o juguetes",
      "Cosas que llevan pilas",
      "Países europeos",
      "Tipos de árboles",
      "Cosas que llevas a una fiesta",
      "Marcas de comida",
      "Profesiones médicas",
      "Cosas que se derriten",
      "Objetos en la oficina",
      "Cosas en un hospital",
      "Cosas de metal",
      "Animales de granja"
    ]
  },
  {
    id: 44,
    name: "Lista 22",
    categories: [
      "Ciudades famosas",
      "Tipos de zapatos",
      "Cosas que se pueden doblar",
      "Cosas que vuelan sin motor",
      "Marcas de coches",
      "Lugares fríos",
      "Cosas que brillan",
      "Tipos de instrumentos de cuerda",
      "Palabras compuestas",
      "Cosas que encuentras en la cocina",
      "Juegos de ordenador",
      "Cosas con ruedas"
    ]
  },
  {
    id: 45,
    name: "Lista 23",
    categories: [
      "Tipos de bebidas alcohólicas",
      "Cosas que se encuentran en el mar",
      "Marcas tecnológicas",
      "Cosas que se inflan",
      "Tipos de transporte público",
      "Cosas que hacen ruido",
      "Cosas que cortan",
      "Cosas que puedes coleccionar",
      "Partes de un coche",
      "Cosas que se usan en deportes",
      "Personajes de ficción",
      "Cosas que llevan números"
    ]
  },
  {
    id: 46,
    name: "Lista 24",
    categories: [
      "Cosas que se encuentran en el campo",
      "Partes de la casa",
      "Cosas que usan los niños",
      "Programas de TV infantiles",
      "Cosas que se mueven rápido",
      "Personajes históricos",
      "Cosas de cristal",
      "Cosas que llevan las mujeres en el bolso",
      "Cosas que puedes escuchar",
      "Palabras cortas",
      "Cosas que funcionan con electricidad",
      "Cosas que se encuentran en un restaurante"
    ]
  },
  {
    id: 47,
    name: "Lista 25",
    categories: [
      "Tipos de flores",
      "Cosas que vuelan de noche",
      "Cosas que se pueden leer",
      "Animales salvajes",
      "Cosas en el baño",
      "Cosas que se abren y cierran",
      "Palabras extranjeras comunes",
      "Cosas que se rompen fácilmente",
      "Tipos de pan",
      "Cosas que tienen teclas",
      "Cosas en la nevera",
      "Cosas que hacen cosquillas"
    ]
  },
  {
    id: 48,
    name: "Lista 26",
    categories: [
      "Cosas de plástico",
      "Tipos de postres",
      "Profesiones del espectáculo",
      "Cosas que se pintan",
      "Animales pequeños",
      "Lugares turísticos",
      "Cosas que se encuentran en un colegio",
      "Cosas que se tiran",
      "Cosas con botones",
      "Tipos de bebidas calientes",
      "Cosas que se enrollan",
      "Títulos de canciones"
    ]
  },
  {
    id: 49,
    name: "Lista 27",
    categories: [
      "Cosas que se encuentran en un aeropuerto",
      "Animales marinos",
      "Tipos de sombreros",
      "Cosas que se pueden escribir",
      "Personajes de dibujos animados",
      "Marcas deportivas",
      "Cosas que se encienden",
      "Profesiones de uniformes",
      "Cosas que se usan en la playa",
      "Tipos de baile",
      "Cosas que puedes comer crudas",
      "Cosas que tienen números"
    ]
  },
  {
    id: 50,
    name: "Lista 28",
    categories: [
      "Cosas que vuelan en verano",
      "Cosas que son redondas",
      "Tipos de peces",
      "Cosas que puedes tirar",
      "Cosas que llevan los hombres",
      "Cosas que se rompen",
      "Cosas que dan miedo",
      "Partes del cuerpo en plural",
      "Cosas que se abren con llave",
      "Cosas que encuentras en el supermercado",
      "Cosas que flotan",
      "Cosas que producen calor"
    ]
  },
  {
    id: 51,
    name: "Lista 29",
    categories: [
      "Tipos de dulces",
      "Cosas que encuentras en un hotel",
      "Palabras con doble letra",
      "Cosas que usan los estudiantes",
      "Cosas que vuelan sin alas",
      "Cosas que huelen mal",
      "Profesiones artísticas",
      "Cosas que puedes medir",
      "Cosas que se empujan",
      "Marcas famosas",
      "Cosas que llevan los bebés",
      "Cosas que se rompen en pedazos"
    ]
  },
  {
    id: 52,
    name: "Lista 30",
    categories: [
      "Cosas que se encuentran en el zoo",
      "Tipos de transporte en el agua",
      "Partes de la ciudad",
      "Cosas que son amarillas",
      "Nombres de actores/actrices",
      "Cosas que se apagan",
      "Cosas que se encuentran en un taller",
      "Marcas de cosméticos",
      "Cosas que se lanzan",
      "Cosas que llevan las personas en los bolsillos",
      "Tipos de bebidas sin alcohol",
      "Cosas que se mueven despacio"
    ]
  }
];

// TODAS LAS VERSIONES
export const SCATTERGORIES_VERSIONS: ScattergoriesVersion[] = [
  {
    id: 'original_1988',
    name: 'Original 1988',
    lists: ORIGINAL_1988
  },
  {
    id: 'edition_2003',
    name: 'Edición 2003',
    lists: EDITION_2003
  },
  {
    id: 'refill_1',
    name: 'Refill #1',
    lists: REFILL_1
  },
  {
    id: 'junior',
    name: 'Junior',
    lists: JUNIOR
  },
  {
    id: 'refill_2',
    name: 'Refill #2',
    lists: REFILL_2
  }
];

// Letras válidas para el juego (excluyendo las difíciles en español)
export const VALID_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 
  'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V'
];

// Función para obtener una letra aleatoria basada en la configuración del usuario
export const getRandomLetter = (availableLetters?: string[]): string => {
  const lettersToUse = availableLetters && availableLetters.length > 0 
    ? availableLetters 
    : VALID_LETTERS;
    
  const randomIndex = Math.floor(Math.random() * lettersToUse.length);
  return lettersToUse[randomIndex];
};

// Función para obtener todas las categorías de todas las versiones
export const getAllCategories = (): string[] => {
  const allCategories: string[] = [];
  SCATTERGORIES_VERSIONS.forEach(version => {
    version.lists.forEach(list => {
      allCategories.push(...list.categories);
    });
  });
  return [...new Set(allCategories)];
};

// Función para generar una lista aleatoria con 12 categorías únicas
export const generateRandomList = (): ScattergoriesList => {
  const allCategories = getAllCategories();
  const shuffled = [...allCategories].sort(() => Math.random() - 0.5);
  const selectedCategories = shuffled.slice(0, 12);
  
  return {
    id: 999,
    name: "Lista Aleatoria",
    categories: selectedCategories
  };
};

// Función para obtener una lista por ID de una versión específica
export const getListById = (versionId: string, listId: number): ScattergoriesList | undefined => {
  const version = SCATTERGORIES_VERSIONS.find(v => v.id === versionId);
  if (!version) return undefined;
  return version.lists.find(list => list.id === listId);
};

// Función para obtener una versión por ID
export const getVersionById = (versionId: string): ScattergoriesVersion | undefined => {
  return SCATTERGORIES_VERSIONS.find(v => v.id === versionId);
};