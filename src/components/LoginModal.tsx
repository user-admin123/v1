import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  onLogin: (email: string, password: string) => Promise<boolean>;
  visible: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
}

const validateForm = (email: string, password: string): FormErrors => {
  const errors: FormErrors = {};
  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address";
  }
  if (!password.trim()) {
    errors.password = "Password is required";
  } else if (password.length < 4) {
    errors.password = "Password must be at least 4 characters";
  }
  return errors;
};

const LoginModal = ({ onLogin, visible }: Props) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEmail("");
      setPassword("");
      setErrors({});
      setTouched({});
    }
  };

  const handleBlur = (field: "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const newErrors = validateForm(email, password);
    setErrors((prev) => ({ ...prev, [field]: newErrors[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm(email, password);
    setErrors(formErrors);
    setTouched({ email: true, password: true });

    if (Object.keys(formErrors).length > 0) return;

    setSubmitting(true);
    try {
      const success = await onLogin(email, password);
      if (success) {
        handleOpenChange(false);
        toast({ title: "Welcome back!", description: "You're now logged in as owner." });
      } else {
        toast({ title: "Login failed", description: "Invalid email or password.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Login failed", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {visible && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full glass-card flex items-center justify-center text-muted-foreground hover:text-primary transition-colors animate-in fade-in duration-300"
          aria-label="Owner login"
        >
          <KeyRound className="w-4 h-4" />
        </button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="glass-card border-border/30 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Owner Login</DialogTitle>
            <DialogDescription>Sign in to manage your menu.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) {
                    const newErrors = validateForm(e.target.value, password);
                    setErrors((prev) => ({ ...prev, email: newErrors.email }));
                  }
                }}
                onBlur={() => handleBlur("email")}
                placeholder="admin@restaurant.com"
                className={`bg-muted/50 ${touched.email && errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                disabled={submitting}
              />
              {touched.email && errors.email && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) {
                    const newErrors = validateForm(email, e.target.value);
                    setErrors((prev) => ({ ...prev, password: newErrors.password }));
                  }
                }}
                onBlur={() => handleBlur("password")}
                placeholder="••••••"
                className={`bg-muted/50 ${touched.password && errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                disabled={submitting}
              />
              {touched.password && errors.password && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LoginModal;
