const fs = require('fs');

const appJsx = fs.readFileSync('src/App.jsx', 'utf8');
const lines = appJsx.split(/\r?\n/);

const getLines = (start, end) => lines.slice(start - 1, end).join('\n');

const overlayYDashboard = getLines(510, 933);
const pantallaRecorridos = getLines(934, 1549);
const pantallaChoferes = getLines(1550, 1747);
const pantallaClientes = getLines(1748, 2243);
const celdaYSortable = getLines(2252, 2576);

const dashboardCode = `import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AppContext } from '../App';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';
import { X, Map, MapPin, MessageCircle } from 'lucide-react';

` + overlayYDashboard + `\n\nexport { PantallaDashboard };`;

const recorridosCode = `import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { AppContext } from '../App';
import { supabase } from '../supabase';
import { Grid3x3, CalendarDays, MapPin, Plus, Truck, Package, CheckCircle, TrendingUp, AlertCircle, GripVertical, Trash2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ModalAgregar } from './ModalAgregar';
import { ModalConfirmarEliminar } from './ModalConfirmarEliminar';

` + pantallaRecorridos + '\n\n' + celdaYSortable + `\n\nexport { PantallaRecorridos };`;

const choferesCode = `import { useState, useCallback, useMemo, useContext } from 'react';
import { AppContext } from '../App';
import { supabase } from '../supabase';
import { Plus, AlertCircle } from 'lucide-react';
import { TarjetaChofer } from './TarjetaChofer';
import { ModalAgregarChofer } from './ModalAgregarChofer';
import { ModalConfirmarEliminar } from './ModalConfirmarEliminar';

` + pantallaChoferes + `\n\nexport { PantallaChoferes };`;

const clientesCode = `import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AppContext } from '../App';
import { supabase } from '../supabase';
import { Plus, CalendarDays, MessageCircle, Trash2, Package } from 'lucide-react';
import { ModalAgregarCliente } from './ModalAgregarCliente';
import { ModalConfirmarEliminar } from './ModalConfirmarEliminar';

` + pantallaClientes + `\n\nexport { PantallaClientes };`;

fs.writeFileSync('src/components/PantallaDashboard.jsx', dashboardCode);
fs.writeFileSync('src/components/PantallaRecorridos.jsx', recorridosCode);
fs.writeFileSync('src/components/PantallaChoferes.jsx', choferesCode);
fs.writeFileSync('src/components/PantallaClientes.jsx', clientesCode);

let newAppLines = [];
let hasAddedImports = false;

for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  
  if (lineNum === 38) {
    newAppLines.push(lines[i]);
    newAppLines.push(`import { PantallaDashboard } from './components/PantallaDashboard';`);
    newAppLines.push(`import { PantallaRecorridos } from './components/PantallaRecorridos';`);
    newAppLines.push(`import { PantallaChoferes } from './components/PantallaChoferes';`);
    newAppLines.push(`import { PantallaClientes } from './components/PantallaClientes';`);
  } else if ((lineNum >= 510 && lineNum <= 2243) || (lineNum >= 2252 && lineNum <= 2576)) {
    // skipped
  } else {
    if (!lines[i].includes(`import { DashboardSabados } from './components/DashboardSabados';`)) {
      newAppLines.push(lines[i]);
    }
  }
}

fs.writeFileSync('src/App.jsx', newAppLines.join('\n'));
console.log('Completado');
