import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Key, 
  Fingerprint, 
  ShieldCheck, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Smartphone, 
  AlertCircle, 
  LogOut, 
  Settings,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface AdminAuthGateProps {
  children: React.ReactNode;
  onCancel: () => void;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({ children, onCancel }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('molfet_admin_authenticated') === 'true';
  });
  const [passkeyInput, setPasskeyInput] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isChangingPasskey, setIsChangingPasskey] = useState(false);
  const [newPasskey, setNewPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);
  const [hasRegisteredPasskey, setHasRegisteredPasskey] = useState(false);
  const [isAuthenticatingPasskey, setIsAuthenticatingPasskey] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);

  // Default Passkey PIN
  const currentSavedPasskey = localStorage.getItem('molfet_admin_passkey') || 'molfet2026';

  // Check WebAuthn support and existing passkey credentials on mount
  useEffect(() => {
    const checkSupport = async () => {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        try {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsWebAuthnSupported(available);
        } catch {
          setIsWebAuthnSupported(true);
        }
      }
      const savedCred = localStorage.getItem('molfet_webauthn_passkey');
      if (savedCred) {
        setHasRegisteredPasskey(true);
      }
    };
    checkSupport();
  }, []);

  // Standard PIN/Code Login
  const handlePinLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passkeyInput.trim() === currentSavedPasskey) {
      sessionStorage.setItem('molfet_admin_authenticated', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('رمز الـ Passkey غير صحيح (Incorrect Passkey PIN)');
    }
  };

  // Biometric / Device WebAuthn Login
  const handleWebAuthnLogin = async () => {
    setError('');
    setIsAuthenticatingPasskey(true);
    try {
      if (!window.PublicKeyCredential) {
        throw new Error('Passkey WebAuthn is not supported in this browser.');
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'preferred',
          rpId: window.location.hostname || undefined,
        },
      });

      if (credential) {
        sessionStorage.setItem('molfet_admin_authenticated', 'true');
        setIsAuthenticated(true);
        setError('');
      } else {
        throw new Error('لم يتم التحقق من الـ Passkey');
      }
    } catch (err: any) {
      console.warn('WebAuthn Authentication notice:', err);
      if (err.name === 'NotAllowedError') {
        setError('تم إلغاء عملية الـ Passkey أو لم يتم التعرف على البصمة');
      } else {
        setError('تعذر المصادقة بالـ Passkey الحيوي، يرجى استخدام رمز الـ Passkey PIN');
      }
    } finally {
      setIsAuthenticatingPasskey(false);
    }
  };

  // Register New Device Passkey (WebAuthn / Biometrics)
  const handleRegisterDevicePasskey = async () => {
    setError('');
    setIsRegisteringPasskey(true);
    try {
      if (!window.PublicKeyCredential) {
        throw new Error('Passkey is not supported on this browser');
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'MOLFET FOR FASHON Admin',
            id: window.location.hostname || undefined,
          },
          user: {
            id: userId,
            name: 'admin@molfet.com',
            displayName: 'MOLFET Administrator',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'preferred',
            residentKey: 'preferred',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (credential) {
        localStorage.setItem('molfet_webauthn_passkey', credential.id);
        setHasRegisteredPasskey(true);
        setSuccessMsg('تم تسجيل الـ Passkey البيومتري لجهازك بنجاح!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      console.warn('Registration notice:', err);
      if (err.name === 'NotAllowedError') {
        setError('تم إلغاء تسجيل الـ Passkey من قبل المستخدم');
      } else {
        setError('تعذر تسجيل الـ Passkey على هذا الجهاز، يمكنك استخدام رمز الـ Passkey');
      }
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  // Update Passkey PIN
  const handleUpdatePasskey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasskey.trim()) {
      setError('يرجى إدخال رمز Passkey صالح');
      return;
    }
    if (newPasskey !== confirmPasskey) {
      setError('رمز الـ Passkey غير متطابق');
      return;
    }
    localStorage.setItem('molfet_admin_passkey', newPasskey.trim());
    setSuccessMsg('تم تحديث رمز الـ Passkey بنجاح');
    setIsChangingPasskey(false);
    setNewPasskey('');
    setConfirmPasskey('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('molfet_admin_authenticated');
    setIsAuthenticated(false);
    onCancel();
  };

  // If already authenticated, show top admin security banner and wrapped dashboard
  if (isAuthenticated) {
    return (
      <div className="relative">
        {/* Top Control Bar for Admin with Passkey Manager */}
        <div className="bg-zinc-950 text-white px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-semibold tracking-wider text-zinc-100">
              MOLFET FOR FASHON ADMIN • جلسة محمية بالـ Passkey
            </span>
            {successMsg && (
              <span className="text-emerald-400 text-xs flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {successMsg}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isWebAuthnSupported && (
              <button
                type="button"
                onClick={handleRegisterDevicePasskey}
                disabled={isRegisteringPasskey}
                className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
                title="تسجيل بصمة الوجه أو الأصبع للجهاز الحالي"
              >
                <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                <span>{hasRegisteredPasskey ? 'تحديث Passkey الجهاز' : 'تسجيل Passkey بيومتري'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsChangingPasskey(!isChangingPasskey)}
              className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
            >
              <Key className="w-3.5 h-3.5 text-zinc-400" />
              <span>{isChangingPasskey ? 'إلغاء' : 'تغيير Passkey PIN'}</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white border border-red-800 transition-colors flex items-center gap-1.5 cursor-pointer text-[11px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* Change Passkey Modal */}
        {isChangingPasskey && (
          <div className="bg-zinc-900 border-b border-zinc-800 p-4 text-white animate-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleUpdatePasskey} className="max-w-md mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold flex items-center gap-2 text-zinc-200">
                  <Key className="w-4 h-4 text-zinc-400" />
                  تعيين رمز Passkey جديد للوحة الإدارة
                </h4>
                <span className="text-[10px] text-zinc-400">Passkey PIN</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="password"
                  placeholder="رمز الـ Passkey الجديد"
                  value={newPasskey}
                  onChange={(e) => setNewPasskey(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white text-center"
                  required
                />
                <input
                  type="password"
                  placeholder="تأكيد رمز الـ Passkey"
                  value={confirmPasskey}
                  onChange={(e) => setConfirmPasskey(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white text-center"
                  required
                />
              </div>
              {error && <p className="text-[11px] text-red-400">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPasskey(false);
                    setError('');
                  }}
                  className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-white text-black text-xs font-semibold rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  حفظ الـ Passkey
                </button>
              </div>
            </form>
          </div>
        )}

        {children}
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-zinc-50">
      <div className="w-full max-w-md bg-white rounded-3xl border border-zinc-200 shadow-xl p-7 sm:p-9 text-center space-y-6">
        
        {/* Header Icon */}
        <div className="relative mx-auto w-16 h-16">
          <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center shadow-md">
            <Fingerprint className="w-8 h-8 stroke-[1.5] text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-zinc-900 text-white rounded-full flex items-center justify-center border-2 border-white shadow-xs">
            <Lock className="w-3 h-3" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-zinc-400 block">
            MOLFET SECURITY GATE
          </span>
          <h3 className="font-serif font-black text-2xl tracking-wider text-[var(--molfet-maroon)]">
            MOLFET FOR FASHON
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            لوحة الإدارة محمية بواسطة الـ Passkey والمصادقة الآمنة
          </p>
        </div>

        {/* Passkey Biometric Action (If supported / enabled) */}
        {isWebAuthnSupported && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleWebAuthnLogin}
              disabled={isAuthenticatingPasskey}
              className="w-full py-3 px-4 bg-zinc-900 hover:bg-black text-white font-medium text-xs rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-sm hover:shadow cursor-pointer"
            >
              {isAuthenticatingPasskey ? (
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
              ) : (
                <Fingerprint className="w-4 h-4 text-emerald-400" />
              )}
              <span>
                {isAuthenticatingPasskey
                  ? 'جاري التحقق من الـ Passkey...'
                  : 'فتح بـ Passkey الجهاز (Face ID / بصمة الأصبع)'}
              </span>
            </button>
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-200"></div>
              <span className="shrink-0 mx-3 text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                أو إدخال رمز الـ Passkey
              </span>
              <div className="flex-grow border-t border-zinc-200"></div>
            </div>
          </div>
        )}

        {/* Form for Passkey PIN */}
        <form onSubmit={handlePinLogin} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[11px] font-semibold text-zinc-700 block text-right">
              رمز الـ Passkey / PIN:
            </label>
            <div className="relative">
              <input
                type={showPasskey ? 'text' : 'password'}
                value={passkeyInput}
                onChange={(e) => {
                  setPasskeyInput(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••"
                autoFocus
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-2xl text-sm text-black placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all text-center tracking-widest font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPasskey(!showPasskey)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black p-1.5 transition-colors"
                title={showPasskey ? 'Hide passkey' : 'Show passkey'}
              >
                {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              className="w-full py-3 bg-black hover:bg-zinc-800 text-white font-semibold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <span>دخول لوحة الإدارة</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 text-zinc-500 hover:text-black text-xs font-medium transition-colors cursor-pointer"
            >
              العودة إلى متجر MOLFET FOR FASHON
            </button>
          </div>
        </form>

        {/* Footer Hint */}
        <div className="pt-4 border-t border-zinc-100 flex flex-col items-center justify-center gap-1.5 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            <span>Passkey PIN الافتراضي: <strong className="font-mono text-zinc-700">molfet2026</strong></span>
          </div>
          <span className="text-[10px] text-zinc-400">يمكنك تغييره أو تسجيل بصمة جهازك بمجرد الدخول</span>
        </div>

      </div>
    </div>
  );
};
