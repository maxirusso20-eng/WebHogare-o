# 🚀 GUÍA: REACT + SUPABASE - LOGÍSTICA HOGARENA

## 📁 ESTRUCTURA DE CARPETAS RECOMENDADA

```
src/
├── App.jsx                    ← Componente principal (nuevo)
├── main.jsx                   ← Entry point (ya tienes)
├── index.css                  ← Estilos globales (nuevo)
├── supabase.js               ← Configuración Supabase (ya tienes)
│
├── hooks/
│   ├── useChoferes.js        ← Custom Hook para Choferes
│   ├── useColectas.js        ← Custom Hook para Colectas/Recorridos
│   └── useValidaciones.js    ← Validaciones y utilidades
│
├── components/
│   ├── PantallaRecorridos.jsx
│   ├── PantallaChoferes.jsx
│   ├── PantallaClientes.jsx
│   ├── Modal.jsx
│   └── Toast.jsx
│
└── context/
    └── AppContext.jsx         ← Estado global (creado en App.jsx)
```

---

## 📥 ARCHIVOS A DESCARGAR

Tienes **5 archivos** listos:

1. ✅ **App-React.jsx** → Renombra a `App.jsx`
2. ✅ **useChoferes.js** → Copia a `src/hooks/`
3. ✅ **useColectas.js** → Copia a `src/hooks/`
4. ✅ **useValidaciones.js** → Copia a `src/hooks/`
5. ✅ **index-React.css** → Renombra a `index.css`

---

## 📋 PASO A PASO DE IMPLEMENTACIÓN

### PASO 1: Actualizar `App.jsx`

```bash
1. Borra tu actual App.jsx
2. Descarga "App-React.jsx"
3. Renómbralo a "App.jsx"
4. Colócalo en src/
```

### PASO 2: Crear carpeta `hooks/`

```bash
1. Crea carpeta: src/hooks/
2. Copia useChoferes.js
3. Copia useColectas.js
4. Copia useValidaciones.js
```

### PASO 3: Actualizar `index.css`

```bash
1. Descarga "index-React.css"
2. Renómbralo a "index.css"
3. Reemplaza el actual
```

### PASO 4: Verificar `supabase.js`

Tu archivo actual está bien:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://caewphtmlhatimnsfubl.supabase.co';
const supabaseKey = 'sb_publishable_Mj-TG1nvq7D_Q-6PUOiOXA_LxeUuJIn';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## 🎯 CÓMO USAR LOS HOOKS EN TUS COMPONENTES

### Ejemplo 1: Usar `useChoferes` en un componente

```jsx
import { useChoferes } from '../hooks/useChoferes';

function MiComponente() {
  const {
    choferes,
    choferesFiltrados,
    loading,
    error,
    crearChofer,
    actualizarChofer,
    eliminarChofer,
    formatearTelefono,
  } = useChoferes();

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      {choferes.map(chofer => (
        <div key={chofer.id}>
          <h3>{chofer.nombre}</h3>
          <p>{formatearTelefono(chofer.tel)}</p>
          <button onClick={() => eliminarChofer(chofer.id)}>Eliminar</button>
        </div>
      ))}
    </div>
  );
}
```

### Ejemplo 2: Usar `useColectas`

```jsx
import { useColectas } from '../hooks/useColectas';

function MisColectas() {
  const {
    colectas,
    loading,
    marcarEntregado,
    getEstadisticas,
  } = useColectas();

  const stats = getEstadisticas();

  return (
    <div>
      <p>Total: {stats.total} | Entregadas: {stats.entregadas}</p>
      {colectas.map(colecta => (
        <div key={colecta.id}>
          <p>{colecta.estado}</p>
          <button onClick={() => marcarEntregado(colecta.id)}>
            Marcar Entregado
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Ejemplo 3: Usar validaciones y utilidades

```jsx
import { useValidaciones, Formateo, Fecha } from '../hooks/useValidaciones';

