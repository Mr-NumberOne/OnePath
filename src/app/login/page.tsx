"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/contexts/SettingsContext";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const { language } = useSettings();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    // @ts-ignore
    if (typeof window !== 'undefined' && window.desktopAPI?.startGoogleAuth) {
      try {
        // @ts-ignore
        const result = await window.desktopAPI.startGoogleAuth();
        const res = await signIn("desktop", { 
          redirect: false,
          accessToken: result.access_token,
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          image: result.user.image
        });

        if (res?.ok && !res.error) {
          router.push("/");
          router.refresh();
        } else {
          console.error("NextAuth signin failed", res?.error);
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Desktop auth failed:", e);
        setIsLoading(false);
      }
    } else {
      await signIn("google", { callbackUrl: "/" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative">
      <Link href="/" className="absolute top-8 left-8 rtl:left-auto rtl:right-8">
        <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {language === "ar" ? "العودة للرئيسية" : "Back to Home"}
        </Button>
      </Link>

      <div className="w-full max-w-md flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <img 
            src={language === "ar" ? "/ar_logo.png" : "/logo.png"} 
            alt="OnePath Logo" 
            className="h-16 w-auto object-contain drop-shadow-md" 
          />
        </div>

        <Card className="w-full shadow-lg border-2 border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {language === "ar" ? "تسجيل الدخول" : "Welcome Back"}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {language === "ar" 
                ? "سجل دخولك باستخدام حساب جوجل للوصول إلى مُنشئ خرائط الطريق" 
                : "Sign in with your Google account to access the Roadmap Builder"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pb-8">
            <Button 
              size="lg" 
              className="w-full text-base font-semibold h-12 shadow-sm transition-all hover:scale-[1.02]"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3 rtl:mr-0 rtl:ml-3 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    <path fill="none" d="M1 1h22v22H1z" />
                  </svg>
                  {language === "ar" ? "المتابعة باستخدام جوجل" : "Continue with Google"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
