import React, { useState } from 'react';
import { appClient } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { ShieldCheck, Phone, Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

const SF = '-apple-system, SF Pro Display, BlinkMacSystemFont, Segoe UI, sans-serif';
const SECRET_KEY = 'sdnexus2026';

export default function AdminLogin() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Guard: only show if ?key=sdnexus2026 is present in the URL
  const urlParams = new URLSearchParams(location.search);
  const keyParam = urlParams.get('key');
  if (keyParam !== SECRET_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-300 text-sm">404 — Página no encontrada</p>
      </div>
    );
  }

  const handleLogin = async () => {
    if (!fullName.trim() || !phone.trim() || !password.trim()) {
      toast.error('Completa todos los campos');
      return;
    }
    setLoading(true);

    try {
      const results = await appClient.entities.AdminCredential.filter({
        full_name: fullName.trim(),
        phone: phone.replace(/\s/g, ''),
      });

      const match = results.find(r => r.password_hash === password && r.is_active);

      if (!match) {
        toast.error('Credenciales incorrectas');
        setLoading(false);
        return;
      }

      // Store session in localStorage
      localStorage.setItem('sd_admin_session', JSON.stringify({
        id: match.id,
        full_name: match.full_name,
        role: match.role,
        expires: Date.now() + 8 * 60 * 60 * 1000 // 8 hours
      }));

      toast.success(`Bienvenido, ${match.full_name}`);
      navigate('/staff');
    } catch (err) {
      toast.error('Error al conectar con el servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-white flex items-center justify-center px-5"
      style={{ fontFamily: SF }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-3xl bg-[#4B0082] flex items-center justify-center mx-auto mb-4"
            style={{ boxShadow: '0 8px 32px rgba(75,0,130,0.25)' }}
          >
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Acceso Administrativo</h1>
          <p className="text-sm text-gray-400 mt-1.5">SD-NEXUS · Panel de Control</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Nombre completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ej. Dr. Juan Martínez"
                className="pl-9 rounded-2xl border-gray-200 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Teléfono</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ej. 5512345678"
                className="pl-9 rounded-2xl border-gray-200 text-sm"
                type="tel"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                className="pl-9 pr-10 rounded-2xl border-gray-200 text-sm"
              />
              <button
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading || !fullName.trim() || !phone.trim() || !password.trim()}
            className="w-full h-12 rounded-2xl text-sm font-medium mt-2"
            style={{ background: '#4B0082' }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" /> Ingresar al panel
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-[11px] text-gray-300 mt-8">
          Acceso restringido · SD-NEXUS v1.0
        </p>
      </motion.div>
    </div>
  );
}