function MiForm() {
  const { validarChofer, errores } = useValidaciones();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const datos = {
      choferIdAt: '001',
      nombre: 'Juan',
      tel: '1145678900',
    };

    if (validarChofer(datos)) {
      // Guardar...
      console.log('✓ Válido');
    } else {
      console.log('❌ Errores:', errores);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="tel" />
      {/* Usar Formateo */}
      <p>{Formateo.telefono('1145678900')}</p>
      {/* Usar Fecha */}
      <p>Hoy es: {Fecha.hoy()}</p>
    </form>
  );
}
```

---

## 🔄 FLUJO DE DATOS

```
┌─────────────────────────────────────┐
│         Componente React            │
├─────────────────────────────────────┤
│  useChoferes()                      │
│  useColectas()                      │
│  useValidaciones()                  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│       Supabase (supabase.js)        │
│  from('Choferes')                   │
│  from('Recorridos')                 │
└────────────┬────────────────────────┘
             │
             ▼
        🌐 Base de Datos
```

---

## 📚 PRINCIPALES FUNCIONES DISPONIBLES

### `useChoferes()`
```javascript
{
  choferes,                    // Array de todos los choferes
  choferesFiltrados,          // Array filtrado
  loading,                    // boolean
  error,                      // string | null
  filtro,                     // { condicion, zona, search }
  setFiltro,                  // function
  cargarChoferes,             // async function
  crearChofer,                // async function(datos)
  actualizarChofer,           // async function(id, datos)
  eliminarChofer,             // async function(id)
  formatearTelefono,          // function(tel)
  getChoferPorZona,           // function(zona)
  getChoferPorCondicion,      // function(condicion)
}
```

### `useColectas()`
```javascript
{
  colectas,                   // Array de todas las colectas
  colectasFiltradas,          // Array filtrado
  loading,                    // boolean
  error,                      // string | null
  filtro,                     // { fecha, chofer_id, estado }
  setFiltro,                  // function
  cargarColectas,             // async function
  crearColecta,               // async function(datos)
  actualizarColecta,          // async function(id, datos)
  eliminarColecta,            // async function(id)
  marcarEntregado,            // async function(id)
  marcarRechazado,            // async function(id)
  getEstadisticas,            // function(fecha?)
  getColectasPorChofer,       // function(chofer_id, fecha?)
  getColectasPorFecha,        // function(fecha)
  getFechaHoy,                // function()
}
```

### Utilidades
```javascript
Formateo.telefono(tel)        // "11 4567-8900"
Formateo.dni(dni)              // "35.123.456"
Formateo.fecha(fecha)           // "03/04/2024"
Formateo.dinero(monto)          // "$5.000,00"

Zonas.clasificar(nombre)        // Devuelve la zona
Zonas.getTodasLasZonas()        // Array de zonas

Fecha.hoy()                     // "2024-04-03"
Fecha.manana()                  // "2024-04-04"
Fecha.esHoy(fecha)              // boolean

LocalStorage.set(key, value)
LocalStorage.get(key, default)

Seguridad.hashPassword(pass)    // Promise<hash>
```

---

## 🎨 TEMAS

El `App.jsx` ya incluye soporte para tema claro/oscuro:

```jsx
const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

const toggleTheme = () => {
  const newTheme = theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  localStorage.setItem('theme', newTheme);
  document.documentElement.setAttribute('data-theme', newTheme);
};
```

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Copia los archivos
2. ✅ Estructura las carpetas
3. ✅ Prueba en consola:
   ```javascript
   // En tu componente
   import { useChoferes } from '../hooks/useChoferes';
   const { choferes } = useChoferes();
   console.log(choferes); // Debe mostrar array
   ```

4. ✅ Crea componentes adicionales según necesites:
   - `PantallaRecorridos.jsx`
   - `PantallaChoferes.jsx`
   - `PantallaClientes.jsx`
   - `Modal.jsx`
   - `Toast.jsx`

---

## ❓ PREGUNTAS FRECUENTES

**P: ¿Los hooks se actualizan automáticamente?**  
R: Sí, tienen subscripciones en tiempo real a Supabase.

**P: ¿Cómo manejo errores?**  
R: Cada hook tiene un `error` que puedes chequear, o usa `try/catch` en async.

**P: ¿Puedo crear más hooks personalizados?**  
R: Sí, siguen el mismo patrón. Mira `useChoferes.js` como referencia.

**P: ¿Cómo acceso al estado global?**  
R: En `App.jsx` hay un `AppContext`. Usa `useContext(AppContext)`.

---

## 📞 SOPORTE

Si tienes dudas con un Hook específico:

1. Lee los comentarios en el archivo
2. Mira el ejemplo en esta guía
3. Revisa el tipo de datos (comment `@returns`)

---

**¡Listo! Ya tienes una app React moderna y escalable.** 🎉
