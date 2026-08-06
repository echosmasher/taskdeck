import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">TaskDeck</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
