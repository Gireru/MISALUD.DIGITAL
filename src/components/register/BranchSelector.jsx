import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronRight, Search, Check, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const BRANCHES = [
  {
    id: 1,
    name: 'Monterrey Centro',
    address: 'Padre Mier Poniente #185, Col. Centro',
    lat: 25.6694, lng: -100.3098,
    services: ['Laboratorio', 'Papanicolaou', 'Ultrasonido', 'Rayos X', 'Electrocardiograma', 'Densitometría', 'Nutrición', 'Mastografía', 'Lentes'],
  },
  {
    id: 2,
    name: 'San Nicolás (Universidad)',
    address: 'Av. Universidad #602, Col. Chapultepec',
    lat: 25.7333, lng: -100.3089,
    services: ['Laboratorio', 'Papanicolaou', 'Ultrasonido', 'Rayos X', 'Resonancia Magnética', 'Tomografía', 'Electrocardiograma', 'Densitometría', 'Nutrición', 'Mastografía', 'Lentes'],
  },
  {
    id: 3,
    name: 'Apodaca (Plaza Citadina)',
    address: 'Av. Concordia #801, Col. Misión San José',
    lat: 25.7798, lng: -100.1878,
    services: ['Laboratorio', 'Papanicolaou', 'Ultrasonido', 'Rayos X', 'Resonancia Magnética', 'Tomografía', 'Electrocardiograma', 'Densitometría', 'Nutrición', 'Mastografía', 'Lentes'],
  },
  {
    id: 4,
    name: 'Apodaca (Huinalá)',
    address: 'Av. Julián Treviño Elizondo #100, Col. La Noria',
    lat: 25.7952, lng: -100.1612,
    services: ['Laboratorio', 'Papanicolaou', 'Ultrasonido', 'Rayos X', 'Resonancia Magnética', 'Tomografía', 'Electrocardiograma', 'Densitometría', 'Nutrición', 'Mastografía', 'Lentes'],
  },
  {
    id: 5,
    name: 'Guadalupe (Eloy Cavazos)',
    address: 'Av. Eloy Cavazos #5415, Col. Residencial Santa Fe',
    lat: 25.6745, lng: -100.2123,
    services: ['Laboratorio', 'Papanicolaou', 'Ultrasonido', 'Rayos X', 'Electrocardiograma', 'Densitometría', 'Nutrición', 'Mastografía', 'Lentes'],
  },
  {
    id: 6,
    name: 'Monterrey Lincoln',
    address: 'Av. Abraham Lincoln #3809, Col. Mitras Norte',
    lat: 25.7203, lng: -100.3712,
    services: ['Laboratorio', 'Papanicolaou', 'Ultrasonido', 'Rayos X', 'Electrocardiograma', 'Densitometría', 'Nutrición', 'Mastografía', 'Lentes'],
  },
  {
    id: 7,
    name: 'Monterrey Lázaro Cárdenas',
    address: 'Av. Lázaro Cárdenas #4429, Col. Las Brisas',
    lat: 25.6501, lng: -100.3456,
    services: ['Laboratorio', 'Papanicolaou', 'Ultrasonido (incluye 4D)', 'Electrocardiograma', 'Nutrición', 'Lentes'],
  },
  {
    id: 8,
    name: 'Monterrey San Bernabé',
    address: 'Av. Aztlán #8940, Col. San Bernabé',
    lat: 25.7589, lng: -100.4021,
    services: ['Laboratorio', 'Papanicolaou', 'Ultrasonido', 'Electrocardiograma', 'Nutrición', 'Lentes'],
  },
  {
    id: 9,
    name: 'Escobedo (Sendero)',
    address: 'Av. Sendero Divisorio #130, Col. Valle del Canadá',
    lat: 25.8012, lng: -100.3245,
    services: ['Laboratorio', 'Papanicolaou', 'Ultrasonido', 'Rayos X', 'Electrocardiograma', 'Densitometría', 'Nutrición', 'Mastografía', 'Lentes'],
  },
  {
    id: 10,
    name: 'Santa Catarina',
    address: 'Av. Manuel Ordóñez #620, Col. Centro',
    lat: 25.6731, lng: -100.4589,
    services: ['Laboratorio', 'Papanicolaou', 'Ultrasonido', 'Rayos X', 'Electrocardiograma', 'Densitometría', 'Mastografía', 'Lentes'],
  },
  {
    id: 11,
    name: 'Juárez',
    address: 'Carr. Libre Monterrey-Reynosa (Plaza Paseo Juárez)',
    lat: 25.6498, lng: -100.1134,
    services: ['Laboratorio', 'Papanicolaou', 'Ultrasonido', 'Rayos X', 'Electrocardiograma', 'Nutrición', 'Lentes'],
  },
];

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function BranchSelector({ onSelect, requiredServices = [] }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | done | error
  const [userCoords, setUserCoords] = useState(null);
  const [nearestId, setNearestId] = useState(null);

  // Auto-request geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) { setGeoStatus('error'); return; }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });

        // Find nearest branch that has all required services
        const eligibleBranches = requiredServices.length > 0
          ? BRANCHES.filter(b => requiredServices.every(svc => b.services.some(bs => bs === svc || bs.startsWith(svc.split(' ')[0]))))
          : BRANCHES;

        let minDist = Infinity;
        let nearest = null;
        (eligibleBranches.length > 0 ? eligibleBranches : BRANCHES).forEach(b => {
          const d = haversineKm(latitude, longitude, b.lat, b.lng);
          if (d < minDist) { minDist = d; nearest = b; }
        });
        if (nearest) { setNearestId(nearest.id); setSelected(nearest); }
        setGeoStatus('done');
      },
      () => setGeoStatus('error'),
      { timeout: 8000 }
    );
  }, []);

  // Filter branches that have all required services
  const compatibleBranches = requiredServices.length > 0
    ? BRANCHES.filter(b => requiredServices.every(svc => b.services.some(bs => bs === svc || bs.startsWith(svc.split(' ')[0]))))
    : BRANCHES;

  const branchesWithDist = compatibleBranches.map(b => ({
    ...b,
    distKm: userCoords ? haversineKm(userCoords.lat, userCoords.lng, b.lat, b.lng) : null,
  })).sort((a, b) => {
    if (a.distKm !== null && b.distKm !== null) return a.distKm - b.distKm;
    return 0;
  });

  const filtered = branchesWithDist.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-6 pt-14 pb-5"
        style={{ background: 'linear-gradient(160deg, #f0faf0 0%, #ffffff 100%)' }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7ED957, #3dba1e)' }}
          >
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1
              className="text-xl font-bold text-gray-900"
              style={{ fontFamily: '-apple-system, SF Pro Display, sans-serif' }}
            >
              ¿A qué sucursal vas?
            </h1>
            <p className="text-xs text-gray-400">
              {requiredServices.length > 0
                ? `Solo sucursales con tus ${requiredServices.length} estudio${requiredServices.length !== 1 ? 's' : ''}`
                : 'Selecciona para ver los servicios disponibles'}
            </p>
          </div>
        </div>

        {/* Geolocation status banner */}
        <AnimatePresence>
          {geoStatus === 'loading' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(126,217,87,0.08)', border: '1px solid rgba(126,217,87,0.2)' }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#7ED957' }} />
              <p className="text-xs font-medium" style={{ color: '#3dba1e' }}>Detectando tu ubicación…</p>
            </motion.div>
          )}
          {geoStatus === 'done' && nearestId && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(126,217,87,0.08)', border: '1px solid rgba(126,217,87,0.2)' }}
            >
              <Navigation className="w-3.5 h-3.5" style={{ color: '#7ED957' }} />
              <p className="text-xs font-medium" style={{ color: '#3dba1e' }}>
                Sucursal más cercana seleccionada automáticamente
              </p>
            </motion.div>
          )}
          {geoStatus === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)' }}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-xs font-medium text-amber-600">No se pudo obtener ubicación. Selecciona manualmente.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="px-6 pb-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o colonia…"
            className="pl-9 rounded-2xl border-gray-200 bg-gray-50"
          />
        </div>
      </motion.div>

      {/* Branch list */}
      <div className="flex-1 overflow-y-auto px-6 pb-36 space-y-2.5">
        <AnimatePresence>
          {filtered.map((branch, i) => {
            const isSelected = selected?.id === branch.id;
            const isNearest = branch.id === nearestId;

            return (
              <motion.button
                key={branch.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                onClick={() => setSelected(isSelected ? null : branch)}
                className="w-full text-left rounded-2xl border p-4 transition-all relative overflow-hidden"
                style={{
                  borderColor: isSelected ? 'rgba(126,217,87,0.5)' : 'rgba(0,0,0,0.08)',
                  background: isSelected ? 'rgba(126,217,87,0.05)' : 'white',
                  boxShadow: isSelected ? '0 4px 20px rgba(126,217,87,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                {/* Nearest badge */}
                {isNearest && (
                  <div
                    className="absolute top-3 left-4 flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(126,217,87,0.15)' }}
                  >
                    <Navigation className="w-2.5 h-2.5" style={{ color: '#3dba1e' }} />
                    <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#3dba1e' }}>
                      Más cercana
                    </span>
                  </div>
                )}

                {isSelected && (
                  <motion.div
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{ background: '#7ED957' }}
                  >
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </motion.div>
                )}

                <p
                  className={`font-semibold text-sm text-gray-900 mb-1 pr-8 ${isNearest ? 'mt-5' : ''}`}
                  style={{ fontFamily: '-apple-system, SF Pro Display, sans-serif' }}
                >
                  {branch.name}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[11px] text-gray-400">{branch.address}</p>
                  {branch.distKm !== null && (
                    <span className="text-[10px] font-semibold shrink-0" style={{ color: '#7ED957' }}>
                      {branch.distKm < 1
                        ? `${Math.round(branch.distKm * 1000)} m`
                        : `${branch.distKm.toFixed(1)} km`}
                    </span>
                  )}
                </div>

                {/* Services pills */}
                <div className="flex flex-wrap gap-1">
                  {branch.services.slice(0, isSelected ? 999 : 4).map(s => (
                    <span
                      key={s}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: isSelected ? 'rgba(126,217,87,0.12)' : 'rgba(0,0,0,0.05)',
                        color: isSelected ? '#3dba1e' : '#888',
                      }}
                    >
                      {s}
                    </span>
                  ))}
                  {!isSelected && branch.services.length > 4 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full text-gray-400" style={{ background: 'rgba(0,0,0,0.04)' }}>
                      +{branch.services.length - 4} más
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confirm CTA */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="fixed bottom-0 left-0 right-0 p-6 pb-8"
            style={{ background: 'linear-gradient(to top, white 70%, transparent)' }}
          >
            <button
              onClick={() => onSelect(selected)}
              className="w-full h-14 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #7ED957, #3dba1e)',
                boxShadow: '0 8px 30px rgba(126,217,87,0.45)',
              }}
            >
              Continuar con {selected.name.split('(')[0].trim()}
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}