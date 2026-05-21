import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Mail, Lock, User, Sparkles, ChevronRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (isSignUp && !name.trim()) {
      toast.error("Veuillez renseigner votre nom complet.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(cleanEmail, password, name.trim());
        toast.success("Compte créé ! Bienvenue sur PouleCom.");
      } else {
        await signInWithEmail(cleanEmail, password);
        toast.success("Connexion établie avec succès.");
      }
    } catch (error: any) {
      console.error("Authentication Error:", error);
      let errMsg = "Une erreur est survenue lors de l'authentification.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        errMsg = "Identifiants de connexion incorrects.";
      } else if (error.code === 'auth/email-already-in-use') {
        errMsg = "Cet email est déjà utilisé par un autre utilisateur.";
      } else if (error.code === 'auth/weak-password') {
        errMsg = "Le mot de passe doit faire au moins 6 caractères.";
      } else if (error.code === 'auth/invalid-email') {
        errMsg = "Format d'adresse e-mail invalide.";
      }
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4 font-sans relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 md:p-12 border border-slate-800/50 relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 2 }}
            className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white font-black text-4xl mx-auto mb-6 shadow-[0_0_40px_rgba(37,99,235,0.3)] border-t border-white/20"
          >
            P
          </motion.div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">PouleCom</h1>
          <p className="text-slate-400 text-sm font-semibold tracking-wide uppercase">Système Fermier Intelligent</p>
        </div>

        <AnimatePresence mode="wait">
          {!isEmailMode ? (
            <motion.div
              key="sso-mode"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <Button 
                onClick={signInWithGoogle}
                className="w-full h-16 rounded-2xl bg-white hover:bg-slate-100 text-[#020617] font-black text-base flex items-center justify-center gap-4 transition-all active:scale-98 shadow-xl border border-white"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Se connecter avec Google
              </Button>

              <div className="flex items-center gap-4 py-2">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">OU</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              <Button 
                onClick={() => {
                  setIsEmailMode(true);
                  setIsSignUp(false);
                }}
                className="w-full h-16 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-white font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-98 border border-slate-700/50 uppercase tracking-widest"
              >
                <Mail className="w-4 h-4 text-blue-500" />
                Connexion par E-mail
              </Button>

              <p className="text-[11px] text-center text-slate-500 leading-relaxed max-w-[280px] mx-auto uppercase font-bold tracking-wider pt-4">
                Plateforme d'administration, employés & clients de PouleCom Comores.
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="email-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleEmailSubmit}
              className="space-y-5"
            >
              <button
                type="button"
                onClick={() => setIsEmailMode(false)}
                className="flex items-center gap-2 text-xs text-blue-400 font-extrabold hover:text-blue-300 transition-colors uppercase tracking-wider mb-2 self-start"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Retour
              </button>

              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                {isSignUp ? "Créer un Compte" : "Connexion E-mail"}
              </h3>

              {isSignUp && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nom Complet</Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      type="text"
                      placeholder="Ex: Ali Mohamed"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required={isSignUp}
                      className="h-12 bg-slate-800/40 border-slate-850 rounded-xl pl-11 text-white font-semibold focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-600 border-none bg-[#090d16]"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Adresse E-mail</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    type="email"
                    placeholder="votre_nom@exemple.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="h-12 bg-slate-800/40 border-slate-850 rounded-xl pl-11 text-white font-semibold focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-600 border-none bg-[#090d16]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Mot de passe</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="h-12 bg-slate-800/40 border-slate-850 rounded-xl pl-11 text-white font-semibold focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-600 border-none bg-[#090d16]"
                  />
                </div>
              </div>

              {!isSignUp && (
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl">
                  💡 <span className="text-blue-400 font-extrabold pb-1 block uppercase">Avis d'invitation :</span> Si le Super Admin a pré-configuré votre compte, utilisez la même adresse e-mail pour lier automatiquement vos accès.
                </p>
              )}

              <Button 
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-widest mt-2 shadow-lg shadow-blue-500/15"
              >
                {isSubmitting ? "Sychronisation..." : isSignUp ? "S'enregistrer" : "S'authentifier"}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setName('');
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-blue-400 transition-colors underline"
                >
                  {isSignUp 
                    ? "Vous possédez déjà un compte ? Se connecter" 
                    : "Créer un nouveau compte utilisateur / client"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
